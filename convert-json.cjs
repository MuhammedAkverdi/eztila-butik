const fs = require('fs');

let rawData = fs.readFileSync('src/lib/mock-data.json', 'utf8');
const data = JSON.parse(rawData);

const output = `export const MOCK_PRODUCTS = ${JSON.stringify(data.products, null, 2)};

export const STORE_CONFIG = {
  freeShippingThresholdCents: 150000,
  shippingFeeCents: 7900,
};
`;

fs.writeFileSync('src/lib/mock-data.js', output);
console.log('Done');
