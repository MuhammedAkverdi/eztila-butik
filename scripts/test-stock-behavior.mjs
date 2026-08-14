import assert from 'node:assert/strict';
import {
  findVariant,
  getColorOptions,
  getDirectPurchaseVariant,
  getSizeOptions,
  isProductSoldOut,
} from '../src/lib/catalog-stock.js';
import {
  addVariantToCart,
  hasBlockingCartStockIssue,
  hydrateCartItems,
  reconcileCartItems,
  setCartItemQuantity,
} from '../src/lib/cart-catalog.js';

const multiVariantProduct = {
  id: 'product-1',
  variants: [
    { id: 'black-s', label: 'Siyah / S', color: 'Siyah', size: 'S', stock: 2, priceCents: 10000 },
    { id: 'black-m', label: 'Siyah / M', color: 'Siyah', size: 'M', stock: 0, priceCents: 10000 },
    { id: 'white-s', label: 'Beyaz / S', color: 'Beyaz', size: 'S', stock: 0, priceCents: 10000 },
    { id: 'white-m', label: 'Beyaz / M', color: 'Beyaz', size: 'M', stock: 1, priceCents: 10000 },
  ],
};

const soldOutProduct = {
  id: 'product-2',
  variants: [
    { id: 'sold-s', label: 'Siyah / S', color: 'Siyah', size: 'S', stock: 0, priceCents: 9000 },
  ],
};

const products = [multiVariantProduct, soldOutProduct];
const blackSizes = getSizeOptions(multiVariantProduct, 'Siyah');
assert.equal(blackSizes.find((option) => option.value === 'S').isAvailable, true);
assert.equal(blackSizes.find((option) => option.value === 'M').isAvailable, false);
assert.equal(getColorOptions(multiVariantProduct).length, 2);
assert.equal(findVariant(multiVariantProduct, { color: 'Beyaz', size: 'L' }), null);
assert.equal(getDirectPurchaseVariant(multiVariantProduct), null);
assert.equal(isProductSoldOut(soldOutProduct), true);

const blockedAdd = addVariantToCart([], soldOutProduct, soldOutProduct.variants[0], 1);
assert.match(blockedAdd.error, /stokta/);
assert.deepEqual(blockedAdd.items, []);

const validVariant = multiVariantProduct.variants[0];
const cappedAdd = addVariantToCart([], multiVariantProduct, validVariant, 5);
assert.equal(cappedAdd.items[0].quantity, 2);
assert.match(cappedAdd.error, /2/);

const reconciled = reconcileCartItems([
  { productId: multiVariantProduct.id, variantLabel: validVariant.label, quantity: 5 },
  { productId: soldOutProduct.id, variantLabel: soldOutProduct.variants[0].label, quantity: 4 },
], products);
assert.equal(reconciled.items[0].quantity, 2);
assert.equal(reconciled.items[1].quantity, 1);
assert.ok(reconciled.issues.some((issue) => issue.type === 'quantity_adjusted'));
assert.ok(reconciled.issues.some((issue) => issue.type === 'out_of_stock'));

const hydrated = hydrateCartItems(reconciled.items, products);
assert.equal(hasBlockingCartStockIssue(hydrated), true);
assert.equal(hydrated.find((item) => item.variantId === 'sold-s').isAvailable, false);

const quantityResult = setCartItemQuantity(
  reconciled.items,
  products,
  reconciled.items[0],
  10
);
assert.equal(quantityResult.items[0].quantity, 2);
assert.match(quantityResult.error, /2/);

console.log(JSON.stringify({
  variantCombinations: 'passed',
  zeroStockBlocked: 'passed',
  quantityLimit: 'passed',
  legacyCartReconciliation: 'passed',
  soldOutCheckoutBlock: 'passed',
}, null, 2));
