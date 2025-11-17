--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'customer'
);


--
-- Name: difficulty_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.difficulty_level AS ENUM (
    'mudah',
    'sedang',
    'sulit'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'order',
    'payment',
    'promo',
    'stock',
    'system'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'menunggu_pembayaran',
    'diproses',
    'dikirim',
    'selesai',
    'dibatalkan'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'expired'
);


--
-- Name: assign_tier_voucher(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_tier_voucher(_user_id uuid, _tier_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_template record;
  v_voucher_id uuid;
  v_voucher_code text;
  v_valid_until timestamp with time zone;
BEGIN
  -- Skip Bronze tier (no voucher)
  IF _tier_name = 'Bronze' THEN
    RETURN NULL;
  END IF;

  -- Check if user already has voucher for this tier
  IF EXISTS(SELECT 1 FROM public.user_tier_vouchers WHERE user_id = _user_id AND tier_name = _tier_name) THEN
    RETURN NULL;
  END IF;

  -- Get voucher template for tier
  SELECT * INTO v_template
  FROM public.tier_exclusive_vouchers
  WHERE tier_name = _tier_name;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Generate unique code
  v_voucher_code := public.generate_unique_voucher_code(v_template.voucher_code_prefix);
  
  -- Calculate valid_until
  v_valid_until := now() + (v_template.valid_days || ' days')::interval;

  -- Create voucher
  INSERT INTO public.vouchers (
    code,
    description,
    discount_type,
    discount_value,
    min_purchase,
    max_discount,
    valid_from,
    valid_until,
    usage_limit,
    user_usage_limit,
    is_active
  ) VALUES (
    v_voucher_code,
    v_template.description,
    v_template.discount_type,
    v_template.discount_value,
    v_template.min_purchase,
    v_template.max_discount,
    now(),
    v_valid_until,
    1, -- Only one use for exclusive voucher
    1,
    true
  ) RETURNING id INTO v_voucher_id;

  -- Record assignment
  INSERT INTO public.user_tier_vouchers (user_id, voucher_id, tier_name)
  VALUES (_user_id, v_voucher_id, _tier_name);

  RETURN v_voucher_id;
END;
$$;


--
-- Name: cleanup_expired_verification_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_verification_codes() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.email_verification_codes
  WHERE expires_at < now() OR (verified = true AND created_at < now() - interval '1 day');
END;
$$;


--
-- Name: decrease_stock_on_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrease_stock_on_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If variant_id exists, update variant stock
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.variant_id;
    
    -- Check if stock went negative (overselling prevention)
    IF (SELECT stock_quantity FROM public.product_variants WHERE id = NEW.variant_id) < 0 THEN
      RAISE EXCEPTION 'Stok variant tidak mencukupi. Tersedia: %, Diminta: %',
        (SELECT stock_quantity + NEW.quantity FROM public.product_variants WHERE id = NEW.variant_id),
        NEW.quantity;
    END IF;
  ELSE
    -- Update product stock if no variant
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Check if stock went negative (overselling prevention)
    IF (SELECT stock_quantity FROM public.products WHERE id = NEW.product_id) < 0 THEN
      RAISE EXCEPTION 'Stok produk tidak mencukupi. Tersedia: %, Diminta: %',
        (SELECT stock_quantity + NEW.quantity FROM public.products WHERE id = NEW.product_id),
        NEW.quantity;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  new_number text;
  order_count int;
begin
  -- Get count of orders today
  select count(*) into order_count
  from public.orders
  where date(created_at) = current_date;
  
  -- Generate order number: ZA-YYYYMMDD-XXXX
  new_number := 'ZA-' || to_char(current_date, 'YYYYMMDD') || '-' || 
                lpad((order_count + 1)::text, 4, '0');
  
  return new_number;
end;
$$;


--
-- Name: generate_unique_voucher_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_unique_voucher_code(prefix text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- Generate code with prefix + random 6 character alphanumeric
    v_code := prefix || '-' || upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.vouchers WHERE code = v_code) INTO v_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$;


--
-- Name: get_user_roles(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_roles(_user_id uuid) RETURNS TABLE(role public.app_role)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;


--
-- Name: initialize_member_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_member_progress() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.member_progress (user_id, current_tier, total_spending, order_count)
  SELECT 
    o.user_id,
    'Bronze',
    COALESCE(SUM(o.total_amount), 0) as total_spending,
    COUNT(*) as order_count
  FROM public.orders o
  WHERE o.status = 'selesai' 
    AND o.payment_status = 'paid'
  GROUP BY o.user_id
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;


--
-- Name: remove_user_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_user_role(_user_id uuid, _role public.app_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
END;
$$;


--
-- Name: restore_stock_on_cancel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_stock_on_cancel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only restore stock if order status changed to 'dibatalkan'
  IF NEW.status = 'dibatalkan' AND OLD.status != 'dibatalkan' THEN
    -- Restore stock for all items in this order with variants
    UPDATE public.product_variants pv
    SET stock_quantity = stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.variant_id = pv.id
      AND oi.variant_id IS NOT NULL;
    
    -- Restore stock for products without variants
    UPDATE public.products p
    SET stock_quantity = stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND oi.variant_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: set_user_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_user_role(_user_id uuid, _role public.app_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;


--
-- Name: update_member_tier(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_member_tier() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_spending numeric;
  v_order_count integer;
  v_new_tier text;
  v_old_tier text;
  v_voucher_id uuid;
BEGIN
  -- Calculate total spending from completed orders
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_total_spending, v_order_count
  FROM public.orders
  WHERE user_id = NEW.user_id 
    AND status = 'selesai'
    AND payment_status = 'paid';

  -- Determine new tier based on spending
  SELECT tier_name INTO v_new_tier
  FROM public.member_tier_config
  WHERE v_total_spending >= min_spending 
    AND (max_spending IS NULL OR v_total_spending <= max_spending)
  ORDER BY tier_level DESC
  LIMIT 1;

  -- Get old tier if exists
  SELECT current_tier INTO v_old_tier
  FROM public.member_progress
  WHERE user_id = NEW.user_id;

  -- Insert or update member progress
  INSERT INTO public.member_progress (
    user_id, 
    current_tier, 
    total_spending, 
    order_count,
    tier_upgraded_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    v_new_tier,
    v_total_spending,
    v_order_count,
    CASE WHEN v_old_tier IS NULL OR v_old_tier != v_new_tier THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    current_tier = v_new_tier,
    total_spending = v_total_spending,
    order_count = v_order_count,
    tier_upgraded_at = CASE 
      WHEN member_progress.current_tier != v_new_tier THEN now()
      ELSE member_progress.tier_upgraded_at
    END,
    updated_at = now();

  -- Auto-assign voucher if tier upgraded
  IF v_old_tier IS NOT NULL AND v_old_tier != v_new_tier THEN
    v_voucher_id := public.assign_tier_voucher(NEW.user_id, v_new_tier);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_product_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.products
  set 
    rating_average = (
      select avg(rating)::decimal(2,1)
      from public.reviews
      where product_id = NEW.product_id
      and is_visible = true
    ),
    review_count = (
      select count(*)
      from public.reviews
      where product_id = NEW.product_id
      and is_visible = true
    )
  where id = NEW.product_id;
  
  return NEW;
end;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: update_voucher_usage_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_voucher_usage_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.vouchers
  set usage_count = usage_count + 1
  where id = NEW.voucher_id;
  
  return NEW;
end;
$$;


SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    recipient_name text NOT NULL,
    phone text NOT NULL,
    address_line text NOT NULL,
    kelurahan text NOT NULL,
    kecamatan text NOT NULL,
    city text NOT NULL,
    province text NOT NULL,
    postal_code text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    variant_id uuid,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text,
    parent_id uuid,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false
);


--
-- Name: member_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_tier text DEFAULT 'Bronze'::text NOT NULL,
    total_spending numeric DEFAULT 0 NOT NULL,
    order_count integer DEFAULT 0 NOT NULL,
    tier_upgraded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: member_tier_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_tier_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tier_name text NOT NULL,
    tier_level integer NOT NULL,
    min_spending numeric NOT NULL,
    max_spending numeric,
    discount_percentage integer DEFAULT 0,
    free_shipping_threshold numeric,
    badge_color text NOT NULL,
    badge_icon text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    product_image_url text,
    product_slug text NOT NULL,
    price numeric(10,2) NOT NULL,
    discount_percentage integer,
    quantity integer NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    variant_id uuid,
    variant_name text,
    variant_sku text,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_number text NOT NULL,
    status public.order_status DEFAULT 'menunggu_pembayaran'::public.order_status NOT NULL,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    shipping_address_id uuid,
    recipient_name text NOT NULL,
    recipient_phone text NOT NULL,
    shipping_address text NOT NULL,
    shipping_method text NOT NULL,
    shipping_cost numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    payment_method text,
    payment_proof_url text,
    payment_deadline timestamp with time zone,
    paid_at timestamp with time zone,
    notes text,
    admin_notes text,
    shipped_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cancellation_requested boolean DEFAULT false,
    cancellation_request_reason text,
    cancellation_request_date timestamp with time zone
);

ALTER TABLE ONLY public.orders REPLICA IDENTITY FULL;


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_tags (
    product_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text,
    variant_name text NOT NULL,
    size text,
    color text,
    price_adjustment numeric DEFAULT 0,
    stock_quantity integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    discount_percentage integer,
    stock_quantity integer DEFAULT 0,
    min_order integer DEFAULT 1,
    max_order integer,
    size text,
    origin text,
    difficulty_level public.difficulty_level,
    water_type text,
    temperature_min numeric(4,1),
    temperature_max numeric(4,1),
    ph_min numeric(3,1),
    ph_max numeric(3,1),
    care_instructions text,
    is_active boolean DEFAULT true,
    view_count integer DEFAULT 0,
    rating_average numeric(2,1),
    review_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_discount_percentage_check CHECK (((discount_percentage >= 0) AND (discount_percentage <= 100))),
    CONSTRAINT products_rating_average_check CHECK (((rating_average >= (0)::numeric) AND (rating_average <= (5)::numeric)))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    avatar_url text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    rating integer NOT NULL,
    title text,
    comment text,
    images text[],
    is_verified_purchase boolean DEFAULT false,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tier_exclusive_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tier_exclusive_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tier_name text NOT NULL,
    voucher_code_prefix text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    min_purchase numeric DEFAULT 0,
    max_discount numeric,
    valid_days integer DEFAULT 30 NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tier_exclusive_vouchers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_tier_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tier_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    voucher_id uuid NOT NULL,
    tier_name text NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    is_notified boolean DEFAULT false
);


--
-- Name: voucher_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voucher_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    discount_amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_purchase numeric(10,2) DEFAULT 0,
    max_discount numeric(10,2),
    usage_limit integer,
    usage_count integer DEFAULT 0,
    user_usage_limit integer DEFAULT 1,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vouchers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);


--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: email_verification_codes email_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_codes
    ADD CONSTRAINT email_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: member_progress member_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_progress
    ADD CONSTRAINT member_progress_pkey PRIMARY KEY (id);


--
-- Name: member_progress member_progress_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_progress
    ADD CONSTRAINT member_progress_user_id_key UNIQUE (user_id);


--
-- Name: member_tier_config member_tier_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tier_config
    ADD CONSTRAINT member_tier_config_pkey PRIMARY KEY (id);


--
-- Name: member_tier_config member_tier_config_tier_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tier_config
    ADD CONSTRAINT member_tier_config_tier_level_key UNIQUE (tier_level);


--
-- Name: member_tier_config member_tier_config_tier_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tier_config
    ADD CONSTRAINT member_tier_config_tier_name_key UNIQUE (tier_name);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_tags product_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_pkey PRIMARY KEY (product_id, tag_id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_product_id_variant_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_variant_name_key UNIQUE (product_id, variant_name);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_product_id_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_user_id_order_id_key UNIQUE (product_id, user_id, order_id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);


--
-- Name: tier_exclusive_vouchers tier_exclusive_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier_exclusive_vouchers
    ADD CONSTRAINT tier_exclusive_vouchers_pkey PRIMARY KEY (id);


--
-- Name: tier_exclusive_vouchers tier_exclusive_vouchers_tier_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier_exclusive_vouchers
    ADD CONSTRAINT tier_exclusive_vouchers_tier_name_key UNIQUE (tier_name);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_tier_vouchers user_tier_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tier_vouchers
    ADD CONSTRAINT user_tier_vouchers_pkey PRIMARY KEY (id);


--
-- Name: user_tier_vouchers user_tier_vouchers_user_id_tier_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tier_vouchers
    ADD CONSTRAINT user_tier_vouchers_user_id_tier_name_key UNIQUE (user_id, tier_name);


--
-- Name: voucher_usage voucher_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usage
    ADD CONSTRAINT voucher_usage_pkey PRIMARY KEY (id);


--
-- Name: voucher_usage voucher_usage_voucher_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usage
    ADD CONSTRAINT voucher_usage_voucher_id_order_id_key UNIQUE (voucher_id, order_id);


--
-- Name: vouchers vouchers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_code_key UNIQUE (code);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: idx_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_user_id ON public.addresses USING btree (user_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_cart_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);


--
-- Name: idx_cart_items_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_variant_id ON public.cart_items USING btree (variant_id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_email_verification_codes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_codes_email ON public.email_verification_codes USING btree (email);


--
-- Name: idx_email_verification_codes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_codes_expires ON public.email_verification_codes USING btree (expires_at);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_order_items_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_variant_id ON public.order_items USING btree (variant_id);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);


--
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (id);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_slug ON public.tags USING btree (slug);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_vouchers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vouchers_code ON public.vouchers USING btree (code);


--
-- Name: idx_wishlist_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_product_id ON public.wishlist USING btree (product_id);


--
-- Name: idx_wishlist_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_user_id ON public.wishlist USING btree (user_id);


--
-- Name: order_items trigger_decrease_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_decrease_stock AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.decrease_stock_on_order();


--
-- Name: orders trigger_restore_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_restore_stock AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();


--
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_member_tier_on_order_complete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_member_tier_on_order_complete AFTER INSERT OR UPDATE OF status, payment_status ON public.orders FOR EACH ROW WHEN (((new.status = 'selesai'::public.order_status) AND (new.payment_status = 'paid'::public.payment_status))) EXECUTE FUNCTION public.update_member_tier();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_product_rating_on_review; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_rating_on_review AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: voucher_usage update_voucher_usage_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_voucher_usage_count_trigger AFTER INSERT ON public.voucher_usage FOR EACH ROW EXECUTE FUNCTION public.update_voucher_usage_count();


--
-- Name: vouchers update_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: member_progress member_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_progress
    ADD CONSTRAINT member_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: orders orders_shipping_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.addresses(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_tags product_tags_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_tags product_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_tier_vouchers user_tier_vouchers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tier_vouchers
    ADD CONSTRAINT user_tier_vouchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_tier_vouchers user_tier_vouchers_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tier_vouchers
    ADD CONSTRAINT user_tier_vouchers_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE CASCADE;


--
-- Name: voucher_usage voucher_usage_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usage
    ADD CONSTRAINT voucher_usage_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: voucher_usage voucher_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usage
    ADD CONSTRAINT voucher_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: voucher_usage voucher_usage_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usage
    ADD CONSTRAINT voucher_usage_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews Admins can manage all reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reviews" ON public.reviews USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_variants Admins can manage variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage variants" ON public.product_variants USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vouchers Admins can manage vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage vouchers" ON public.vouchers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins can update all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_items Admins can view all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins can view all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: member_progress Admins can view all progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all progress" ON public.member_progress FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_tier_vouchers Admins can view all tier vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all tier vouchers" ON public.user_tier_vouchers FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: voucher_usage Admins can view all voucher usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all voucher usage" ON public.voucher_usage FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_verification_codes Anyone can request verification code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can request verification code" ON public.email_verification_codes FOR INSERT WITH CHECK (true);


--
-- Name: member_tier_config Anyone can view tier config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tier config" ON public.member_tier_config FOR SELECT USING (true);


--
-- Name: tier_exclusive_vouchers Anyone can view tier voucher templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tier voucher templates" ON public.tier_exclusive_vouchers FOR SELECT USING (true);


--
-- Name: reviews Anyone can view visible reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view visible reviews" ON public.reviews FOR SELECT USING ((is_visible = true));


--
-- Name: categories Only admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage categories" ON public.categories USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_images Only admins can manage product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage product images" ON public.product_images USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_tags Only admins can manage product tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage product tags" ON public.product_tags USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Only admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage products" ON public.products USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tags Only admins can manage tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage tags" ON public.tags USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: member_tier_config Only admins can manage tier config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage tier config" ON public.member_tier_config USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tier_exclusive_vouchers Only admins can manage tier voucher templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage tier voucher templates" ON public.tier_exclusive_vouchers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Public can view active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: products Public can view active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: product_variants Public can view active variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active variants" ON public.product_variants FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: profiles Public can view basic profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view basic profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: product_images Public can view product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view product images" ON public.product_images FOR SELECT USING (true);


--
-- Name: product_tags Public can view product tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view product tags" ON public.product_tags FOR SELECT USING (true);


--
-- Name: tags Public can view tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view tags" ON public.tags FOR SELECT USING (true);


--
-- Name: email_verification_codes System can manage verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage verification codes" ON public.email_verification_codes USING (false);


--
-- Name: wishlist Users can add to own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add to own wishlist" ON public.wishlist FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: orders Users can create own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reviews Users can create reviews for purchased products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reviews for purchased products" ON public.reviews FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.product_id = reviews.product_id) AND (o.user_id = auth.uid()) AND (o.status = 'selesai'::public.order_status))))));


--
-- Name: addresses Users can delete own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own addresses" ON public.addresses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can delete own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own cart items" ON public.cart_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can delete own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING ((auth.uid() = id));


--
-- Name: reviews Users can delete own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: addresses Users can insert own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own addresses" ON public.addresses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cart_items Users can insert own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own cart items" ON public.cart_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlist Users can remove from own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove from own wishlist" ON public.wishlist FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: orders Users can request cancellation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can request cancellation" ON public.orders FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (status = ANY (ARRAY['menunggu_pembayaran'::public.order_status, 'diproses'::public.order_status])) AND (cancellation_requested = false))) WITH CHECK (((auth.uid() = user_id) AND (cancellation_requested = true)));


--
-- Name: addresses Users can update own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own addresses" ON public.addresses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can update own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own cart items" ON public.cart_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: orders Users can update own pending orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pending orders" ON public.orders FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'menunggu_pembayaran'::public.order_status)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: vouchers Users can view active vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active vouchers" ON public.vouchers FOR SELECT USING (((is_active = true) AND ((now() >= valid_from) AND (now() <= valid_until))));


--
-- Name: addresses Users can view own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own addresses" ON public.addresses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can view own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own cart items" ON public.cart_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: order_items Users can view own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: member_progress Users can view own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own progress" ON public.member_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_tier_vouchers Users can view own tier vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tier vouchers" ON public.user_tier_vouchers FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: voucher_usage Users can view own voucher usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own voucher usage" ON public.voucher_usage FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wishlist Users can view own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own wishlist" ON public.wishlist FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: email_verification_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: member_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: member_tier_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_tier_config ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: product_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: tier_exclusive_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tier_exclusive_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_tier_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_tier_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: voucher_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


