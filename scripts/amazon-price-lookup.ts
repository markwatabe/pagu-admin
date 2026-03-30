/**
 * Amazon Price Lookup Workflow
 *
 * Reads URLs from master-data/config/AMAZON_SKUS.csv, looks up prices via Chrome,
 * and upserts SKU files in master-data/skus/ with a prices history array.
 *
 * Run: pnpm tsx scripts/amazon-price-lookup.ts
 *
 * This script is designed to be executed by Claude Code with Chrome MCP tools.
 * It reads the CSV, then for each URL Claude Code should:
 *   1. Navigate to the URL
 *   2. Execute PRODUCT_EXTRACTION_JS to get core data (price, title, brand, rating, etc.)
 *   3. Execute DETAIL_EXTRACTION_JS to get detail bullets (units, weight, UPC, etc.)
 *   4. Call upsertSkuPrice() with the combined result
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const SKUS_DIR = join(REPO_ROOT, "master-data", "skus");
const CSV_PATH = join(REPO_ROOT, "master-data", "config", "AMAZON_SKUS.csv");

// ---------------------------------------------------------------------------
// Product extraction JS — pipe-delimited string for Chrome MCP javascript_tool
//
// Returns: "price|title|asin|brand|rating|reviewCount|unitPrice|isPrime|availability|sizeSelected"
//
// Price selector priority (most reliable first):
//   1. #corePrice_feature_div .a-price .a-offscreen  — modern product pages
//   2. .a-price .a-offscreen                          — fallback (first on page)
//   3. #priceblock_ourprice                            — older layout
//   4. #priceblock_dealprice                           — deal/lightning pages
//   5. .a-price-whole + .a-price-fraction              — split format
// ---------------------------------------------------------------------------
export const PRODUCT_EXTRACTION_JS = `(function(){var d=document;var p=d.querySelector('#corePrice_feature_div .a-price .a-offscreen')?.textContent||d.querySelector('.a-price .a-offscreen')?.textContent||d.querySelector('#priceblock_ourprice')?.textContent||d.querySelector('#priceblock_dealprice')?.textContent||(d.querySelector('.a-price-whole')?.textContent||'')+'.'+(d.querySelector('.a-price-fraction')?.textContent||'');var t=(d.querySelector('#productTitle')?.textContent||'').trim().substring(0,100);var a=location.pathname.match(/\\/dp\\/([A-Z0-9]+)/)?.[1]||'';var b=(d.querySelector('#bylineInfo')?.textContent||'').trim().replace(/^(Visit the |Brand: )/,'');var r=d.querySelector('#acrPopover .a-icon-alt')?.textContent?.trim()||'';var rc=d.querySelector('#acrCustomerReviewText')?.textContent?.trim()||'';var up=d.querySelector('#corePrice_feature_div .a-size-mini')?.textContent?.trim()||'';var pr=d.querySelector('.a-icon-prime')?'true':'false';var av=d.querySelector('#availability span')?.textContent?.trim()||'';var sz=d.querySelector('#variation_size_name .selection')?.textContent?.trim()||'';return[p||'NOT_FOUND',t,a,b,r,rc,up,pr,av,sz].join('|')})()`;

// ---------------------------------------------------------------------------
// Detail bullets extraction JS — pipe-delimited string
//
// Returns: "units|weight|dimensions|upc|manufacturer|bestSellersRank"
//
// Parses the #detailBullets_feature_div or #productDetails_techSpec_section_1
// ---------------------------------------------------------------------------
export const DETAIL_EXTRACTION_JS = `(function(){var d=document;var details={};var rows=d.querySelectorAll('#detailBullets_feature_div li span.a-list-item');rows.forEach(function(li){var txt=li.textContent.replace(/\\s+/g,' ').trim();var m=txt.match(/^(.+?)\\s*[:\\u200F\\u200E]+\\s*(.+)$/);if(m){details[m[1].trim()]=m[2].trim()}});if(!Object.keys(details).length){var rows2=d.querySelectorAll('#productDetails_techSpec_section_1 tr');rows2.forEach(function(row){var l=(row.querySelector('th')?.textContent||'').trim();var v=(row.querySelector('td')?.textContent||'').trim();if(l&&v)details[l]=v})}var u=details['Units']||details['Size']||'';var w=details['Item Weight']||'';var dim=details['Product Dimensions']||details['Package Dimensions']||'';var upc=details['UPC']||'';var mfr=details['Manufacturer']||'';var del=d.querySelector('#deliveryBlockMessage');var dt=del?del.textContent.replace(/\\s+/g,' ').trim().substring(0,120):'';return[u,w,dim,upc,mfr,dt].join('|')})()`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PriceEntry {
  price: number;
  date: string; // YYYY-MM-DD
  rating?: number;
  reviewCount?: number;
  isPrime?: boolean;
  availability?: string;
  delivery?: string;
}

interface SkuFile {
  id: string;
  asin: string;
  name: string;
  brand?: string;
  url: string;
  quantity?: number;
  unit?: string;
  weight?: string;
  dimensions?: string;
  upc?: string;
  manufacturer?: string;
  prices: PriceEntry[];
  [key: string]: unknown; // preserve any extra fields
}

// ---------------------------------------------------------------------------
// Read the CSV and return URLs
// ---------------------------------------------------------------------------
export function readSkuUrls(): string[] {
  const raw = readFileSync(CSV_PATH, "utf-8");
  return raw
    .split("\n")
    .slice(1) // skip header
    .map((line) => line.trim())
    .filter((line) => line.startsWith("http"));
}

// ---------------------------------------------------------------------------
// Extract ASIN from an Amazon URL
// ---------------------------------------------------------------------------
export function extractAsin(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]+)/);
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// Parse the pipe-delimited response from PRODUCT_EXTRACTION_JS
// ---------------------------------------------------------------------------
export function parseProductExtraction(url: string, raw: string) {
  const parts = raw.split("|");
  const [
    priceStr = "",
    title = "",
    asin = "",
    brand = "",
    ratingStr = "",
    reviewCountStr = "",
    _unitPrice = "",
    isPrimeStr = "",
    availability = "",
    _sizeSelected = "",
  ] = parts;

  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const ratingMatch = ratingStr.match(/([\d.]+)\s+out of/);
  const reviewMatch = reviewCountStr.match(/([\d,]+)/);

  return {
    price: cleaned ? parseFloat(cleaned) : null,
    title: title.trim(),
    asin: asin || extractAsin(url) || "",
    brand: brand.replace(/\s*Store$/, "").trim(),
    rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
    reviewCount: reviewMatch
      ? parseInt(reviewMatch[1].replace(/,/g, ""), 10)
      : null,
    isPrime: isPrimeStr === "true",
    availability: availability.trim(),
    url,
  };
}

// ---------------------------------------------------------------------------
// Parse the pipe-delimited response from DETAIL_EXTRACTION_JS
// ---------------------------------------------------------------------------
export function parseDetailExtraction(raw: string) {
  const [
    units = "",
    weight = "",
    dimensions = "",
    upc = "",
    manufacturer = "",
    delivery = "",
  ] = raw.split("|");

  // Try to parse "128 Fluid Ounces" or "10 Pounds" etc.
  let quantity: number | null = null;
  let unit: string | null = null;
  const unitMatch = units.match(/([\d.]+)\s+(.+)/);
  if (unitMatch) {
    quantity = parseFloat(unitMatch[1]);
    unit = unitMatch[2].trim();
  }

  return {
    quantity,
    unit,
    weight: weight.trim() || null,
    dimensions: dimensions.trim() || null,
    upc: upc.trim() || null,
    manufacturer: manufacturer.trim() || null,
    delivery: delivery.trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Find existing SKU file by ASIN
// ---------------------------------------------------------------------------
function findSkuFile(asin: string): { path: string; data: SkuFile } | null {
  if (!existsSync(SKUS_DIR)) return null;
  const files: string[] = readdirSync(SKUS_DIR);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = join(SKUS_DIR, file);
    try {
      const data = JSON.parse(readFileSync(filePath, "utf-8"));
      if (data.asin === asin) return { path: filePath, data };
    } catch {
      // skip malformed files
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Upsert a price data point into a SKU file
// Called by Claude Code after extracting data from each URL
// ---------------------------------------------------------------------------
export function upsertSkuPrice(
  product: ReturnType<typeof parseProductExtraction>,
  detail: ReturnType<typeof parseDetailExtraction>,
): { action: "created" | "updated" | "skipped"; path: string } {
  if (product.price === null) {
    return { action: "skipped", path: "" };
  }

  mkdirSync(SKUS_DIR, { recursive: true });

  const entry: PriceEntry = {
    price: product.price,
    date: new Date().toISOString().split("T")[0],
  };
  if (product.rating !== null) entry.rating = product.rating;
  if (product.reviewCount !== null) entry.reviewCount = product.reviewCount;
  entry.isPrime = product.isPrime;
  if (product.availability) entry.availability = product.availability;
  if (detail.delivery) entry.delivery = detail.delivery;

  const existing = findSkuFile(product.asin);

  if (existing) {
    // Update metadata if we have new info
    if (product.brand && !existing.data.brand) existing.data.brand = product.brand;
    if (detail.quantity !== null && !existing.data.quantity) existing.data.quantity = detail.quantity;
    if (detail.unit && !existing.data.unit) existing.data.unit = detail.unit;
    if (detail.weight && !existing.data.weight) existing.data.weight = detail.weight;
    if (detail.dimensions && !existing.data.dimensions) existing.data.dimensions = detail.dimensions;
    if (detail.upc && !existing.data.upc) existing.data.upc = detail.upc;
    if (detail.manufacturer && !existing.data.manufacturer) existing.data.manufacturer = detail.manufacturer;

    // Append to existing prices array
    if (!Array.isArray(existing.data.prices)) {
      existing.data.prices = [];
    }
    existing.data.prices.push(entry);
    writeFileSync(existing.path, JSON.stringify(existing.data, null, 4) + "\n");
    return { action: "updated", path: existing.path };
  }

  // Create new SKU file
  const id = product.title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 60);

  const newSku: SkuFile = {
    id,
    asin: product.asin,
    name: product.title,
    url: product.url,
    prices: [entry],
  };

  // Add optional metadata
  if (product.brand) newSku.brand = product.brand;
  if (detail.quantity !== null) newSku.quantity = detail.quantity;
  if (detail.unit) newSku.unit = detail.unit;
  if (detail.weight) newSku.weight = detail.weight;
  if (detail.dimensions) newSku.dimensions = detail.dimensions;
  if (detail.upc) newSku.upc = detail.upc;
  if (detail.manufacturer) newSku.manufacturer = detail.manufacturer;

  const filePath = join(SKUS_DIR, `${id}.json`);
  writeFileSync(filePath, JSON.stringify(newSku, null, 4) + "\n");
  return { action: "created", path: filePath };
}

// ---------------------------------------------------------------------------
// Main — prints the URLs to process (actual navigation done by Claude Code)
// ---------------------------------------------------------------------------
if (process.argv[1] === __filename) {
  const urls = readSkuUrls();
  console.log(`Found ${urls.length} URLs in ${CSV_PATH}:\n`);
  urls.forEach((url, i) => {
    const asin = extractAsin(url);
    const existing = asin ? findSkuFile(asin) : null;
    console.log(`  ${i + 1}. [${asin}] ${url}`);
    console.log(`     ${existing ? `EXISTS: ${existing.path}` : "NEW — will create"}`);
  });
  console.log(
    "\nRun this workflow via Claude Code with Chrome to fetch live prices."
  );
}
