import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Looks up a recipe/ingredient by ID across both directories:
 *   - master-data/recipes/                 (in-house / made items)
 *   - master-data/purchasable_ingredients/ (purchased raw ingredients)
 *
 * Callers (menus, routes) don't need to know which type it is.
 */
export async function getRecipe(repoPath: string, id: string): Promise<Record<string, unknown> | null> {
  const dirs = [
    path.join(repoPath, 'recipes'),
    path.join(repoPath, 'purchasable_ingredients'),
  ];

  for (const dir of dirs) {
    const filePath = path.join(dir, `${id}.json`);
    try {
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      // not in this directory, try next
    }
  }

  return null;
}

/**
 * Lists only in-house recipes from the recipes/ directory.
 */
export async function listRecipesOnly(repoPath: string): Promise<string[]> {
  const dir = path.join(repoPath, 'recipes');
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

/**
 * Lists all recipes/ingredients from both directories, merged into a single array.
 */
export async function listAllRecipes(repoPath: string): Promise<string[]> {
  const dirs = [
    path.join(repoPath, 'recipes'),
    path.join(repoPath, 'purchasable_ingredients'),
  ];

  const allFiles: string[] = [];

  for (const dir of dirs) {
    try {
      const files = await readdir(dir);
      allFiles.push(...files.filter((f) => f.endsWith('.json')));
    } catch {
      // directory might not exist yet
    }
  }

  return allFiles.sort();
}

/**
 * Returns the directory path where a recipe/ingredient lives, or the default
 * (recipes/) for new in-house items.
 */
export async function resolveRecipeDir(
  repoPath: string,
  id: string,
): Promise<string> {
  const purchasableDir = path.join(repoPath, 'purchasable_ingredients');
  const inHouseDir = path.join(repoPath, 'recipes');

  try {
    await readFile(path.join(purchasableDir, `${id}.json`), 'utf-8');
    return purchasableDir;
  } catch {
    // default to in-house
  }

  return inHouseDir;
}
