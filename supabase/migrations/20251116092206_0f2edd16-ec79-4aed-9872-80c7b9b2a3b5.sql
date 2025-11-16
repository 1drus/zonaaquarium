-- ============================================
-- FASE 3: CHECKOUT & PAYMENT SYSTEM
-- ============================================

-- 1. CREATE CART TABLE
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, product_id)
);

alter table public.cart_items enable row level security;

-- RLS Policies for cart_items
create policy "Users can view own cart items"
  on public.cart_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own cart items"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cart items"
  on public.cart_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own cart items"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- 2. CREATE ORDERS TABLE
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  order_number text unique not null,
  status order_status not null default 'menunggu_pembayaran',
  payment_status payment_status not null default 'pending',
  
  -- Address Info (snapshot at order time)
  shipping_address_id uuid references public.addresses(id),
  recipient_name text not null,
  recipient_phone text not null,
  shipping_address text not null,
  
  -- Shipping Info
  shipping_method text not null,
  shipping_cost decimal(10,2) not null default 0,
  
  -- Price Info
  subtotal decimal(10,2) not null,
  discount_amount decimal(10,2) default 0,
  total_amount decimal(10,2) not null,
  
  -- Payment Info
  payment_method text,
  payment_proof_url text,
  payment_deadline timestamp with time zone,
  paid_at timestamp with time zone,
  
  -- Additional Info
  notes text,
  admin_notes text,
  
  -- Tracking
  shipped_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.orders enable row level security;

-- RLS Policies for orders
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can create own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pending orders"
  on public.orders for update
  using (auth.uid() = user_id and status = 'menunggu_pembayaran');

create policy "Admins can view all orders"
  on public.orders for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update all orders"
  on public.orders for update
  using (public.has_role(auth.uid(), 'admin'));

-- 3. CREATE ORDER ITEMS TABLE
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) not null,
  
  -- Product snapshot at order time
  product_name text not null,
  product_image_url text,
  product_slug text not null,
  
  -- Price info
  price decimal(10,2) not null,
  discount_percentage int,
  quantity int not null check (quantity > 0),
  subtotal decimal(10,2) not null,
  
  created_at timestamp with time zone not null default now()
);

alter table public.order_items enable row level security;

-- RLS Policies for order_items
create policy "Users can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Admins can view all order items"
  on public.order_items for select
  using (public.has_role(auth.uid(), 'admin'));

-- 4. CREATE VOUCHERS TABLE
create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  
  -- Discount info
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value decimal(10,2) not null,
  min_purchase decimal(10,2) default 0,
  max_discount decimal(10,2),
  
  -- Usage limits
  usage_limit int,
  usage_count int default 0,
  user_usage_limit int default 1,
  
  -- Validity
  valid_from timestamp with time zone not null default now(),
  valid_until timestamp with time zone not null,
  is_active boolean default true,
  
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.vouchers enable row level security;

-- RLS Policies for vouchers
create policy "Users can view active vouchers"
  on public.vouchers for select
  using (is_active = true and now() between valid_from and valid_until);

create policy "Admins can manage vouchers"
  on public.vouchers for all
  using (public.has_role(auth.uid(), 'admin'));

-- 5. CREATE VOUCHER USAGE TABLE
create table public.voucher_usage (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid references public.vouchers(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete cascade not null,
  discount_amount decimal(10,2) not null,
  created_at timestamp with time zone not null default now(),
  unique (voucher_id, order_id)
);

alter table public.voucher_usage enable row level security;

-- RLS Policies for voucher_usage
create policy "Users can view own voucher usage"
  on public.voucher_usage for select
  using (auth.uid() = user_id);

create policy "Admins can view all voucher usage"
  on public.voucher_usage for select
  using (public.has_role(auth.uid(), 'admin'));

-- 6. CREATE REVIEWS TABLE
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete set null,
  
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  comment text,
  images text[],
  
  is_verified_purchase boolean default false,
  is_visible boolean default true,
  
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  unique (product_id, user_id, order_id)
);

alter table public.reviews enable row level security;

-- RLS Policies for reviews
create policy "Anyone can view visible reviews"
  on public.reviews for select
  using (is_visible = true);

create policy "Users can create reviews for purchased products"
  on public.reviews for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
      and o.user_id = auth.uid()
      and o.status = 'selesai'
    )
  );

create policy "Users can update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

create policy "Admins can manage all reviews"
  on public.reviews for all
  using (public.has_role(auth.uid(), 'admin'));

-- 7. CREATE INDEXES
create index idx_cart_items_user_id on public.cart_items(user_id);
create index idx_cart_items_product_id on public.cart_items(product_id);
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_order_number on public.orders(order_number);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_product_id on public.order_items(product_id);
create index idx_vouchers_code on public.vouchers(code);
create index idx_reviews_product_id on public.reviews(product_id);
create index idx_reviews_user_id on public.reviews(user_id);

-- 8. CREATE TRIGGERS
create trigger update_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.update_updated_at_column();

create trigger update_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

create trigger update_vouchers_updated_at
  before update on public.vouchers
  for each row execute function public.update_updated_at_column();

create trigger update_reviews_updated_at
  before update on public.reviews
  for each row execute function public.update_updated_at_column();

-- 9. CREATE FUNCTION TO GENERATE ORDER NUMBER
create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
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

-- 10. CREATE FUNCTION TO UPDATE PRODUCT RATING
create or replace function public.update_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Trigger to update product rating when review is added/updated
create trigger update_product_rating_on_review
  after insert or update on public.reviews
  for each row execute function public.update_product_rating();

-- 11. CREATE FUNCTION TO UPDATE VOUCHER USAGE COUNT
create or replace function public.update_voucher_usage_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vouchers
  set usage_count = usage_count + 1
  where id = NEW.voucher_id;
  
  return NEW;
end;
$$;

create trigger update_voucher_usage_count_trigger
  after insert on public.voucher_usage
  for each row execute function public.update_voucher_usage_count();