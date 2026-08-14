import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { MOCK_PRODUCTS, STORE_CONFIG } from '../src/lib/mock-data.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SQL_MODE = process.argv.includes('--sql');
const UNVERIFIED_STOCK_VALUE = 10;

function normalizeSlug(value) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function centsToAmount(cents) {
  return Number((Number(cents) / 100).toFixed(2));
}

function normalizeKey(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function parseVariantLabel(label) {
  const parts = String(label).split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) throw new Error(`Renk/beden ayrıştırılamadı: ${label}`);
  return { color: parts[0], size: parts.slice(1).join(' / ') };
}

function safeStockQuantity(stock) {
  const quantity = Number.isInteger(stock) && stock >= 0 ? stock : 0;
  return quantity === UNVERIFIED_STOCK_VALUE ? 0 : quantity;
}

function uniqueProductImages(product) {
  const urls = [product.imageUrl, ...(product.gallery || []), ...(product.images || [])]
    .filter((url) => typeof url === 'string' && url.trim());
  return [...new Set(urls)];
}

function assertUnique(rows, keyOf, label) {
  const seen = new Set();
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) throw new Error(`${label} benzersiz değil: ${key}`);
    seen.add(key);
  }
}

function buildImportPlan() {
  const categoryNames = [...new Set(MOCK_PRODUCTS.map((product) => product.category))];
  const categories = categoryNames.map((name, sortOrder) => ({
    id: randomUUID(),
    name,
    slug: normalizeSlug(name),
    description: null,
    is_active: true,
    sort_order: sortOrder,
  }));

  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const products = MOCK_PRODUCTS.map((product) => {
    const hasDiscount = Number.isInteger(product.compareAtCents)
      && product.compareAtCents > product.priceCents;
    return {
      id: product.id,
      category_slug: categoryByName.get(product.category).slug,
      name: product.name,
      slug: product.slug,
      description: product.description || null,
      price: centsToAmount(hasDiscount ? product.compareAtCents : product.priceCents),
      sale_price: hasDiscount ? centsToAmount(product.priceCents) : null,
      is_active: product.status === 'active',
      is_new: false,
      is_featured: Boolean(product.featured),
      created_at: product.createdAt,
    };
  });

  const images = MOCK_PRODUCTS.flatMap((product) =>
    uniqueProductImages(product).map((imageUrl, sortOrder) => ({
      id: randomUUID(),
      product_slug: product.slug,
      image_url: imageUrl,
      alt_text: product.name,
      sort_order: sortOrder,
      is_primary: sortOrder === 0,
    }))
  );

  const variants = MOCK_PRODUCTS.flatMap((product) =>
    (product.variants || []).map((variant, sortOrder) => {
      const { color, size } = parseVariantLabel(variant.label);
      return {
        id: randomUUID(),
        product_slug: product.slug,
        size,
        color,
        sku: variant.sku || null,
        price_override: variant.priceCents !== product.priceCents
          ? centsToAmount(variant.priceCents)
          : null,
        stock_quantity: safeStockQuantity(variant.stock),
        sort_order: sortOrder,
        is_active: product.status === 'active',
      };
    })
  );

  const storeSettings = {
    id: randomUUID(),
    singleton_key: true,
    store_name: 'Eztila Butik',
    shipping_fee: centsToAmount(STORE_CONFIG.shippingFeeCents),
    free_shipping_threshold: centsToAmount(STORE_CONFIG.freeShippingThresholdCents),
    whatsapp_number: '905078195264',
    instagram_url: 'https://www.instagram.com/eztilabutik/',
    trendyol_url: 'https://www.trendyol.com/magaza/eztila-m-977827',
    contact_email: 'eztilabutik@gmail.com',
    contact_phone: '+905078195264',
  };

  assertUnique(categories, (row) => row.slug, 'Kategori slug');
  assertUnique(products, (row) => row.slug, 'Ürün slug');
  assertUnique(images, (row) => `${row.product_slug}|${row.image_url}`, 'Ürün görseli');
  assertUnique(
    variants,
    (row) => `${row.product_slug}|${normalizeKey(row.color)}|${normalizeKey(row.size)}`,
    'Ürün varyantı'
  );

  return { categories, products, images, variants, storeSettings };
}

function asJsonb(rows) {
  const json = JSON.stringify(rows);
  if (json.includes('$eztila_catalog$')) {
    throw new Error('Katalog verisi SQL JSON ayıracını içeriyor.');
  }
  return `$eztila_catalog$${json}$eztila_catalog$::jsonb`;
}

function buildImportSql(plan) {
  return `begin;

with source as (
  select * from jsonb_to_recordset(${asJsonb(plan.categories)}) as row(
    id uuid, name text, slug text, description text, is_active boolean, sort_order integer
  )
)
insert into public.categories (id, name, slug, description, is_active, sort_order)
select id, name, slug, description, is_active, sort_order from source
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

with source as (
  select * from jsonb_to_recordset(${asJsonb(plan.products)}) as row(
    id uuid, category_slug text, name text, slug text, description text,
    price numeric, sale_price numeric, is_active boolean, is_new boolean,
    is_featured boolean, created_at timestamptz
  )
)
insert into public.products (
  id, category_id, name, slug, description, price, sale_price,
  is_active, is_new, is_featured, created_at
)
select
  source.id, categories.id, source.name, source.slug, source.description,
  source.price, source.sale_price, source.is_active, source.is_new,
  source.is_featured, source.created_at
from source
join public.categories on categories.slug = source.category_slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  sale_price = excluded.sale_price,
  is_active = excluded.is_active,
  is_new = excluded.is_new,
  is_featured = excluded.is_featured;

with source as (
  select * from jsonb_to_recordset(${asJsonb(plan.images)}) as row(
    id uuid, product_slug text, image_url text, alt_text text,
    sort_order integer, is_primary boolean
  )
)
insert into public.product_images (
  id, product_id, image_url, alt_text, sort_order, is_primary
)
select
  source.id, products.id, source.image_url, source.alt_text,
  source.sort_order, source.is_primary
from source
join public.products on products.slug = source.product_slug
on conflict (product_id, image_url) do update set
  alt_text = excluded.alt_text,
  sort_order = excluded.sort_order,
  is_primary = excluded.is_primary;

with source as (
  select * from jsonb_to_recordset(${asJsonb(plan.variants)}) as row(
    id uuid, product_slug text, size text, color text, sku text,
    price_override numeric, stock_quantity integer, sort_order integer,
    is_active boolean
  )
)
insert into public.product_variants (
  id, product_id, size, color, sku, price_override,
  stock_quantity, sort_order, is_active
)
select
  source.id, products.id, source.size, source.color, source.sku,
  source.price_override, source.stock_quantity, source.sort_order,
  source.is_active
from source
join public.products on products.slug = source.product_slug
on conflict (
  product_id,
  lower(btrim(size)),
  lower(btrim(coalesce(color, '')))
) do update set
  sku = excluded.sku,
  price_override = excluded.price_override,
  stock_quantity = excluded.stock_quantity,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

with source as (
  select * from jsonb_to_record(${asJsonb(plan.storeSettings)}) as row(
    id uuid, singleton_key boolean, store_name text, shipping_fee numeric,
    free_shipping_threshold numeric, whatsapp_number text,
    instagram_url text, trendyol_url text, contact_email text,
    contact_phone text
  )
)
insert into public.store_settings (
  id, singleton_key, store_name, shipping_fee, free_shipping_threshold,
  whatsapp_number, instagram_url, trendyol_url, contact_email, contact_phone
)
select
  id, singleton_key, store_name, shipping_fee, free_shipping_threshold,
  whatsapp_number, instagram_url, trendyol_url, contact_email, contact_phone
from source
on conflict (singleton_key) do update set
  store_name = excluded.store_name,
  shipping_fee = excluded.shipping_fee,
  free_shipping_threshold = excluded.free_shipping_threshold,
  whatsapp_number = excluded.whatsapp_number,
  instagram_url = excluded.instagram_url,
  trendyol_url = excluded.trendyol_url,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone;

commit;`;
}

async function requireData(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
}

async function importCatalog(plan) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY yalnız server-side import ortamında tanımlanmalıdır.');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existingCategories = await requireData(
    admin.from('categories').select('id, slug').in('slug', plan.categories.map((row) => row.slug)),
    'Mevcut kategoriler okunamadı'
  );
  const existingCategoryBySlug = new Map(existingCategories.map((row) => [row.slug, row]));
  const categoryRows = plan.categories.map((row) => ({
    ...row,
    id: existingCategoryBySlug.get(row.slug)?.id || row.id,
  }));
  const savedCategories = await requireData(
    admin.from('categories').upsert(categoryRows, { onConflict: 'slug' }).select('id, slug'),
    'Kategoriler aktarılamadı'
  );
  const categoryIdBySlug = new Map(savedCategories.map((row) => [row.slug, row.id]));

  const existingProducts = await requireData(
    admin.from('products').select('id, slug').in('slug', plan.products.map((row) => row.slug)),
    'Mevcut ürünler okunamadı'
  );
  const existingProductBySlug = new Map(existingProducts.map((row) => [row.slug, row]));
  const productRows = plan.products.map(({ category_slug: categorySlug, ...row }) => ({
    ...row,
    id: existingProductBySlug.get(row.slug)?.id || row.id,
    category_id: categoryIdBySlug.get(categorySlug),
  }));
  const savedProducts = await requireData(
    admin.from('products').upsert(productRows, { onConflict: 'slug' }).select('id, slug'),
    'Ürünler aktarılamadı'
  );
  const productIdBySlug = new Map(savedProducts.map((row) => [row.slug, row.id]));
  const productIds = [...productIdBySlug.values()];

  const existingImages = await requireData(
    admin.from('product_images').select('id, product_id, image_url').in('product_id', productIds),
    'Mevcut görseller okunamadı'
  );
  const existingImageByKey = new Map(
    existingImages.map((row) => [`${row.product_id}|${row.image_url}`, row])
  );
  const imageRows = plan.images.map(({ product_slug: productSlug, ...row }) => {
    const productId = productIdBySlug.get(productSlug);
    const existing = existingImageByKey.get(`${productId}|${row.image_url}`);
    return { ...row, id: existing?.id || row.id, product_id: productId };
  });
  await requireData(
    admin.from('product_images').upsert(imageRows, { onConflict: 'product_id,image_url' }).select('id'),
    'Ürün görselleri aktarılamadı'
  );

  const existingVariants = await requireData(
    admin.from('product_variants').select('id, product_id, size, color').in('product_id', productIds),
    'Mevcut varyantlar okunamadı'
  );
  const existingVariantByKey = new Map(existingVariants.map((row) => [
    `${row.product_id}|${normalizeKey(row.color)}|${normalizeKey(row.size)}`,
    row,
  ]));
  const variantRows = plan.variants.map(({ product_slug: productSlug, ...row }) => {
    const productId = productIdBySlug.get(productSlug);
    const key = `${productId}|${normalizeKey(row.color)}|${normalizeKey(row.size)}`;
    return { ...row, id: existingVariantByKey.get(key)?.id || row.id, product_id: productId };
  });
  await requireData(
    admin.from('product_variants').upsert(variantRows, { onConflict: 'id' }).select('id'),
    'Ürün varyantları aktarılamadı'
  );

  const existingSettings = await requireData(
    admin.from('store_settings').select('id').eq('singleton_key', true).maybeSingle(),
    'Mağaza ayarları okunamadı'
  );
  await requireData(
    admin.from('store_settings').upsert({
      ...plan.storeSettings,
      id: existingSettings.id || plan.storeSettings.id,
    }, { onConflict: 'singleton_key' }).select('id'),
    'Mağaza ayarları aktarılamadı'
  );

  const [categories, products, images, variants, settings] = await Promise.all([
    requireData(admin.from('categories').select('id').in('slug', plan.categories.map((row) => row.slug)), 'Kategori doğrulaması başarısız'),
    requireData(admin.from('products').select('id').in('id', productIds), 'Ürün doğrulaması başarısız'),
    requireData(admin.from('product_images').select('id').in('product_id', productIds), 'Görsel doğrulaması başarısız'),
    requireData(admin.from('product_variants').select('id').in('product_id', productIds), 'Varyant doğrulaması başarısız'),
    requireData(admin.from('store_settings').select('id').eq('singleton_key', true), 'Mağaza ayarı doğrulaması başarısız'),
  ]);

  return {
    categories: categories.length,
    products: products.length,
    images: images.length,
    variants: variants.length,
    storeSettings: settings.length === 1,
  };
}

const plan = buildImportPlan();
const summary = {
  categories: plan.categories.length,
  products: plan.products.length,
  images: plan.images.length,
  variants: plan.variants.length,
  storeSettings: 1,
  stockSetToZeroBecauseUnverified: MOCK_PRODUCTS.flatMap((product) => product.variants || [])
    .filter((variant) => variant.stock === UNVERIFIED_STOCK_VALUE).length,
};

if (SQL_MODE) {
  process.stdout.write(buildImportSql(plan));
} else if (DRY_RUN) {
  console.log(JSON.stringify({ mode: 'dry-run', ...summary }, null, 2));
} else {
  const result = await importCatalog(plan);
  console.log(JSON.stringify({ mode: 'remote-import', ...result }, null, 2));
}
