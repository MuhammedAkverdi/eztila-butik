import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('Starting scraper...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  });

  console.log('Navigating to Trendyol store...');
  await page.goto('https://www.trendyol.com/magaza/eztila-m-977827', { waitUntil: 'networkidle2' });
  
  console.log('Extracting initial state...');
  const data = await page.evaluate(() => {
    return window.__INITIAL_STATE__;
  });

  await browser.close();

  if (!data || !data.merchant || !data.merchant.products) {
    console.error('Failed to extract products. Maybe blocked by CAPTCHA?');
    process.exit(1);
  }

  const products = data.merchant.products.map((p, idx) => {
    return {
      id: p.id.toString(),
      name: p.name,
      category: p.categoryName || 'Diğer',
      slug: p.url ? p.url.split('?')[0].split('/').pop() : `urun-${p.id}`,
      priceCents: Math.round(p.price.sellingPrice * 100),
      compareAtCents: p.price.originalPrice > p.price.sellingPrice ? Math.round(p.price.originalPrice * 100) : 0,
      imageUrl: 'https://cdn.dsmcdn.com/' + p.imageUrls[0],
      stock: 10, // Mock stock as it's not always in listing
      featured: idx < 8,
      updatedAt: new Date().toISOString(),
      variants: [
        { id: `${p.id}-std`, label: "Standart", stock: 10 }
      ],
    };
  });

  console.log(`Extracted ${products.length} products.`);

  const output = `export const MOCK_PRODUCTS = ${JSON.stringify(products, null, 2)};

export const STORE_CONFIG = {
  freeShippingThresholdCents: 150000,
  shippingFeeCents: 7900,
};
`;

  fs.writeFileSync('./src/lib/mock-data.js', output);
  console.log('Successfully wrote to src/lib/mock-data.js');
})();
