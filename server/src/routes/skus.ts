import { Hono } from 'hono';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

interface SkuListItem {
  url: string;
  asin: string;
  name: string | null;
  brand: string | null;
  latestPrice: number | null;
  latestDate: string | null;
  hasSkuFile: boolean;
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]+)/);
  return match?.[1] ?? null;
}

function extractNameFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split('/dp/')[0].replace(/^\/+/, '');
    if (!slug) return null;
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return null;
  }
}

export function skuRoutes(repoPath: string) {
  const app = new Hono();
  const csvPath = path.join(repoPath, 'config', 'AMAZON_SKUS.csv');
  const skusDir = path.join(repoPath, 'skus');

  // Read CSV and return array of URLs
  async function readCsvUrls(): Promise<string[]> {
    const raw = await readFile(csvPath, 'utf-8');
    return raw
      .split('\n')
      .slice(1) // skip header
      .map((line) => line.trim())
      .filter((line) => line.startsWith('http'));
  }

  // Write URLs back to CSV
  async function writeCsvUrls(urls: string[]): Promise<void> {
    const csv = 'url\n' + urls.join('\n') + '\n';
    await writeFile(csvPath, csv, 'utf-8');
  }

  // Load all SKU JSON files into a map keyed by ASIN
  async function loadSkuFiles(): Promise<Map<string, Record<string, unknown>>> {
    const map = new Map<string, Record<string, unknown>>();
    try {
      const files = await readdir(skusDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await readFile(path.join(skusDir, file), 'utf-8');
          const data = JSON.parse(raw);
          if (data.asin) map.set(data.asin, data);
        } catch {
          // skip malformed
        }
      }
    } catch {
      // skus dir might not exist
    }
    return map;
  }

  // GET /api/skus — list all SKUs from CSV, enriched with SKU file data
  app.get('/', async (c) => {
    const urls = await readCsvUrls();
    const skuMap = await loadSkuFiles();

    const items: SkuListItem[] = urls.map((url) => {
      const asin = extractAsin(url) ?? '';
      const sku = skuMap.get(asin);
      const prices = sku && Array.isArray(sku.prices) ? (sku.prices as { price: number; date: string }[]) : [];
      const latest = prices.length > 0 ? prices[prices.length - 1] : null;

      return {
        url,
        asin,
        name: (sku?.name as string) ?? extractNameFromUrl(url),
        brand: (sku?.brand as string) ?? null,
        latestPrice: latest?.price ?? null,
        latestDate: latest?.date ?? null,
        hasSkuFile: !!sku,
      };
    });

    return c.json(items);
  });

  // DELETE /api/skus/:asin — remove a URL from the CSV by ASIN
  app.delete('/:asin', async (c) => {
    const asin = c.req.param('asin');
    const urls = await readCsvUrls();
    const filtered = urls.filter((url) => extractAsin(url) !== asin);

    if (filtered.length === urls.length) {
      return c.json({ error: 'ASIN not found in CSV' }, 404);
    }

    await writeCsvUrls(filtered);
    return c.json({ ok: true, removed: urls.length - filtered.length });
  });

  // POST /api/skus — add a URL to the CSV
  app.post('/', async (c) => {
    const body = await c.req.json<{ url: string }>();
    if (!body.url || !body.url.startsWith('http')) {
      return c.json({ error: 'url is required' }, 400);
    }

    const asin = extractAsin(body.url);
    if (!asin) {
      return c.json({ error: 'Could not extract ASIN from URL' }, 400);
    }

    const urls = await readCsvUrls();
    // Check for duplicate
    if (urls.some((u) => extractAsin(u) === asin)) {
      return c.json({ error: 'ASIN already exists in CSV' }, 409);
    }

    urls.push(body.url);
    await writeCsvUrls(urls);
    return c.json({ ok: true, asin });
  });

  return app;
}
