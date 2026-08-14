import { getSupabaseClient } from '../lib/supabase.js';

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  description,
  price,
  sale_price,
  is_new,
  is_featured,
  created_at,
  updated_at,
  category:categories(id, name, slug),
  images:product_images(id, image_url, alt_text, sort_order, is_primary),
  variants:product_variants(id, size, color, sku, price_override, stock_quantity, sort_order)
`;

function amountToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function adaptProduct(row) {
  const images = [...(row.images || [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  const currentPriceCents = amountToCents(row.sale_price ?? row.price);
  const variants = [...(row.variants || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((variant) => ({
      id: variant.id,
      label: variant.color ? `${variant.color} / ${variant.size}` : variant.size,
      color: variant.color,
      size: variant.size,
      priceCents: variant.price_override == null
        ? currentPriceCents
        : amountToCents(variant.price_override),
      stock: Number.isInteger(variant.stock_quantity) && variant.stock_quantity > 0
        ? variant.stock_quantity
        : 0,
      sku: variant.sku,
    }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    category: row.category?.name || 'Kategorisiz',
    categorySlug: row.category?.slug || null,
    priceCents: currentPriceCents,
    compareAtCents: row.sale_price == null ? null : amountToCents(row.price),
    imageUrl: images[0]?.image_url || '',
    images: images.map((image) => image.image_url),
    gallery: images.map((image) => image.image_url),
    variants,
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    status: 'active',
    featured: row.is_featured,
    isNew: row.is_new,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function throwCatalogError(context, error) {
  throw new Error(`${context}: ${error.message}`);
}

export async function getCatalogProducts() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throwCatalogError('Katalog yüklenemedi', error);
  return (data || []).map(adaptProduct);
}

export async function getCatalogProductBySlug(slug) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throwCatalogError('Ürün yüklenemedi', error);
  return data ? adaptProduct(data) : null;
}

export async function getCatalogCategories() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throwCatalogError('Kategoriler yüklenemedi', error);
  return data || [];
}

export async function getStoreConfig() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('store_settings')
    .select(`
      store_name,
      shipping_fee,
      free_shipping_threshold,
      whatsapp_number,
      instagram_url,
      trendyol_url,
      contact_email,
      contact_phone
    `)
    .eq('singleton_key', true)
    .maybeSingle();

  if (error) throwCatalogError('Mağaza ayarları yüklenemedi', error);
  if (!data) throw new Error('Mağaza ayarları bulunamadı.');

  return {
    storeName: data.store_name,
    shippingFeeCents: amountToCents(data.shipping_fee),
    freeShippingThresholdCents: amountToCents(data.free_shipping_threshold),
    whatsappNumber: data.whatsapp_number,
    instagramUrl: data.instagram_url,
    trendyolUrl: data.trendyol_url,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
  };
}
