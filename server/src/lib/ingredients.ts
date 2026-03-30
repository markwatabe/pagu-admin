import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Looks up an ingredient by ID across both directories:
 *   - REPO/ingredients/          (in-house / made items)
 *   - REPO/purchasable_ingredients/  (purchased raw ingredients)
 *
 * Callers (recipes, menus, routes) don't need to know which type it is.
 */
export async function getIngredient(repoPath: string, id: string): Promise<Record<string, unknown> | null> {
  const dirs = [
    path.join(repoPath, 'ingredients'),
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
 * Lists all ingredients from both directories, merged into a single array.
 */
export async function listAllIngredients(repoPath: string): Promise<string[]> {
  const dirs = [
    path.join(repoPath, 'ingredients'),
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
 * Returns the directory path where an ingredient lives, or the default
 * (ingredients/) for new in-house items.
 */
export async function resolveIngredientDir(
  repoPath: string,
  id: string,
): Promise<string> {
  const purchasableDir = path.join(repoPath, 'purchasable_ingredients');
  const inHouseDir = path.join(repoPath, 'ingredients');

  try {
    await readFile(path.join(purchasableDir, `${id}.json`), 'utf-8');
    return purchasableDir;
  } catch {
    // default to in-house
  }

  return inHouseDir;
}
