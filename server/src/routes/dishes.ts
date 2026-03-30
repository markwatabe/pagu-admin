import { Hono } from 'hono';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export function dishRoutes(repoPath: string) {
  const app = new Hono();
  const dishesDir = path.join(repoPath, 'dishes');

  // GET /api/dishes — list all
  app.get('/', async (c) => {
    const files = await readdir(dishesDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const dishes = await Promise.all(
      jsonFiles.map(async (file) => {
        const raw = await readFile(path.join(dishesDir, file), 'utf-8');
        return JSON.parse(raw);
      })
    );

    dishes.sort((a, b) => a.name.localeCompare(b.name));
    return c.json(dishes);
  });

  // GET /api/dishes/:id — single dish
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const filePath = path.join(dishesDir, `${id}.json`);

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch {
      return c.json({ error: 'Dish not found' }, 404);
    }

    return c.json(JSON.parse(raw));
  });

  return app;
}
