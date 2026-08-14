import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const SELF_TEST = process.argv.includes('--self-test');
const APPLY_CONFIRMATION = 'APPLY_INVENTORY';

function argumentValue(name) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1] || '';
  return process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLocaleLowerCase('tr-TR');
}

function inputIdentifier(row, index) {
  const sku = normalizeKey(row.sku);
  if (sku) return { key: `sku:${sku}`, label: `SKU ${String(row.sku).trim()}` };

  const productSlug = normalizeKey(row.product_slug);
  const color = normalizeKey(row.color);
  const size = normalizeKey(row.size);
  if (!productSlug || !size) {
    throw new Error(`Satır ${index + 1}: sku veya product_slug + size zorunludur.`);
  }
  return {
    key: `variant:${productSlug}|${color}|${size}`,
    label: `${productSlug} / ${color || 'renksiz'} / ${size}`,
  };
}

function validateInputRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Stok dosyası boş olmayan bir JSON dizisi olmalıdır.');
  }

  const seen = new Set();
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Satır ${index + 1}: geçerli bir nesne olmalıdır.`);
    }
    if (!Number.isInteger(row.stock_quantity) || row.stock_quantity < 0) {
      throw new Error(`Satır ${index + 1}: stock_quantity negatif olmayan bir integer olmalıdır.`);
    }

    const identifier = inputIdentifier(row, index);
    if (seen.has(identifier.key)) {
      throw new Error(`Duplicate stok satırı: ${identifier.label}`);
    }
    seen.add(identifier.key);
    return { ...row, ...identifier };
  });
}

function catalogKeys(variant) {
  const keys = [];
  const sku = normalizeKey(variant.sku);
  if (sku) keys.push(`sku:${sku}`);
  const productSlug = normalizeKey(variant.product?.slug);
  const color = normalizeKey(variant.color);
  const size = normalizeKey(variant.size);
  if (productSlug && size) keys.push(`variant:${productSlug}|${color}|${size}`);
  return keys;
}

function buildInventoryPlan(inputRows, catalogVariants) {
  const validated = validateInputRows(inputRows);
  const catalogIndex = new Map();

  for (const variant of catalogVariants) {
    for (const key of catalogKeys(variant)) {
      const matches = catalogIndex.get(key) || [];
      matches.push(variant);
      catalogIndex.set(key, matches);
    }
  }

  const resolvedVariantIds = new Set();
  const entries = validated.map((row) => {
    const matches = catalogIndex.get(row.key) || [];
    if (matches.length === 0) throw new Error(`Varyant bulunamadı: ${row.label}`);
    if (matches.length > 1) throw new Error(`Varyant eşleşmesi benzersiz değil: ${row.label}`);

    const variant = matches[0];
    if (resolvedVariantIds.has(variant.id)) {
      throw new Error(`Aynı varyant dosyada birden fazla tanımlanmış: ${row.label}`);
    }
    resolvedVariantIds.add(variant.id);

    return {
      id: variant.id,
      sku: variant.sku,
      product_slug: variant.product.slug,
      color: variant.color,
      size: variant.size,
      previous_stock: variant.stock_quantity,
      stock_quantity: row.stock_quantity,
    };
  });

  return {
    entries,
    changes: entries.filter((entry) => entry.previous_stock !== entry.stock_quantity),
    unchanged: entries.filter((entry) => entry.previous_stock === entry.stock_quantity),
  };
}

function expectFailure(label, callback, pattern) {
  try {
    callback();
  } catch (error) {
    if (pattern.test(error.message)) return { label, passed: true };
    throw new Error(`${label}: beklenmeyen hata: ${error.message}`);
  }
  throw new Error(`${label}: hata bekleniyordu.`);
}

function runSelfTest() {
  const catalog = [
    { id: 'variant-1', sku: 'EZ-001', color: 'Siyah', size: 'S', stock_quantity: 1, product: { slug: 'ornek-urun' } },
    { id: 'variant-2', sku: null, color: 'Beyaz', size: 'M', stock_quantity: 0, product: { slug: 'ornek-urun' } },
  ];

  const validPlan = buildInventoryPlan([{ sku: 'EZ-001', stock_quantity: 3 }], catalog);
  if (validPlan.changes.length !== 1 || validPlan.changes[0].previous_stock !== 1) {
    throw new Error('Geçerli dry-run planı oluşturulamadı.');
  }

  const tests = [
    { label: 'valid_row', passed: true },
    expectFailure('negative_stock', () => buildInventoryPlan([{ sku: 'EZ-001', stock_quantity: -1 }], catalog), /integer/),
    expectFailure('non_integer_stock', () => buildInventoryPlan([{ sku: 'EZ-001', stock_quantity: 1.5 }], catalog), /integer/),
    expectFailure('missing_variant', () => buildInventoryPlan([{ sku: 'BULUNAMAZ', stock_quantity: 1 }], catalog), /bulunamadı/),
    expectFailure('duplicate_input', () => buildInventoryPlan([
      { sku: 'EZ-001', stock_quantity: 1 },
      { sku: 'ez-001', stock_quantity: 2 },
    ], catalog), /Duplicate/),
  ];

  console.log(JSON.stringify({ mode: 'self-test', tests }, null, 2));
}

async function loadRemoteVariants(client) {
  const { data, error } = await client
    .from('product_variants')
    .select('id, sku, color, size, stock_quantity, product:products!inner(slug)');
  if (error) throw new Error(`Varyant kataloğu okunamadı: ${error.message}`);
  return data || [];
}

async function main() {
  if (SELF_TEST) {
    runSelfTest();
    return;
  }

  const filePath = argumentValue('--file');
  if (!filePath) {
    throw new Error('Kullanım: node scripts/update-inventory.mjs --file <stok.json> [--apply --confirm APPLY_INVENTORY]');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY yalnız güvenli server-side ortamda tanımlanmalıdır.');
  }
  if (APPLY && argumentValue('--confirm') !== APPLY_CONFIRMATION) {
    throw new Error(`Write işlemi için --confirm ${APPLY_CONFIRMATION} zorunludur.`);
  }

  const rows = JSON.parse(await readFile(filePath, 'utf8'));
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const catalogVariants = await loadRemoteVariants(admin);
  const plan = buildInventoryPlan(rows, catalogVariants);

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    matched: plan.entries.length,
    changes: plan.changes.length,
    unchanged: plan.unchanged.length,
    preview: plan.entries,
  };

  if (!APPLY || plan.changes.length === 0) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const { data, error } = await admin
    .from('product_variants')
    .upsert(
      plan.changes.map((entry) => ({ id: entry.id, stock_quantity: entry.stock_quantity })),
      { onConflict: 'id' }
    )
    .select('id, stock_quantity');
  if (error) throw new Error(`Stok güncellemesi başarısız: ${error.message}`);

  const updatedById = new Map((data || []).map((variant) => [variant.id, variant.stock_quantity]));
  for (const change of plan.changes) {
    if (updatedById.get(change.id) !== change.stock_quantity) {
      throw new Error(`Stok doğrulaması başarısız: ${change.product_slug} / ${change.color || 'renksiz'} / ${change.size}`);
    }
  }

  console.log(JSON.stringify({ ...summary, verifiedUpdates: plan.changes.length }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
