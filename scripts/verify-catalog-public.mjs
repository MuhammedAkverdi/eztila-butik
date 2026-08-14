import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error('SUPABASE_URL ve SUPABASE_PUBLISHABLE_KEY tanımlanmalıdır.');
}

const client = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function exactCount(table, filters = (query) => query) {
  const query = filters(client.from(table).select('*', { count: 'exact', head: true }));
  const { count, error } = await query;
  if (error) throw new Error(`${table} public SELECT başarısız: ${error.message}`);
  return count || 0;
}

const categories = await exactCount('categories');
const products = await exactCount('products');
const images = await exactCount('product_images');
const variants = await exactCount('product_variants');
const storeSettings = await exactCount('store_settings');
const inactiveProductsVisible = await exactCount('products', (query) => query.eq('is_active', false));

if (categories !== 11 || products !== 41 || images !== 283 || variants !== 321 || storeSettings !== 1) {
  throw new Error('Public katalog sayıları beklenen import sonucu ile eşleşmiyor.');
}
if (inactiveProductsVisible !== 0) throw new Error('Pasif ürün public olarak okunabiliyor.');

const { data: catalog, error: catalogError } = await client
  .from('products')
  .select(`
    id, name, slug, price, sale_price,
    category:categories(id, name, slug),
    images:product_images(id, image_url, sort_order, is_primary),
    variants:product_variants(id, size, color, stock_quantity, sort_order)
  `)
  .eq('is_active', true);
if (catalogError) throw new Error(`Frontend katalog sorgusu başarısız: ${catalogError.message}`);
if (catalog.length !== 41) throw new Error('Frontend katalog sorgusu 41 ürün döndürmedi.');

const detailedProduct = catalog.find((product) =>
  product.category && product.images?.length > 1 && product.variants?.length > 1
);
if (!detailedProduct) throw new Error('İlişkisel ürün örneği bulunamadı.');

const { data: productBySlug, error: productBySlugError } = await client
  .from('products')
  .select(`
    id, name, slug, price, sale_price,
    category:categories(id, name, slug),
    images:product_images(id, image_url, sort_order, is_primary),
    variants:product_variants(id, size, color, stock_quantity, sort_order)
  `)
  .eq('is_active', true)
  .eq('slug', detailedProduct.slug)
  .maybeSingle();
if (productBySlugError) throw new Error(`Slug ürün sorgusu başarısız: ${productBySlugError.message}`);
if (!productBySlug?.images?.some((image) => image.is_primary)) {
  throw new Error('Slug ürün sorgusunda primary görsel bulunamadı.');
}
if (!productBySlug.variants?.every((variant) => Number.isInteger(variant.stock_quantity))) {
  throw new Error('Slug ürün sorgusunda varyant stokları geçersiz.');
}

const searchTerm = 'elbise';
const searchMatches = catalog.filter((product) =>
  `${product.name} ${product.category?.name || ''}`.toLocaleLowerCase('tr-TR').includes(searchTerm)
);
if (searchMatches.length === 0) throw new Error('Katalog arama smoke testi sonuç üretmedi.');

const categoryMatches = catalog.filter((product) =>
  product.category?.slug === detailedProduct.category.slug
);
if (categoryMatches.length === 0) throw new Error('Kategori smoke testi sonuç üretmedi.');

const sortedPrices = catalog
  .map((product) => Number(product.sale_price ?? product.price))
  .sort((left, right) => left - right);
if (sortedPrices.some((price, index) => index > 0 && price < sortedPrices[index - 1])) {
  throw new Error('Fiyat sıralama smoke testi başarısız.');
}

const { data: storeConfig, error: storeConfigError } = await client
  .from('store_settings')
  .select('store_name, shipping_fee, free_shipping_threshold, whatsapp_number, instagram_url, trendyol_url')
  .eq('singleton_key', true)
  .maybeSingle();
if (storeConfigError) throw new Error(`Store config sorgusu başarısız: ${storeConfigError.message}`);
if (!storeConfig?.store_name) throw new Error('Store config smoke testi boş sonuç döndürdü.');

const sample = detailedProduct;

const blockedWriteChecks = await Promise.all([
  client.from('products').insert({
    name: sample.name,
    slug: sample.slug,
    price: sample.price,
    is_active: true,
  }),
  client.from('products').update({ name: sample.name }).eq('id', '00000000-0000-0000-0000-000000000000'),
  client.from('products').delete().eq('id', '00000000-0000-0000-0000-000000000000'),
]);

const [insertAttempt, updateAttempt, deleteAttempt] = blockedWriteChecks;
if (!insertAttempt.error || insertAttempt.error.code !== '42501') throw new Error('Anon INSERT yetki seviyesinde engellenmedi.');
if (!updateAttempt.error || updateAttempt.error.code !== '42501') throw new Error('Anon UPDATE yetki seviyesinde engellenmedi.');
if (!deleteAttempt.error || deleteAttempt.error.code !== '42501') throw new Error('Anon DELETE yetki seviyesinde engellenmedi.');

console.log(JSON.stringify({
  categories,
  products,
  images,
  variants,
  storeSettings,
  inactiveProductsVisible,
  anonInsertBlocked: true,
  anonUpdateBlocked: true,
  anonDeleteBlocked: true,
  frontendCatalogProducts: catalog.length,
  searchMatches: searchMatches.length,
  categoryMatches: categoryMatches.length,
  productDetailSlug: productBySlug.slug,
  productDetailImages: productBySlug.images.length,
  productDetailVariants: productBySlug.variants.length,
  storeConfigLoaded: true,
}, null, 2));
