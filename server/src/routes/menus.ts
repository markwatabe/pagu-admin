import { Hono } from 'hono';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function menuRoutes(repoPath: string) {
  const app = new Hono();
  const menusDir = path.join(repoPath, 'menus');

  // GET /api/menus — list all
  app.get('/', async (c) => {
    const files = await readdir(menusDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const menus = await Promise.all(
      jsonFiles.map(async (file) => {
        const raw = await readFile(path.join(menusDir, file), 'utf-8');
        const data = JSON.parse(raw);
        return { id: data.id, name: data.name };
      })
    );

    menus.sort((a, b) => a.name.localeCompare(b.name));
    return c.json(menus);
  });

  // GET /api/menus/:id — single menu with full layout
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const filePath = path.join(menusDir, `${id}.json`);

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch {
      return c.json({ error: 'Menu not found' }, 404);
    }

    return c.json(JSON.parse(raw));
  });

  // PUT /api/menus/:id — save layout
  app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const filePath = path.join(menusDir, `${id}.json`);
    const body = await c.req.json();

    // Ensure id matches the URL
    body.id = id;

    await writeFile(filePath, JSON.stringify(body, null, 4) + '\n', 'utf-8');
    return c.json({ ok: true });
  });

  return app;
}
