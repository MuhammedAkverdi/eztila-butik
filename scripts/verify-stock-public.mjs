import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import {
  getColorOptions,
  getDirectPurchaseVariant,
  getSaleableVariants,
  getSizeOptions,
  isProductSoldOut,
} from '../src/lib/catalog-stock.js';
import {
  addVariantToCart,
  hydrateCartItems,
  reconcileCartItems,
} from '../src/lib/cart-catalog.js';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !publishableKey) {
  throw new Error('SUPABASE_URL ve SUPABASE_PUBLISHABLE_KEY tanımlanmalıdır.');
}

const client = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client
  .from('products')
  .select(`
    id, slug,
    variants:product_variants(id, color, size, sku, stock_quantity, sort_order)
  `)
  .eq('is_active', true);
if (error) throw new Error(`Public stok kataloğu okunamadı: ${error.message}`);

const products = (data || []).map((product) => ({
  ...product,
  variants: (product.variants || []).map((variant) => ({
    id: variant.id,
    color: variant.color,
    size: variant.size,
    label: variant.color ? `${variant.color} / ${variant.size}` : variant.size,
    sku: variant.sku,
    stock: variant.stock_quantity,
    priceCents: 10000,
  })),
}));
const variants = products.flatMap((product) => product.variants);
const stockCounts = variants.reduce((counts, variant) => {
  counts[variant.stock] = (counts[variant.stock] || 0) + 1;
  return counts;
}, {});

assert.equal(products.length, 41);
assert.equal(variants.length, 321);
assert.equal(stockCounts[0], 316);
assert.equal(stockCounts[1], 1);
assert.equal(stockCounts[2], 3);
assert.equal(stockCounts[3], 1);

const zeroStockProduct = products.find((product) => product.variants.some((variant) => variant.stock === 0));
const stockOneProduct = products.find((product) => product.variants.some((variant) => variant.stock === 1));
const stockTwoOrThreeProduct = products.find((product) => product.variants.some((variant) => [2, 3].includes(variant.stock)));
const soldOutProduct = products.find(isProductSoldOut);
const multiDimensionProduct = products.find((product) => (
  getColorOptions(product).length > 1
  && new Set(product.variants.map((variant) => variant.size)).size > 1
  && getSaleableVariants(product).length > 1
));

assert.ok(zeroStockProduct);
assert.ok(stockOneProduct);
assert.ok(stockTwoOrThreeProduct);
assert.ok(soldOutProduct);
assert.ok(multiDimensionProduct);
assert.equal(getDirectPurchaseVariant(multiDimensionProduct), null);

const availableColor = getColorOptions(multiDimensionProduct).find((option) => option.isAvailable);
assert.ok(availableColor);
const sizeOptions = getSizeOptions(multiDimensionProduct, availableColor.value);
assert.ok(sizeOptions.some((option) => option.isAvailable));
assert.ok(sizeOptions.every((option) => (
  multiDimensionProduct.variants.some((variant) => variant.id === option.variant.id)
)));

const zeroVariant = zeroStockProduct.variants.find((variant) => variant.stock === 0);
assert.match(addVariantToCart([], zeroStockProduct, zeroVariant, 1).error, /stokta/);

const lowStockVariant = stockTwoOrThreeProduct.variants.find((variant) => [2, 3].includes(variant.stock));
const reconciled = reconcileCartItems([{
  productId: stockTwoOrThreeProduct.id,
  variantLabel: lowStockVariant.label,
  quantity: lowStockVariant.stock + 5,
}], products);
assert.equal(reconciled.items[0].quantity, lowStockVariant.stock);
assert.equal(hydrateCartItems(reconciled.items, products)[0].isQuantityValid, true);

const { error: anonUpdateError } = await client
  .from('product_variants')
  .update({ stock_quantity: 0 })
  .eq('id', '00000000-0000-0000-0000-000000000000');
assert.equal(anonUpdateError?.code, '42501');

console.log(JSON.stringify({
  products: products.length,
  variants: variants.length,
  stockCounts,
  zeroStockBlocked: true,
  lowStockPreserved: [1, 2, 3].every((stock) => stockCounts[stock] > 0),
  multiDimensionProduct: multiDimensionProduct.slug,
  soldOutProduct: soldOutProduct.slug,
  legacyQuantityReconciledTo: lowStockVariant.stock,
  anonVariantUpdateBlocked: true,
}, null, 2));
