import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function publicMenuRoutes() {
  const app = new Hono();

  app.get('/menu-items', async (c) => {
    const { dishes } = await db.query({ dishes: { photo: {} } });
    const items = (dishes ?? [])
      .filter((d: any) => d.available)
      .sort((a: any, b: any) =>
        (a.section ?? '').localeCompare(b.section ?? '') ||
        (a.name ?? '').localeCompare(b.name ?? '')
      )
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        section: d.section,
        price: d.price,
        photo: Array.isArray(d.photo) ? d.photo[0]?.url ?? null : d.photo?.url ?? null,
      }));

    return c.json(items);
  });

  return app;
}
