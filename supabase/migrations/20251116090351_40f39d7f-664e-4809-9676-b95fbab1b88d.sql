-- ============================================
-- FASE 1: DATABASE SCHEMA & AUTHENTICATION
-- ============================================

-- 1. CREATE ENUMS
create type public.app_role as enum ('admin', 'customer');
create type public.difficulty_level as enum ('mudah', 'sedang', 'sulit');
create type public.order_status as enum ('menunggu_pembayaran', 'diproses', 'dikirim', 'selesai', 'dibatalkan');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'expired');
create type public.notification_type as enum ('order', 'payment', 'promo', 'stock', 'system');

-- 2. CREATE PROFILES TABLE
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Public can view basic profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- 3. CREATE USER ROLES TABLE (SEPARATE FOR SECURITY)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policies for user_roles
create policy "Users can view own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Only admins can manage roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- 4. CREATE ADDRESSES TABLE
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  kelurahan text not null,
  kecamatan text not null,
  city text not null,
  province text not null,
  postal_code text not null,
  is_default boolean default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.addresses enable row level security;

-- RLS Policies for addresses
create policy "Users can view own addresses"
  on public.addresses for select
  using (auth.uid() = user_id);

create policy "Users can insert own addresses"
  on public.addresses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own addresses"
  on public.addresses for update
  using (auth.uid() = user_id);

create policy "Users can delete own addresses"
  on public.addresses for delete
  using (auth.uid() = user_id);

-- 5. CREATE CATEGORIES TABLE
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  parent_id uuid references public.categories(id) on delete set null,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.categories enable row level security;

-- RLS Policies for categories
create policy "Public can view active categories"
  on public.categories for select
  using (is_active = true or public.has_role(auth.uid(), 'admin'));

create policy "Only admins can manage categories"
  on public.categories for all
  using (public.has_role(auth.uid(), 'admin'));

-- 6. CREATE TAGS TABLE
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamp with time zone not null default now()
);

alter table public.tags enable row level security;

-- RLS Policies for tags
create policy "Public can view tags"
  on public.tags for select
  using (true);

create policy "Only admins can manage tags"
  on public.tags for all
  using (public.has_role(auth.uid(), 'admin'));

-- 7. CREATE PRODUCTS TABLE
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  price decimal(10,2) not null,
  discount_percentage int check (discount_percentage >= 0 and discount_percentage <= 100),
  stock_quantity int default 0,
  min_order int default 1,
  max_order int,
  size text,
  origin text,
  difficulty_level difficulty_level,
  water_type text,
  temperature_min decimal(4,1),
  temperature_max decimal(4,1),
  ph_min decimal(3,1),
  ph_max decimal(3,1),
  care_instructions text,
  is_active boolean default true,
  view_count int default 0,
  rating_average decimal(2,1) check (rating_average >= 0 and rating_average <= 5),
  review_count int default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.products enable row level security;

-- RLS Policies for products
create policy "Public can view active products"
  on public.products for select
  using (is_active = true or public.has_role(auth.uid(), 'admin'));

create policy "Only admins can manage products"
  on public.products for all
  using (public.has_role(auth.uid(), 'admin'));

-- 8. CREATE PRODUCT IMAGES TABLE
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  image_url text not null,
  display_order int default 0,
  is_primary boolean default false,
  created_at timestamp with time zone not null default now()
);

alter table public.product_images enable row level security;

-- RLS Policies for product_images
create policy "Public can view product images"
  on public.product_images for select
  using (true);

create policy "Only admins can manage product images"
  on public.product_images for all
  using (public.has_role(auth.uid(), 'admin'));

-- 9. CREATE PRODUCT TAGS TABLE (many-to-many)
create table public.product_tags (
  product_id uuid references public.products(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

alter table public.product_tags enable row level security;

-- RLS Policies for product_tags
create policy "Public can view product tags"
  on public.product_tags for select
  using (true);

create policy "Only admins can manage product tags"
  on public.product_tags for all
  using (public.has_role(auth.uid(), 'admin'));

-- 10. CREATE INDEXES FOR PERFORMANCE
create index idx_profiles_user_id on public.profiles(id);
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_addresses_user_id on public.addresses(user_id);
create index idx_categories_slug on public.categories(slug);
create index idx_categories_parent_id on public.categories(parent_id);
create index idx_tags_slug on public.tags(slug);
create index idx_products_slug on public.products(slug);
create index idx_products_category_id on public.products(category_id);
create index idx_products_is_active on public.products(is_active);
create index idx_product_images_product_id on public.product_images(product_id);

-- 11. CREATE TRIGGER FOR AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 12. CREATE TRIGGER FOR UPDATED_AT TIMESTAMPS
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_addresses_updated_at
  before update on public.addresses
  for each row execute function public.update_updated_at_column();

create trigger update_categories_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at_column();

create trigger update_products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

-- 13. CREATE STORAGE BUCKETS
insert into storage.buckets (id, name, public) 
values ('profile-images', 'profile-images', true);

insert into storage.buckets (id, name, public) 
values ('product-images', 'product-images', true);

-- 14. CREATE STORAGE POLICIES

-- Profile images policies
create policy "Public can view profile images"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create policy "Authenticated users can upload own profile image"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own profile image"
  on storage.objects for update
  using (
    bucket_id = 'profile-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own profile image"
  on storage.objects for delete
  using (
    bucket_id = 'profile-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Product images policies
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Only admins can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images' 
    and public.has_role(auth.uid(), 'admin')
  );

create policy "Only admins can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images' 
    and public.has_role(auth.uid(), 'admin')
  );

create policy "Only admins can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images' 
    and public.has_role(auth.uid(), 'admin')
  );