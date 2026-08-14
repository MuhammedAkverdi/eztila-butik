export function getProductGalleryImages(product, fallbackUrl = '') {
  const candidates = [
    ...(product?.images || []),
    product?.imageUrl,
  ];
  const unique = [];
  const seen = new Set();

  candidates.forEach((value) => {
    const url = String(value || '').trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      unique.push(url);
    }
  });

  return unique.length > 0 ? unique : [fallbackUrl].filter(Boolean);
}

export function getNextGalleryIndex(images, currentIndex, direction = 1, excluded = new Set()) {
  if (images.length < 2) return 0;
  for (let step = 1; step <= images.length; step += 1) {
    const index = (currentIndex + (step * direction) + images.length) % images.length;
    if (!excluded.has(images[index])) return index;
  }
  return currentIndex;
}
