import { Hono } from 'hono';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

function titleCase(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function ingredientRoutes(repoPath: string) {
  const app = new Hono();
  const ingredientsDir = path.join(repoPath, 'ingredients');

  // GET /api/ingredients — list all
  app.get('/', async (c) => {
    const files = await readdir(ingredientsDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const ingredients = await Promise.all(
      jsonFiles.map(async (file) => {
        const raw = await readFile(path.join(ingredientsDir, file), 'utf-8');
        const data = JSON.parse(raw);
        return {
          id: data.id,
          name: data.name ?? titleCase(data.id),
          production_type: data.production_type,
          ingredient_type: data.ingredient_type,
          type: data.type,
          hasRecipe: Array.isArray(data.ingredients) && data.ingredients.length > 0,
        };
      })
    );

    ingredients.sort((a, b) => a.name.localeCompare(b.name));
    return c.json(ingredients);
  });

  // GET /api/ingredients/:id — single ingredient with resolved names
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const filePath = path.join(ingredientsDir, `${id}.json`);

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch {
      return c.json({ error: 'Ingredient not found' }, 404);
    }

    const data = JSON.parse(raw);
    data.name = data.name ?? titleCase(data.id);

    // Resolve sub-ingredient names
    if (Array.isArray(data.ingredients)) {
      data.ingredients = await Promise.all(
        data.ingredients.map(async ([amount, unit, ingredientId]: [number, string, string]) => {
          let name = titleCase(ingredientId);
          try {
            const subRaw = await readFile(
              path.join(ingredientsDir, `${ingredientId}.json`),
              'utf-8'
            );
            const subData = JSON.parse(subRaw);
            name = subData.name ?? titleCase(subData.id);
          } catch {
            // file doesn't exist, use titleCase fallback
          }
          return { amount, unit, ingredientId, name };
        })
      );
    }

    return c.json(data);
  });

  return app;
}
