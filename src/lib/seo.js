export const SITE_URL = 'https://eztila-butik.vercel.app';
export const DEFAULT_TITLE = 'Eztila Butik | Kadın Giyim Koleksiyonu';
export const DEFAULT_DESCRIPTION = 'Eztila Butik kadın giyim koleksiyonunu keşfedin; ürün detaylarını inceleyin, Trendyol mağazamız veya WhatsApp üzerinden bize ulaşın.';

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

function upsertCanonical(url) {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

export function setPageSeo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  type = 'website',
  robots = 'index,follow',
  structuredData,
}) {
  const canonicalUrl = new URL(path, SITE_URL).toString();
  document.title = title;

  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Eztila Butik' });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });

  if (image) {
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
  } else {
    document.head.querySelector('meta[property="og:image"]')?.remove();
    document.head.querySelector('meta[name="twitter:image"]')?.remove();
  }

  upsertCanonical(canonicalUrl);

  let schema = document.head.querySelector('#eztila-structured-data');
  if (!structuredData) {
    schema?.remove();
    return;
  }
  if (!schema) {
    schema = document.createElement('script');
    schema.id = 'eztila-structured-data';
    schema.type = 'application/ld+json';
    document.head.appendChild(schema);
  }
  schema.textContent = JSON.stringify(structuredData);
}

export function getOrganizationSchema(storeConfig, logoUrl) {
  const sameAs = [storeConfig?.instagramUrl, storeConfig?.trendyolUrl].filter(Boolean);
  const contactPoint = {};
  if (storeConfig?.contactPhone) contactPoint.telephone = storeConfig.contactPhone;
  if (storeConfig?.contactEmail) contactPoint.email = storeConfig.contactEmail;

  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: storeConfig?.storeName || 'Eztila Butik',
    url: SITE_URL,
    logo: logoUrl,
    ...(sameAs.length ? { sameAs } : {}),
    ...(Object.keys(contactPoint).length ? {
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        ...contactPoint,
      },
    } : {}),
  };
}
