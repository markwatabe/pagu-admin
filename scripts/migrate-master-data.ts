/**
 * Master-data → InstantDB migration script.
 *
 * Reads JSON files from master-data/ and upserts them into InstantDB as
 * components, recipes, skus, dishes, menus, and design tokens.
 *
 * Uses deterministic UUID v5 so re-running is idempotent.
 *
 * Run:  pnpm exec tsx scripts/migrate-master-data.ts
 */

import 'dotenv/config';
import { init } from '@instantdb/admin';
import { v5 as uuidv5 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const MASTER = path.join(REPO_ROOT, 'master-data');

// ── InstantDB init ───────────────────────────────────────────────────────────

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing VITE_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// ── Deterministic IDs ────────────────────────────────────────────────────────

const SEED_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/** Stable ID for a given prefix + string key. */
function sid(prefix: string, key: string): string {
  return uuidv5(`${prefix}:${key}`, SEED_NAMESPACE);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readJsonDir<T = unknown>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as T);
}

/** Pretty name from UPPER_SNAKE_CASE id (fallback when no name field). */
function formatName(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Run an array of InstantDB transaction steps in batches. */
async function batchTransact(steps: unknown[], batchSize = 200) {
  for (let i = 0; i < steps.length; i += batchSize) {
    const batch = steps.slice(i, i + batchSize);
    await db.transact(batch as any);
  }
}

// ── Types for master-data files ──────────────────────────────────────────────

interface PurchasableIngredient {
  id: string;
  production_type: string;
  type?: string;
  unit?: string;
  name?: string;
  allergen?: boolean;
}

interface Recipe {
  id: string;
  production_type: string;
  ingredient_type?: string;
  name?: string;
  ingredients?: [number, string, string][];
  instructions?: string[];
  equipment?: string[];
}

interface SkuFile {
  id: string;
  asin?: string;
  name: string;
  url?: string;
  prices?: unknown[];
  brand?: string;
  quantity?: number;
  unit?: string;
  dimensions?: string;
  upc?: string;
  manufacturer?: string;
}

interface DishFile {
  id: string;
  name: string;
  description?: string;
  price?: number;
  section?: string;
  available?: boolean;
  components?: string[];
  instructions?: string[];
}

interface MenuFile {
  id: string;
  name: string;
  [key: string]: unknown;
}

// ── Migration steps ──────────────────────────────────────────────────────────

async function migrateComponents() {
  console.log('\n── 1. Components (purchasable ingredients) ─────────────────');

  const ingredients = readJsonDir<PurchasableIngredient>(
    path.join(MASTER, 'purchasable_ingredients'),
  );
  console.log(`  Found ${ingredients.length} purchasable ingredients`);

  const steps = ingredients.map((ing) =>
    (db.tx.components as any)[sid('comp', ing.id)].update({
      name: ing.name || formatName(ing.id),
      type: ing.type ?? null,
      allergen: ing.allergen ?? false,
    }),
  );

  await batchTransact(steps);
  console.log('  ✓ Components (purchasable) upserted');
}

async function migrateRecipes() {
  console.log('\n── 2. Components + Recipes (in-house) ──────────────────────');

  const recipes = readJsonDir<Recipe>(path.join(MASTER, 'recipes'));
  console.log(`  Found ${recipes.length} recipes`);

  // Each recipe also gets a component entry
  const componentSteps = recipes.map((r) =>
    (db.tx.components as any)[sid('comp', r.id)].update({
      name: r.name || formatName(r.id),
      type: r.ingredient_type ?? null,
      allergen: false,
    }),
  );
  await batchTransact(componentSteps);
  console.log('  ✓ Recipe components upserted');

  // Now create recipe entities with ingredient refs pointing to component UUIDs
  const recipeSteps = recipes.flatMap((r) => {
    const recipeId = sid('recipe', r.id);
    const componentId = sid('comp', r.id);

    const ingredients = (r.ingredients ?? []).map(([qty, unit, refId]) => ({
      qty,
      unit,
      componentId: sid('comp', refId),
    }));

    return [
      (db.tx.recipes as any)[recipeId].update({
        name: r.name || formatName(r.id),
        ingredients,
        instructions: r.instructions ?? [],
        equipment: r.equipment ?? [],
      }),
      // Link recipe -> component
      (db.tx.recipes as any)[recipeId].link({ component: componentId }),
    ];
  });

  await batchTransact(recipeSteps);
  console.log('  ✓ Recipes upserted and linked to components');
}

async function migrateSkus() {
  console.log('\n── 3. SKUs ─────────────────────────────────────────────────');

  const skus = readJsonDir<SkuFile>(path.join(MASTER, 'skus'));
  console.log(`  Found ${skus.length} SKUs`);

  // Build component lookup: UPPER_SNAKE_CASE id -> component UUID
  const ingredients = readJsonDir<PurchasableIngredient>(
    path.join(MASTER, 'purchasable_ingredients'),
  );
  const recipes = readJsonDir<Recipe>(path.join(MASTER, 'recipes'));

  const componentNameToId = new Map<string, string>();
  for (const ing of ingredients) {
    componentNameToId.set(ing.id.toUpperCase(), sid('comp', ing.id));
  }
  for (const r of recipes) {
    componentNameToId.set(r.id.toUpperCase(), sid('comp', r.id));
  }

  // Match SKU to component by searching for component name within the SKU name
  function findComponentForSku(sku: SkuFile): string | null {
    const skuNameUpper = sku.name.toUpperCase().replace(/[^A-Z0-9]/g, ' ');

    // Try to match component IDs against the SKU product name
    let bestMatch: string | null = null;
    let bestLength = 0;

    for (const [compId, compUuid] of componentNameToId) {
      // Convert component ID to words for matching, e.g. MAPLE_SYRUP -> "MAPLE SYRUP"
      const compWords = compId.replace(/_/g, ' ');
      if (skuNameUpper.includes(compWords) && compWords.length > bestLength) {
        bestMatch = compUuid;
        bestLength = compWords.length;
      }
    }
    return bestMatch;
  }

  const steps: unknown[] = [];
  let linked = 0;
  let unlinked = 0;

  for (const sku of skus) {
    const skuId = sid('sku', sku.id);

    steps.push(
      (db.tx.skus as any)[skuId].update({
        name: sku.name,
        url: sku.url ?? null,
        asin: sku.asin ?? null,
        brand: sku.brand ?? null,
        quantity: sku.quantity ?? null,
        unit: sku.unit ?? null,
        dimensions: sku.dimensions ?? null,
        upc: sku.upc ?? null,
        manufacturer: sku.manufacturer ?? null,
        prices: sku.prices ?? [],
      }),
    );

    const componentUuid = findComponentForSku(sku);
    if (componentUuid) {
      steps.push((db.tx.skus as any)[skuId].link({ component: componentUuid }));
      linked++;
    } else {
      unlinked++;
    }
  }

  await batchTransact(steps);
  console.log(`  ✓ SKUs upserted (${linked} linked, ${unlinked} unlinked)`);
}

async function migrateDishes() {
  console.log('\n── 4. Dishes ───────────────────────────────────────────────');

  const dishes = readJsonDir<DishFile>(path.join(MASTER, 'dishes'));
  console.log(`  Found ${dishes.length} dishes`);

  // Build component lookup for linking
  const ingredients = readJsonDir<PurchasableIngredient>(
    path.join(MASTER, 'purchasable_ingredients'),
  );
  const recipes = readJsonDir<Recipe>(path.join(MASTER, 'recipes'));

  const componentIdLookup = new Map<string, string>();
  for (const ing of ingredients) {
    componentIdLookup.set(ing.id.toLowerCase(), sid('comp', ing.id));
    componentIdLookup.set(ing.id.toUpperCase(), sid('comp', ing.id));
  }
  for (const r of recipes) {
    componentIdLookup.set(r.id.toLowerCase(), sid('comp', r.id));
    componentIdLookup.set(r.id.toUpperCase(), sid('comp', r.id));
  }

  const steps: unknown[] = [];

  for (const dish of dishes) {
    const dishId = sid('dish', dish.id);

    steps.push(
      (db.tx.dishes as any)[dishId].update({
        name: dish.name,
        description: dish.description ?? null,
        price: dish.price ?? null,
        section: dish.section ?? null,
        available: dish.available ?? true,
        instructions: dish.instructions ?? [],
      }),
    );

    // Link to components
    for (const compRef of dish.components ?? []) {
      // Try lowercase first (the format used in dish JSON), then UPPER_CASE
      const compUuid =
        componentIdLookup.get(compRef) ??
        componentIdLookup.get(compRef.toUpperCase());

      if (compUuid) {
        steps.push((db.tx.dishes as any)[dishId].link({ components: compUuid }));
      } else {
        console.warn(`    ⚠ Dish "${dish.name}": component "${compRef}" not found`);
      }
    }
  }

  await batchTransact(steps);
  console.log('  ✓ Dishes upserted and linked to components');
}

async function migrateMenus() {
  console.log('\n── 5. Menus ────────────────────────────────────────────────');

  const menus = readJsonDir<MenuFile>(path.join(MASTER, 'menus'));
  console.log(`  Found ${menus.length} menus`);

  const steps = menus.map((menu) => {
    const { id, name, ...layout } = menu;
    return (db.tx.menus as any)[sid('menu', menu.id)].update({
      name,
      layout,
    });
  });

  await batchTransact(steps);
  console.log('  ✓ Menus upserted');
}

async function migrateDesignTokens() {
  console.log('\n── 6. Design tokens ────────────────────────────────────────');

  const tokensPath = path.join(MASTER, 'design-tokens.json');
  if (!fs.existsSync(tokensPath)) {
    console.log('  ⚠ design-tokens.json not found, skipping');
    return;
  }

  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

  // Find the first org
  const { data } = await db.query({ orgs: {} });
  const orgs = data?.orgs ?? [];

  if (orgs.length === 0) {
    console.log('  ⚠ No orgs found — skipping designTokens');
    return;
  }

  const orgId = orgs[0].id;
  await db.transact([(db.tx.orgs as any)[orgId].update({ designTokens: tokens })]);
  console.log(`  ✓ Design tokens saved to org "${orgs[0].name}" (${orgId})`);
}

async function migratePhotoLinksAndCleanup() {
  console.log('\n── 7. Migrate photo links & clean up old entities ─────────');

  // Check if menuItems namespace exists by querying
  let menuItemsData: any[] = [];
  try {
    const result = await db.query({ menuItems: { photo: {} } });
    menuItemsData = (result.data as any)?.menuItems ?? [];
  } catch {
    console.log('  No menuItems entity found, skipping photo migration');
  }

  if (menuItemsData.length > 0) {
    console.log(`  Found ${menuItemsData.length} old menuItems`);

    // Build a lookup of dish name -> dish InstantDB ID
    const dishesResult = await db.query({ dishes: {} });
    const existingDishes = (dishesResult.data as any)?.dishes ?? [];
    const dishByName = new Map<string, string>();
    for (const d of existingDishes) {
      dishByName.set(d.name.toLowerCase(), d.id);
    }

    // Migrate photo links from menuItems to matching dishes
    const photoSteps: unknown[] = [];
    for (const mi of menuItemsData) {
      const photo = mi.photo;
      if (!photo) continue;

      const dishId = dishByName.get(mi.name?.toLowerCase());
      if (dishId) {
        photoSteps.push((db.tx.dishes as any)[dishId].link({ photo: photo.id }));
        console.log(`    Photo "${mi.name}" -> dish`);
      }
    }

    if (photoSteps.length > 0) {
      await batchTransact(photoSteps);
      console.log(`  ✓ Migrated ${photoSteps.length} photo links`);
    }

    // Delete old menuItems
    const deleteMenuItems = menuItemsData.map((mi: any) =>
      (db.tx.menuItems as any)[mi.id].delete(),
    );
    await batchTransact(deleteMenuItems);
    console.log(`  ✓ Deleted ${menuItemsData.length} old menuItems`);
  } else {
    console.log('  No old menuItems to clean up');
  }

  // Clean up old measuredIngredients
  let miData: any[] = [];
  try {
    const result = await db.query({ measuredIngredients: {} });
    miData = (result.data as any)?.measuredIngredients ?? [];
  } catch {
    console.log('  No measuredIngredients entity found');
  }

  if (miData.length > 0) {
    const deleteMi = miData.map((mi: any) =>
      (db.tx.measuredIngredients as any)[mi.id].delete(),
    );
    await batchTransact(deleteMi);
    console.log(`  ✓ Deleted ${miData.length} old measuredIngredients`);
  } else {
    console.log('  No old measuredIngredients to clean up');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Master-data → InstantDB migration');
  console.log('==================================');

  await migrateComponents();
  await migrateRecipes();
  await migrateSkus();
  await migrateDishes();
  await migrateMenus();
  await migrateDesignTokens();
  await migratePhotoLinksAndCleanup();

  console.log('\n✅ Migration complete!\n');
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
