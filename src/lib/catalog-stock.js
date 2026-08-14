export const LOW_STOCK_MAX = 3;

function parseVariantLabel(label = '') {
  const parts = String(label).split('/').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1
    ? { color: parts[0], size: parts.slice(1).join(' / ') }
    : { color: null, size: parts[0] || '' };
}

export function getVariantStock(variant) {
  const stock = Number(variant?.stock);
  return Number.isInteger(stock) && stock > 0 ? stock : 0;
}

export function getVariantColor(variant) {
  return variant?.color ?? parseVariantLabel(variant?.label).color;
}

export function getVariantSize(variant) {
  return variant?.size ?? parseVariantLabel(variant?.label).size;
}

export function getSaleableVariants(product) {
  return (product?.variants || []).filter((variant) => getVariantStock(variant) > 0);
}

export function getProductStock(product) {
  return (product?.variants || []).reduce((total, variant) => total + getVariantStock(variant), 0);
}

export function isProductSoldOut(product) {
  return getSaleableVariants(product).length === 0;
}

export function getDirectPurchaseVariant(product) {
  const saleable = getSaleableVariants(product);
  return saleable.length === 1 ? saleable[0] : null;
}

export function getColorOptions(product) {
  const grouped = new Map();
  for (const variant of product?.variants || []) {
    const color = getVariantColor(variant);
    if (!color) continue;
    const current = grouped.get(color) || { value: color, stock: 0 };
    current.stock += getVariantStock(variant);
    grouped.set(color, current);
  }
  return [...grouped.values()].map((option) => ({
    ...option,
    isAvailable: option.stock > 0,
  }));
}

export function getSizeOptions(product, color = null) {
  const hasColors = getColorOptions(product).length > 0;
  if (hasColors && !color) return [];

  return (product?.variants || [])
    .filter((variant) => !hasColors || getVariantColor(variant) === color)
    .map((variant) => ({
      value: getVariantSize(variant),
      variant,
      stock: getVariantStock(variant),
      isAvailable: getVariantStock(variant) > 0,
    }));
}

export function findVariant(product, { color = null, size = '' } = {}) {
  const hasColors = getColorOptions(product).length > 0;
  return (product?.variants || []).find((variant) => (
    getVariantSize(variant) === size
    && (!hasColors || getVariantColor(variant) === color)
  )) || null;
}
