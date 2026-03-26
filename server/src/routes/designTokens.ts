import { Hono } from 'hono';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function designTokenRoutes(repoPath: string) {
  const app = new Hono();
  const filePath = path.join(repoPath, 'design-tokens.json');

  // GET /api/design-tokens
  app.get('/', async (c) => {
    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch {
      return c.json({});
    }
    return c.json(JSON.parse(raw));
  });

  // PUT /api/design-tokens
  app.put('/', async (c) => {
    const body = await c.req.json();
    await writeFile(filePath, JSON.stringify(body, null, 4) + '\n', 'utf-8');
    return c.json({ ok: true });
  });

  return app;
}
