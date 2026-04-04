import { Hono } from 'hono';
import { writeFile } from 'node:fs/promises';
import { getRecipe, listRecipesOnly, listAllRecipes, resolveRecipeDir } from '../lib/recipes.js';
import path from 'node:path';

function titleCase(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function recipeRoutes(repoPath: string) {
  const app = new Hono();

  // GET /api/recipes — list recipes only (from recipes/ directory)
  app.get('/', async (c) => {
    const jsonFiles = await listRecipesOnly(repoPath);

    const recipes = await Promise.all(
      jsonFiles.map(async (file) => {
        const id = file.replace(/\.json$/, '');
        const data = await getRecipe(repoPath, id);
        if (!data) return null;
        return {
          id: data.id,
          name: (data.name as string) ?? titleCase(data.id as string),
          production_type: data.production_type,
          ingredient_type: data.ingredient_type,
          type: data.type,
          unit: data.unit,
          hasRecipe: Array.isArray(data.ingredients) && (data.ingredients as unknown[]).length > 0,
        };
      })
    );

    const filtered = recipes.filter(Boolean);
    filtered.sort((a, b) => a!.name.localeCompare(b!.name));
    return c.json(filtered);
  });

  // GET /api/recipes/all — list everything (recipes + purchasable ingredients)
  app.get('/all', async (c) => {
    const jsonFiles = await listAllRecipes(repoPath);
    console.log("JSOIN FOLES", jsonFiles)
    const items = await Promise.all(
      jsonFiles.map(async (file) => {
        const id = file.replace(/\.json$/, '');
        const data = await getRecipe(repoPath, id);
        if (!data) return null;
        return {
          id: data.id,
          name: (data.name as string) ?? titleCase(data.id as string),
          production_type: data.production_type,
          ingredient_type: data.ingredient_type,
          type: data.type,
        };
      })
    );

    const filtered = items.filter(Boolean);
    filtered.sort((a, b) => a!.name.localeCompare(b!.name));
    return c.json(filtered);
  });

  // GET /api/recipes/:id — single recipe with resolved names
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const data = await getRecipe(repoPath, id);

    if (!data) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    data.name = (data.name as string) ?? titleCase(data.id as string);

    // Resolve sub-ingredient names
    if (Array.isArray(data.ingredients)) {
      data.ingredients = await Promise.all(
        (data.ingredients as [number, string, string][]).map(
          async ([amount, unit, ingredientId]) => {
            let name = titleCase(ingredientId);
            const subData = await getRecipe(repoPath, ingredientId);
            if (subData) {
              name = (subData.name as string) ?? titleCase(subData.id as string);
            }
            return { amount, unit, ingredientId, name };
          }
        )
      );
    }

    return c.json(data);
  });

  // POST /api/recipes/:id/ingredients — add ingredient to recipe
  app.post('/:id/ingredients', async (c) => {
    const id = c.req.param('id');
    const dir = await resolveRecipeDir(repoPath, id);
    const filePath = path.join(dir, `${id}.json`);

    const data = await getRecipe(repoPath, id);
    if (!data) {
      return c.json({ error: 'Recipe not found' }, 404);
    }

    const body = await c.req.json<{ ingredientId: string; amount: number; unit: string }>();

    if (!body.ingredientId || body.amount == null || !body.unit) {
      return c.json({ error: 'ingredientId, amount, and unit are required' }, 400);
    }

    if (!Array.isArray(data.ingredients)) {
      data.ingredients = [];
    }

    (data.ingredients as unknown[]).push([body.amount, body.unit, body.ingredientId]);
    await writeFile(filePath, JSON.stringify(data, null, 4) + '\n');

    return c.json({ ok: true });
  });

  return app;
}
