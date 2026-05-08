create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null check (role in ('student', 'seller')),
  wallet_address text default '',
  avatar_url text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null,
  store_description text default '',
  store_category text default 'Other',
  wallet_address text default '',
  verification_status text default 'new',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  name text not null,
  description text default '',
  price_sol numeric not null,
  category text not null default 'Other',
  image_url text default '',
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  title text not null,
  description text default '',
  amount numeric not null,
  category text not null,
  receiver text not null,
  creator text,
  buyer_wallet text,
  seller_id uuid references public.sellers(id),
  product_id uuid references public.products(id),
  status text not null default 'unpaid',
  transaction_signature text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz,
  paid_by text,
  payer_name text default '',
  payer_id text default '',
  notes text default '',
  tx_error text,
  payment_method text default 'solana' check (payment_method in ('solana', 'qris', 'cash_on_pickup', 'bank_transfer')),
  payment_proof_url text,
  fiat_amount numeric,
  fiat_currency text default 'IDR',
  payment_note text
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null references public.invoices(id) on delete cascade,
  product_id uuid not null references public.products(id),
  seller_id uuid not null references public.sellers(id),
  buyer_user_id uuid references public.profiles(id),
  buyer_wallet text default '',
  quantity integer not null default 1,
  total_amount numeric not null,
  status text not null default 'pending',
  pickup_code text,
  pickup_status text default 'waiting_pickup',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  payment_method text default 'solana' check (payment_method in ('solana', 'qris', 'cash_on_pickup', 'bank_transfer')),
  payment_proof_url text,
  fiat_amount numeric,
  fiat_currency text default 'IDR',
  payment_note text
);

alter table public.profiles
  add column if not exists avatar_url text default '';

alter table public.sellers
  add column if not exists verification_status text default 'new',
  add column if not exists verified_at timestamptz;

alter table public.orders
  add column if not exists buyer_wallet text default '',
  add column if not exists pickup_code text,
  add column if not exists pickup_status text default 'waiting_pickup',
  add column if not exists payment_method text default 'solana',
  add column if not exists payment_proof_url text,
  add column if not exists fiat_amount numeric,
  add column if not exists fiat_currency text default 'IDR',
  add column if not exists payment_note text;

alter table public.invoices
  add column if not exists payment_method text default 'solana',
  add column if not exists payment_proof_url text,
  add column if not exists fiat_amount numeric,
  add column if not exists fiat_currency text default 'IDR',
  add column if not exists payment_note text;

alter table public.invoices
  drop constraint if exists invoices_payment_method_check,
  add constraint invoices_payment_method_check
    check (payment_method in ('solana', 'qris', 'cash_on_pickup', 'bank_transfer')),
  drop constraint if exists invoices_status_check,
  add constraint invoices_status_check
    check (status in ('unpaid', 'pending', 'paid', 'payment_review', 'paid_demo', 'cash_pending', 'cancelled', 'failed', 'expired', 'confirmed'));

alter table public.orders
  drop constraint if exists orders_payment_method_check,
  add constraint orders_payment_method_check
    check (payment_method in ('solana', 'qris', 'cash_on_pickup', 'bank_transfer')),
  drop constraint if exists orders_status_check,
  add constraint orders_status_check
    check (status in ('pending', 'unpaid', 'paid', 'payment_review', 'paid_demo', 'cash_pending', 'cancelled'));

alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Sellers are readable" on public.sellers;
drop policy if exists "Users can manage own seller profile" on public.sellers;
drop policy if exists "Products are readable" on public.products;
drop policy if exists "Sellers can manage own products" on public.products;
drop policy if exists "Invoices are readable" on public.invoices;
drop policy if exists "Invoices are insertable" on public.invoices;
drop policy if exists "Invoices are updateable" on public.invoices;
drop policy if exists "Orders are readable" on public.orders;
drop policy if exists "Orders are insertable" on public.orders;
drop policy if exists "Orders are updateable" on public.orders;

create policy "Profiles are readable" on public.profiles for select using (true);
create policy "Users can insert own profile" on public.profiles for insert with check (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Sellers are readable" on public.sellers for select using (true);
create policy "Users can manage own seller profile" on public.sellers for all using (auth.uid() = user_id) with check (true);

create policy "Products are readable" on public.products for select using (true);
create policy "Sellers can manage own products" on public.products for all
  using (seller_id in (select id from public.sellers where user_id = auth.uid()))
  with check (seller_id in (select id from public.sellers where user_id = auth.uid()));

create policy "Invoices are readable" on public.invoices for select using (true);
create policy "Invoices are insertable" on public.invoices for insert with check (true);
create policy "Invoices are updateable" on public.invoices for update using (true) with check (true);

create policy "Orders are readable" on public.orders for select using (true);
create policy "Orders are insertable" on public.orders for insert with check (auth.uid() = buyer_user_id);
create policy "Orders are updateable" on public.orders for update
  using (
    auth.uid() = buyer_user_id
    or seller_id in (select id from public.sellers where user_id = auth.uid())
  )
  with check (
    auth.uid() = buyer_user_id
    or seller_id in (select id from public.sellers where user_id = auth.uid())
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product images are readable" on storage.objects;
drop policy if exists "Sellers can upload own product images" on storage.objects;
drop policy if exists "Sellers can update own product images" on storage.objects;
drop policy if exists "Sellers can delete own product images" on storage.objects;
drop policy if exists "Payment proofs are readable" on storage.objects;
drop policy if exists "Payment proofs are uploadable" on storage.objects;
drop policy if exists "Profile avatars are readable" on storage.objects;
drop policy if exists "Users can upload own profile avatars" on storage.objects;
drop policy if exists "Users can update own profile avatars" on storage.objects;
drop policy if exists "Users can delete own profile avatars" on storage.objects;

create policy "Product images are readable" on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Sellers can upload own product images" on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.sellers where user_id = auth.uid()
    )
  );

create policy "Sellers can update own product images" on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.sellers where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.sellers where user_id = auth.uid()
    )
  );

create policy "Sellers can delete own product images" on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.sellers where user_id = auth.uid()
    )
  );

create policy "Payment proofs are readable" on storage.objects for select
  using (bucket_id = 'payment-proofs');

create policy "Payment proofs are uploadable" on storage.objects for insert
  with check (bucket_id = 'payment-proofs');

create policy "Profile avatars are readable" on storage.objects for select
  using (bucket_id = 'profile-avatars');

create policy "Users can upload own profile avatars" on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own profile avatars" on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own profile avatars" on storage.objects for delete
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
