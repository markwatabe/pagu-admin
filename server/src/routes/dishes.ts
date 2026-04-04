import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function dishRoutes() {
  const app = new Hono();

  // GET /api/dishes — list all dishes
  app.get('/', async (c) => {
    const { dishes } = await db.query({ dishes: { photo: {}, components: {} } });
    const items = (dishes ?? [])
      .sort((a, b) =>
        (a.section ?? '').localeCompare(b.section ?? '') ||
        a.name.localeCompare(b.name)
      );
    return c.json(items);
  });

  // GET /api/dishes/:id — single dish with components
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const { dishes } = await db.query({
      dishes: { $: { where: { id } }, components: { recipes: {} }, photo: {} },
    });

    const dish = dishes?.[0];
    if (!dish) return c.json({ error: 'Dish not found' }, 404);

    return c.json(dish);
  });

  return app;
}
