-- Create exclusive tier voucher system

-- Table to store tier-exclusive voucher templates
CREATE TABLE IF NOT EXISTS public.tier_exclusive_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL,
  voucher_code_prefix text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  min_purchase numeric DEFAULT 0,
  max_discount numeric,
  valid_days integer NOT NULL DEFAULT 30,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(tier_name)
);

-- Insert tier exclusive voucher templates
INSERT INTO public.tier_exclusive_vouchers (tier_name, voucher_code_prefix, discount_type, discount_value, min_purchase, max_discount, valid_days, description) VALUES
('Silver', 'SILVER-WELCOME', 'percentage', 10, 500000, 100000, 30, 'Selamat! Voucher eksklusif Silver Member dengan diskon 10%'),
('Gold', 'GOLD-EXCLUSIVE', 'percentage', 15, 1000000, 200000, 60, 'Voucher eksklusif Gold Member dengan diskon 15%'),
('Platinum', 'PLATINUM-VIP', 'percentage', 20, 1500000, 500000, 90, 'Voucher VIP Platinum Member dengan diskon 20%');

-- Table to track user assigned vouchers
CREATE TABLE IF NOT EXISTS public.user_tier_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  tier_name text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  is_notified boolean DEFAULT false,
  UNIQUE(user_id, tier_name)
);

-- Enable RLS
ALTER TABLE public.tier_exclusive_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tier_vouchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tier_exclusive_vouchers
CREATE POLICY "Anyone can view tier voucher templates"
  ON public.tier_exclusive_vouchers
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage tier voucher templates"
  ON public.tier_exclusive_vouchers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_tier_vouchers
CREATE POLICY "Users can view own tier vouchers"
  ON public.user_tier_vouchers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tier vouchers"
  ON public.user_tier_vouchers
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate unique voucher code
CREATE OR REPLACE FUNCTION public.generate_unique_voucher_code(prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to assign tier exclusive voucher to user
CREATE OR REPLACE FUNCTION public.assign_tier_voucher(_user_id uuid, _tier_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update member tier function to auto-assign voucher
CREATE OR REPLACE FUNCTION public.update_member_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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