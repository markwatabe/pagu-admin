/**
 * Amazon Price Lookup Workflow
 *
 * Reads URLs from REPO/config/AMAZON_SKUS.csv, looks up prices via Chrome,
 * and upserts SKU files in REPO/skus/ with a prices history array.
 *
 * Run: pnpm tsx scripts/amazon-price-lookup.ts
 *
 * This script is designed to be executed by Claude Code with Chrome MCP tools.
 * It reads the CSV, then for each URL Claude Code should:
 *   1. Navigate to the URL
 *   2. Execute PRICE_EXTRACTION_JS
 *   3. Call upsertSkuPrice() with the result
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const REPO_ROOT = resolve(__dirname, "..");
const SKUS_DIR = join(REPO_ROOT, "REPO", "skus");
const CSV_PATH = join(REPO_ROOT, "REPO", "config", "AMAZON_SKUS.csv");

// ---------------------------------------------------------------------------
// Price extraction JS — single expression for Chrome MCP javascript_tool
// Returns: "price|title|asin" as pipe-delimited string
//
// Selector priority (most reliable first):
//   1. #corePrice_feature_div .a-price .a-offscreen  — modern product pages
//   2. .a-price .a-offscreen                          — fallback (first on page)
//   3. #priceblock_ourprice                            — older layout
//   4. #priceblock_dealprice                           — deal/lightning pages
//   5. .a-price-whole + .a-price-fraction              — split format
// ---------------------------------------------------------------------------
export const PRICE_EXTRACTION_JS = `(function() { var p = document.querySelector('#corePrice_feature_div .a-price .a-offscreen')?.textContent || document.querySelector('.a-price .a-offscreen')?.textContent || document.querySelector('#priceblock_ourprice')?.textContent || document.querySelector('#priceblock_dealprice')?.textContent || (document.querySelector('.a-price-whole')?.textContent || '') + '.' + (document.querySelector('.a-price-fraction')?.textContent || ''); var t = (document.querySelector('#productTitle')?.textContent || '').trim().substring(0, 80); var a = location.pathname.match(/\\/dp\\/([A-Z0-9]+)/)?.[1] || ''; return (p || 'NOT_FOUND') + '|' + t + '|' + a; })()`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PriceEntry {
  price: number;
  date: string; // ISO 8601
}

interface SkuFile {
  id: string;
  asin: string;
  name: string;
  url: string;
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
// Parse the pipe-delimited response from PRICE_EXTRACTION_JS
// ---------------------------------------------------------------------------
export function parseExtraction(url: string, raw: string) {
  const [priceStr = "", title = "", asin = ""] = raw.split("|");
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  return {
    price: cleaned ? parseFloat(cleaned) : null,
    priceDisplay: priceStr === "NOT_FOUND" ? null : priceStr,
    title,
    asin: asin || extractAsin(url) || "",
    url,
  };
}

// ---------------------------------------------------------------------------
// Find existing SKU file by ASIN, or return null
// ---------------------------------------------------------------------------
function findSkuFileByAsin(asin: string): string | null {
  if (!existsSync(SKUS_DIR)) return null;
  const files = readFileSync(SKUS_DIR, "utf-8"); // won't work, need readdirSync
  return null; // handled below
}

function findSkuFile(asin: string): { path: string; data: SkuFile } | null {
  if (!existsSync(SKUS_DIR)) return null;
  const { readdirSync } = require("fs");
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
// Called by Claude Code after extracting price from each URL
// ---------------------------------------------------------------------------
export function upsertSkuPrice(extraction: {
  asin: string;
  title: string;
  url: string;
  price: number | null;
}): { action: "created" | "updated" | "skipped"; path: string } {
  if (extraction.price === null) {
    return { action: "skipped", path: "" };
  }

  mkdirSync(SKUS_DIR, { recursive: true });

  const entry: PriceEntry = {
    price: extraction.price,
    date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
  };

  const existing = findSkuFile(extraction.asin);

  if (existing) {
    // Append to existing prices array
    if (!Array.isArray(existing.data.prices)) {
      existing.data.prices = [];
    }
    existing.data.prices.push(entry);
    writeFileSync(existing.path, JSON.stringify(existing.data, null, 4) + "\n");
    return { action: "updated", path: existing.path };
  }

  // Create new SKU file
  const id = extraction.title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 60);

  const newSku: SkuFile = {
    id,
    asin: extraction.asin,
    name: extraction.title,
    url: extraction.url,
    prices: [entry],
  };

  const filePath = join(SKUS_DIR, `${id}.json`);
  writeFileSync(filePath, JSON.stringify(newSku, null, 4) + "\n");
  return { action: "created", path: filePath };
}

// ---------------------------------------------------------------------------
// Main — prints the URLs to process (actual navigation done by Claude Code)
// ---------------------------------------------------------------------------
if (require.main === module) {
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
