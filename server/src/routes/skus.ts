import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';
import { id as instantId } from '@instantdb/admin';

export function skuRoutes() {
  const app = new Hono();

  // GET /api/skus — list all SKUs
  app.get('/', async (c) => {
    const { skus } = await db.query({ skus: { component: {} } });
    const items = (skus ?? [])
      .map((sku) => ({
        id: sku.id,
        name: sku.name,
        url: sku.url,
        asin: sku.asin,
        brand: sku.brand,
        quantity: sku.quantity,
        unit: sku.unit,
        latestPrice: Array.isArray(sku.prices) && sku.prices.length > 0
          ? (sku.prices as any[])[(sku.prices as any[]).length - 1].price
          : null,
        latestDate: Array.isArray(sku.prices) && sku.prices.length > 0
          ? (sku.prices as any[])[(sku.prices as any[]).length - 1].date
          : null,
        component: Array.isArray(sku.component) ? sku.component[0] ?? null : sku.component ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return c.json(items);
  });

  // POST /api/skus — create a new SKU
  app.post('/', async (c) => {
    const body = await c.req.json<{
      name: string;
      url?: string;
      asin?: string;
      brand?: string;
      quantity?: number;
      unit?: string;
      componentId?: string;
    }>();

    if (!body.name) {
      return c.json({ error: 'name is required' }, 400);
    }

    const newId = instantId();
    const txns: any[] = [
      db.tx.skus[newId].update({
        name: body.name,
        url: body.url ?? null,
        asin: body.asin ?? null,
        brand: body.brand ?? null,
        quantity: body.quantity ?? null,
        unit: body.unit ?? null,
        prices: [],
      }),
    ];

    if (body.componentId) {
      txns.push(db.tx.skus[newId].link({ component: body.componentId }));
    }

    await db.transact(txns);
    return c.json({ ok: true, id: newId });
  });

  // DELETE /api/skus/:id — delete a SKU
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await db.transact([db.tx.skus[id].delete()]);
    return c.json({ ok: true });
  });

  return app;
}
