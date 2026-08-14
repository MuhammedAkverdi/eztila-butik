begin;

create or replace function public.set_eztila_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_eztila_updated_at() from public, anon, authenticated;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_slug_not_blank check (btrim(slug) <> ''),
  constraint categories_sort_order_nonnegative check (sort_order >= 0)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12, 2) not null,
  sale_price numeric(12, 2),
  is_active boolean not null default false,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_slug_not_blank check (btrim(slug) <> ''),
  constraint products_price_nonnegative check (price >= 0),
  constraint products_sale_price_nonnegative check (sale_price is null or sale_price >= 0),
  constraint products_sale_price_not_above_price check (sale_price is null or sale_price <= price)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_url_not_blank check (btrim(image_url) <> ''),
  constraint product_images_sort_order_nonnegative check (sort_order >= 0)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text,
  sku text,
  price_override numeric(12, 2),
  stock_quantity integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_size_not_blank check (btrim(size) <> ''),
  constraint product_variants_color_not_blank check (color is null or btrim(color) <> ''),
  constraint product_variants_sku_not_blank check (sku is null or btrim(sku) <> ''),
  constraint product_variants_price_override_nonnegative check (price_override is null or price_override >= 0),
  constraint product_variants_stock_nonnegative check (stock_quantity >= 0),
  constraint product_variants_sort_order_nonnegative check (sort_order >= 0)
);

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true,
  store_name text not null,
  shipping_fee numeric(12, 2) not null default 0,
  free_shipping_threshold numeric(12, 2) not null default 0,
  whatsapp_number text,
  instagram_url text,
  trendyol_url text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_settings_singleton unique (singleton_key),
  constraint store_settings_singleton_key_true check (singleton_key),
  constraint store_settings_name_not_blank check (btrim(store_name) <> ''),
  constraint store_settings_shipping_fee_nonnegative check (shipping_fee >= 0),
  constraint store_settings_free_shipping_threshold_nonnegative check (free_shipping_threshold >= 0),
  constraint store_settings_whatsapp_not_blank check (whatsapp_number is null or btrim(whatsapp_number) <> ''),
  constraint store_settings_instagram_not_blank check (instagram_url is null or btrim(instagram_url) <> ''),
  constraint store_settings_trendyol_not_blank check (trendyol_url is null or btrim(trendyol_url) <> ''),
  constraint store_settings_contact_email_not_blank check (contact_email is null or btrim(contact_email) <> ''),
  constraint store_settings_contact_phone_not_blank check (contact_phone is null or btrim(contact_phone) <> '')
);

create index if not exists categories_active_sort_idx
  on public.categories (sort_order, name)
  where is_active;

create index if not exists products_category_active_idx
  on public.products (category_id, is_active, created_at desc);

create index if not exists products_active_created_idx
  on public.products (created_at desc)
  where is_active;

create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order, id);

create unique index if not exists product_images_product_url_idx
  on public.product_images (product_id, image_url);

create unique index if not exists product_images_one_primary_idx
  on public.product_images (product_id)
  where is_primary;

create index if not exists product_variants_product_active_sort_idx
  on public.product_variants (product_id, is_active, sort_order);

create unique index if not exists product_variants_product_size_color_idx
  on public.product_variants (
    product_id,
    lower(btrim(size)),
    lower(btrim(coalesce(color, '')))
  );

create unique index if not exists product_variants_sku_idx
  on public.product_variants (lower(btrim(sku)))
  where sku is not null;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_eztila_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_eztila_updated_at();

drop trigger if exists product_images_set_updated_at on public.product_images;
create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function public.set_eztila_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_eztila_updated_at();

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_eztila_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.store_settings enable row level security;

revoke all privileges on table public.categories from anon, authenticated;
revoke all privileges on table public.products from anon, authenticated;
revoke all privileges on table public.product_images from anon, authenticated;
revoke all privileges on table public.product_variants from anon, authenticated;
revoke all privileges on table public.store_settings from anon, authenticated;

grant select on table public.categories to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.product_images to anon, authenticated;
grant select on table public.product_variants to anon, authenticated;
grant select on table public.store_settings to anon, authenticated;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
on public.categories
for select
to anon, authenticated
using (is_active);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (
  is_active
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      where categories.id = products.category_id
        and categories.is_active
    )
  )
);

drop policy if exists "Public can read images of active products" on public.product_images;
create policy "Public can read images of active products"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.is_active
  )
);

drop policy if exists "Public can read active variants of active products" on public.product_variants;
create policy "Public can read active variants of active products"
on public.product_variants
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.products
    where products.id = product_variants.product_id
      and products.is_active
  )
);

drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings"
on public.store_settings
for select
to anon, authenticated
using (singleton_key);

comment on table public.store_settings is
  'Public storefront settings only. Secrets, service-role keys, and payment credentials must never be stored here.';

commit;
