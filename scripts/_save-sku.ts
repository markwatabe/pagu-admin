/**
 * Helper: save a single SKU from extracted pipe-delimited data.
 * Usage: pnpm tsx scripts/_save-sku.ts <url> <productData> <detailData>
 */
import { parseProductExtraction, parseDetailExtraction, upsertSkuPrice } from './amazon-price-lookup.ts';

const [,, url, productRaw, detailRaw] = process.argv;
if (!url || !productRaw) {
  console.error('Usage: pnpm tsx scripts/_save-sku.ts <url> <productData> [detailData]');
  process.exit(1);
}
const product = parseProductExtraction(url, productRaw);
const detail = parseDetailExtraction(detailRaw || '|||||');
const result = upsertSkuPrice(product, detail);
console.log(JSON.stringify(result));
