import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function recipeRoutes() {
  const app = new Hono();

  // GET /api/recipes — list all components
  app.get('/', async (c) => {
    const { components } = await db.query({ components: { recipes: {} } });
    const items = (components ?? [])
      .map((comp) => ({
        id: comp.id,
        name: comp.name,
        type: comp.type ?? null,
        allergen: comp.allergen ?? false,
        hasRecipe: Array.isArray(comp.recipes) && comp.recipes.length > 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return c.json(items);
  });

  // GET /api/recipes/:id — single component with its recipes
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const { components } = await db.query({
      components: { $: { where: { id } }, recipes: {}, skus: {} },
    });

    const comp = components?.[0];
    if (!comp) return c.json({ error: 'Component not found' }, 404);

    return c.json({
      id: comp.id,
      name: comp.name,
      type: comp.type,
      allergen: comp.allergen,
      recipes: comp.recipes ?? [],
      skus: comp.skus ?? [],
    });
  });

  return app;
}
