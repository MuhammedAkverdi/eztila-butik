import assert from 'node:assert/strict';
import {
  filterCatalogProducts,
  getCatalogFilterOptions,
  normalizeCatalogValue,
  sortCatalogProducts,
} from '../src/lib/catalog-discovery.js';
import { getNextGalleryIndex, getProductGalleryImages } from '../src/lib/product-gallery.js';

const products = [
  {
    id: 'dress',
    name: 'Siyah Elbise',
    category: 'Elbiseler',
    priceCents: 149900,
    imageUrl: 'primary.webp',
    images: ['primary.webp', 'detail.webp', 'primary.webp'],
    variants: [
      { size: 'S', color: 'Siyah', stock: 0 },
      { size: 'M', color: 'SİYAH', stock: 2 },
      { size: 'S', color: 'Beyaz', stock: 1 },
    ],
  },
  {
    id: 'set',
    name: 'Krem Takım',
    category: 'Takımlar',
    priceCents: 219900,
    variants: [{ size: 'L', color: ' Krem ', stock: 0 }],
  },
];

assert.equal(normalizeCatalogValue(' SİYAH  '), 'siyah');
const options = getCatalogFilterOptions(products);
assert.deepEqual(options.sizes.map((option) => option.key), ['s', 'm', 'l']);
assert.equal(options.colors.filter((option) => option.key === 'siyah').length, 1);

assert.deepEqual(filterCatalogProducts(products, {
  search: 'elbise', category: 'Tümü', sizes: ['m'], colors: ['siyah'],
}).map((product) => product.id), ['dress']);

assert.equal(filterCatalogProducts(products, {
  search: '', category: 'Elbiseler', sizes: ['m'], colors: ['beyaz'],
}).length, 0, 'Beden ve renk aynı gerçek varyantta eşleşmelidir.');

assert.deepEqual(filterCatalogProducts(products, {
  search: '', category: 'Tümü', sizes: [], colors: [], minPrice: '2000', maxPrice: '',
}).map((product) => product.id), ['set']);

assert.deepEqual(filterCatalogProducts(products, {
  search: '', category: 'Takımlar', sizes: ['l'], colors: ['krem'], minPrice: '', maxPrice: '',
}).map((product) => product.id), ['set'], 'Stok bilgisi ürün keşfini etkilememelidir.');

assert.deepEqual(sortCatalogProducts(products, 'high').map((product) => product.id), ['set', 'dress']);
assert.deepEqual(getProductGalleryImages(products[0], 'fallback.webp'), ['primary.webp', 'detail.webp']);
assert.deepEqual(getProductGalleryImages({}, 'fallback.webp'), ['fallback.webp']);
assert.equal(getNextGalleryIndex(['a', 'b', 'c'], 0, 1, new Set(['b'])), 2);
assert.equal(getNextGalleryIndex(['a', 'b', 'c'], 0, -1), 2);

console.log(JSON.stringify({
  normalizedColors: options.colors.length,
  sizes: options.sizes.map((option) => option.label),
  combinedFilters: true,
  sameVariantMatching: true,
  stockIndependentDiscovery: true,
  galleryNavigation: true,
}, null, 2));
