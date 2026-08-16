const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '3xl', '4xl'];

export function normalizeCatalogValue(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR');
}

function uniqueDisplayValues(values) {
  const byKey = new Map();
  values.forEach((value) => {
    const display = String(value || '').trim().replace(/\s+/g, ' ');
    const key = normalizeCatalogValue(display);
    if (key && !byKey.has(key)) byKey.set(key, display);
  });
  return [...byKey.entries()].map(([key, label]) => ({ key, label }));
}

export function getCatalogFilterOptions(products) {
  const variants = products.flatMap((product) => product.variants || []);
  const sizes = uniqueDisplayValues(variants.map((variant) => variant.size)).sort((a, b) => {
    const aIndex = SIZE_ORDER.indexOf(a.key);
    const bIndex = SIZE_ORDER.indexOf(b.key);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.label.localeCompare(b.label, 'tr-TR');
  });
  const colors = uniqueDisplayValues(variants.map((variant) => variant.color))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr-TR'));

  return { sizes, colors };
}

function variantMatches(variant, selectedSizes, selectedColors) {
  const sizeMatches = selectedSizes.length === 0
    || selectedSizes.includes(normalizeCatalogValue(variant.size));
  const colorMatches = selectedColors.length === 0
    || selectedColors.includes(normalizeCatalogValue(variant.color));
  return sizeMatches && colorMatches;
}

function parsePriceCents(value) {
  if (value === '' || value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export function filterCatalogProducts(products, filters) {
  const search = normalizeCatalogValue(filters.search);
  const category = normalizeCatalogValue(filters.category);
  const selectedSizes = (filters.sizes || []).map(normalizeCatalogValue);
  const selectedColors = (filters.colors || []).map(normalizeCatalogValue);
  const minPriceCents = parsePriceCents(filters.minPrice);
  const maxPriceCents = parsePriceCents(filters.maxPrice);
  const needsVariantMatch = selectedSizes.length > 0 || selectedColors.length > 0;

  return products.filter((product) => {
    if (category && category !== 'tümü' && normalizeCatalogValue(product.category) !== category) return false;
    if (search && !normalizeCatalogValue(`${product.name} ${product.category}`).includes(search)) return false;
    if (minPriceCents != null && product.priceCents < minPriceCents) return false;
    if (maxPriceCents != null && product.priceCents > maxPriceCents) return false;
    if (needsVariantMatch && !(product.variants || []).some((variant) => (
      variantMatches(variant, selectedSizes, selectedColors)
    ))) return false;
    return true;
  });
}

export function sortCatalogProducts(products, sort) {
  const result = [...products];
  if (sort === 'low') result.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === 'high') result.sort((a, b) => b.priceCents - a.priceCents);
  return result;
}
