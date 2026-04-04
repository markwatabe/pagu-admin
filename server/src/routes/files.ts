import { Hono } from 'hono';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function fileRoutes(repoPath: string) {
  const app = new Hono();
  const menusDir = path.join(repoPath, 'menus');

  // POST /api/files/replace-url — replace oldUrl with newUrl in all menu JSON files
  app.post('/replace-url', async (c) => {
    const { oldUrl, newUrl } = await c.req.json<{ oldUrl: string; newUrl: string }>();

    if (!oldUrl || !newUrl) {
      return c.json({ error: 'oldUrl and newUrl are required' }, 400);
    }

    const files = await readdir(menusDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    let totalReplacements = 0;

    for (const file of jsonFiles) {
      const filePath = path.join(menusDir, file);
      const raw = await readFile(filePath, 'utf-8');

      if (!raw.includes(oldUrl)) continue;

      const updated = raw.replaceAll(oldUrl, newUrl);
      await writeFile(filePath, updated, 'utf-8');
      totalReplacements++;
    }

    return c.json({ ok: true, filesUpdated: totalReplacements });
  });

  return app;
}
