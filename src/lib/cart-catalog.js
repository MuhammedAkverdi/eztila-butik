import { getVariantStock } from './catalog-stock.js';

function findCartVariant(product, item) {
  if (!product) return null;
  return product.variants?.find((variant) => (
    (item.variantId && variant.id === item.variantId)
    || (!item.variantId && variant.label === item.variantLabel)
  )) || null;
}

function normalizeRequestedQuantity(value) {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export function reconcileCartItems(cart, products) {
  const source = Array.isArray(cart) ? cart : [];
  const grouped = new Map();
  const issues = [];

  for (const item of source) {
    const product = products.find((candidate) => candidate.id === item?.productId);
    if (!product) {
      issues.push({ type: 'missing_product', item });
      continue;
    }

    const variant = findCartVariant(product, item);
    if (!variant) {
      issues.push({ type: 'missing_variant', item });
      continue;
    }

    const key = `${product.id}:${variant.id}`;
    const quantity = normalizeRequestedQuantity(item.quantity);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += quantity;
      issues.push({ type: 'duplicate_merged', productId: product.id, variantId: variant.id });
    } else {
      grouped.set(key, {
        productId: product.id,
        variantId: variant.id,
        variantLabel: variant.label,
        quantity,
      });
    }
  }

  const items = [...grouped.values()].map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = findCartVariant(product, item);
    const stock = getVariantStock(variant);

    if (stock === 0) {
      issues.push({ type: 'out_of_stock', productId: item.productId, variantId: item.variantId });
      return { ...item, quantity: 1 };
    }

    if (item.quantity > stock) {
      issues.push({
        type: 'quantity_adjusted',
        productId: item.productId,
        variantId: item.variantId,
        previousQuantity: item.quantity,
        quantity: stock,
      });
      return { ...item, quantity: stock };
    }

    return item;
  });

  return {
    items,
    issues,
    changed: JSON.stringify(items) !== JSON.stringify(source),
  };
}

export function getCartReconciliationMessage(issues) {
  if (issues.some((issue) => issue.type === 'out_of_stock')) {
    return 'Sepetinizde şu anda stokta olmayan bir ürün var.';
  }
  if (issues.some((issue) => issue.type === 'quantity_adjusted')) {
    return 'Sepet adetleri güncel stok miktarına göre düzeltildi.';
  }
  if (issues.some((issue) => issue.type === 'missing_product' || issue.type === 'missing_variant')) {
    return 'Artık satışta olmayan bazı sepet ürünleri kaldırıldı.';
  }
  if (issues.some((issue) => issue.type === 'duplicate_merged')) {
    return 'Tekrarlanan sepet satırları birleştirildi.';
  }
  return '';
}

export function hydrateCartItems(cart, products) {
  return (Array.isArray(cart) ? cart : []).map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = findCartVariant(product, item);
    const stock = getVariantStock(variant);
    return {
      ...item,
      product,
      variant,
      stock,
      isAvailable: stock > 0,
      isQuantityValid: stock > 0 && item.quantity <= stock,
    };
  }).filter((item) => item.product && item.variant);
}

export function hasBlockingCartStockIssue(cartItems) {
  return cartItems.some((item) => !item.isQuantityValid);
}

export function addVariantToCart(cart, product, variant, requestedQuantity = 1) {
  const stock = getVariantStock(variant);
  if (!product || !variant || !product.variants?.some((item) => item.id === variant.id) || stock === 0) {
    return { items: cart, error: 'Bu varyant şu anda stokta bulunmuyor.' };
  }

  const quantity = normalizeRequestedQuantity(requestedQuantity);
  const existing = cart.find((item) => (
    item.productId === product.id
    && (item.variantId === variant.id || (!item.variantId && item.variantLabel === variant.label))
  ));
  const nextQuantity = Math.min(stock, (existing?.quantity || 0) + quantity);

  if (existing && existing.quantity >= stock) {
    return { items: cart, error: `Bu varyanttan en fazla ${stock} adet ekleyebilirsiniz.` };
  }

  const nextItem = {
    productId: product.id,
    variantId: variant.id,
    variantLabel: variant.label,
    quantity: nextQuantity,
  };
  const items = existing
    ? cart.map((item) => item === existing ? nextItem : item)
    : [...cart, nextItem];

  return {
    items,
    error: nextQuantity < (existing?.quantity || 0) + quantity
      ? `Adet güncel stokla ${stock} olarak sınırlandı.`
      : '',
  };
}

export function setCartItemQuantity(cart, products, target, requestedQuantity) {
  if (requestedQuantity < 1) {
    return {
      items: cart.filter((item) => !(
        item.productId === target.productId
        && (item.variantId === target.variantId || item.variantLabel === target.variantLabel)
      )),
      error: '',
    };
  }

  const product = products.find((candidate) => candidate.id === target.productId);
  const variant = findCartVariant(product, target);
  const stock = getVariantStock(variant);
  if (stock === 0) return { items: cart, error: 'Bu ürün şu anda stokta bulunmuyor.' };

  const quantity = Math.min(stock, normalizeRequestedQuantity(requestedQuantity));
  return {
    items: cart.map((item) => (
      item.productId === target.productId
      && (item.variantId === target.variantId || item.variantLabel === target.variantLabel)
        ? { ...item, variantId: variant.id, variantLabel: variant.label, quantity }
        : item
    )),
    error: requestedQuantity > stock ? `Bu varyanttan en fazla ${stock} adet ekleyebilirsiniz.` : '',
  };
}
