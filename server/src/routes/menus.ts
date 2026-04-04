import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function menuRoutes() {
  const app = new Hono();

  // GET /api/menus — list all menus
  app.get('/', async (c) => {
    const { menus } = await db.query({ menus: {} });
    const items = (menus ?? [])
      .map((m) => ({ id: m.id, name: m.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return c.json(items);
  });

  // GET /api/menus/:id — single menu with full layout
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const { menus } = await db.query({
      menus: { $: { where: { id } }, dishes: {} },
    });

    const menu = menus?.[0];
    if (!menu) return c.json({ error: 'Menu not found' }, 404);

    return c.json({
      id: menu.id,
      name: menu.name,
      layout: menu.layout,
      dishes: menu.dishes ?? [],
    });
  });

  // PUT /api/menus/:id — save layout
  app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<{ name?: string; layout?: unknown }>();

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.layout !== undefined) update.layout = body.layout;

    await db.transact([db.tx.menus[id].update(update)]);
    return c.json({ ok: true });
  });

  return app;
}
