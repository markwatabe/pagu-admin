import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function publicMenuRoutes() {
  const app = new Hono();

  // Public endpoint — no auth required
  app.get('/menu-items', async (c) => {
    const result = await db.query({ menuItems: { photo: {} } });
    const items = (result.menuItems ?? [])
      .filter((i: any) => i.available)
      .sort((a: any, b: any) =>
        (a.section ?? '').localeCompare(b.section ?? '') ||
        (a.name ?? '').localeCompare(b.name ?? '')
      )
      .map((i: any) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        section: i.section,
        price: i.price,
        photo: Array.isArray(i.photo) ? i.photo[0]?.url ?? null : i.photo?.url ?? null,
      }));

    return c.json(items);
  });

  return app;
}
