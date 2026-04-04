# InstantDB Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all data from `master-data/` JSON files into InstantDB, rewrite server routes and frontend pages to use InstantDB, then delete the `master-data/` folder.

**Architecture:** New InstantDB schema with `components`, `recipes`, `skus`, `dishes`, `menus` entities (plus execution data stubs). Server routes rewritten to query InstantDB admin SDK instead of reading files. Frontend pages switched from REST `fetch()` to `db.useQuery()` / `db.transact()`. A migration script seeds all existing JSON data into InstantDB.

**Tech Stack:** InstantDB (`@instantdb/admin` server, `@instantdb/react` client), Hono (server), React + TypeScript (frontend), uuid v5 for deterministic migration IDs.

---

## File Structure

**Schema & Permissions (modify):**
- `instant.schema.ts` — New entities: `components`, `recipes`, `skus`, `dishes`, `menus`, `componentInstances`, `productionRecords`, `dishInstances`. Remove: `measuredIngredients`, `menuItems`. Add `designTokens` field to `orgs`.
- `instant.perms.ts` — Add permission rules for all new entities.

**Migration Script (create):**
- `scripts/migrate-master-data.ts` — Reads all JSON from `master-data/`, transforms, and writes to InstantDB. Also cleans up old `menuItems` and `measuredIngredients`.

**Server Routes (modify):**
- `server/src/routes/recipes.ts` — Rewrite to query `components` and `recipes` from InstantDB.
- `server/src/routes/dishes.ts` — Rewrite to query `dishes` from InstantDB.
- `server/src/routes/menus.ts` — Rewrite to query `menus` from InstantDB.
- `server/src/routes/skus.ts` — Rewrite to query `skus` from InstantDB.
- `server/src/routes/designTokens.ts` — Rewrite to read/write `designTokens` on the `orgs` entity.
- `server/src/routes/publicMenu.ts` — Update to query `dishes` instead of `menuItems`.
- `server/src/routes/chat.ts` — Remove `repoPath` param, update to use InstantDB.
- `server/src/routes/files.ts` — Update URL replacement to work with InstantDB `menus`.

**Server Libs (modify/delete):**
- `server/src/lib/agent-tools.ts` — Rewrite tools to use InstantDB instead of file system.
- `server/src/lib/recipes.ts` — Delete (no longer needed).
- `server/src/lib/git.ts` — Delete (no longer needed).

**Server Index (modify):**
- `server/src/index.ts` — Remove `repoPath`, update route registrations.

**Frontend Pages (modify):**
- `app/src/pages/DishesPage.tsx` — Switch from `menuItems` to `dishes` entity.
- `app/src/pages/DishPage.tsx` — Switch from `menuItems` to `dishes`, use `db.useQuery` for components instead of REST.
- `app/src/pages/RecipesPage.tsx` — Switch from REST to `db.useQuery`.
- `app/src/pages/RecipePage.tsx` — Switch from REST to `db.useQuery`.
- `app/src/pages/IngredientsPage.tsx` — Switch from REST to `db.useQuery`.
- `app/src/pages/SkusPage.tsx` — Switch from REST to `db.useQuery` / `db.transact`.
- `app/src/pages/LayoutEditorPage.tsx` — Switch menu fetching to `db.useQuery`, design tokens from org.
- `app/src/pages/MenuRenderPrintPage.tsx` — Switch to `db.useQuery`.
- `app/src/pages/TableTestPage.tsx` — Switch to `db.useQuery`.
- `app/src/components/print-layout/useDesignTokens.ts` — Rewrite to use org's `designTokens` field.
- `app/src/pages/PublicMenuPreviewPage.tsx` — Update if it references `menuItems`.

**Delete:**
- `master-data/` directory
- `server/src/lib/recipes.ts`
- `server/src/lib/git.ts`

---

### Task 1: Update InstantDB Schema

**Files:**
- Modify: `instant.schema.ts`

- [ ] **Step 1: Replace the schema with new entities**

Replace the entire contents of `instant.schema.ts`:

```typescript
// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/admin";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
      name: i.string().optional(),
      created_at: i.number().optional(),
      width: i.number().optional(),
      height: i.number().optional(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      avatarURL: i.string().optional(),
      is_admin: i.boolean().optional(),
      created_at: i.number().optional(),
      type: i.string().optional(),
    }),
    // -- Master Data --
    components: i.entity({
      name: i.string(),
      type: i.string().optional(),
      allergen: i.boolean().optional(),
    }),
    recipes: i.entity({
      name: i.string(),
      ingredients: i.json<{ qty: number; unit: string; componentId: string }[]>().optional(),
      instructions: i.json<string[]>().optional(),
      equipment: i.json<string[]>().optional(),
    }),
    skus: i.entity({
      name: i.string(),
      url: i.string().optional(),
      asin: i.string().optional(),
      brand: i.string().optional(),
      quantity: i.number().optional(),
      unit: i.string().optional(),
      dimensions: i.string().optional(),
      upc: i.string().optional(),
      manufacturer: i.string().optional(),
      prices: i.json<{ price: number; date: string; rating?: number; reviewCount?: number; isPrime?: boolean; availability?: string; delivery?: string }[]>().optional(),
    }),
    dishes: i.entity({
      name: i.string(),
      description: i.string().optional(),
      price: i.number().optional(),
      section: i.string().optional(),
      available: i.boolean().optional(),
      instructions: i.json<string[]>().optional(),
    }),
    menus: i.entity({
      name: i.string(),
      layout: i.json<unknown>().optional(),
    }),
    orgs: i.entity({
      name: i.string(),
      created_at: i.number().optional(),
      designTokens: i.json<Record<string, string>>().optional(),
    }),
    orgRoles: i.entity({
      role: i.string(),
      created_at: i.number().optional(),
    }),
    events: i.entity({
      name: i.string(),
      type: i.string(),
      date: i.number(),
      revenue: i.number(),
      guests: i.number(),
      notes: i.string().optional(),
    }),
    reviews: i.entity({
      author: i.string().optional(),
      body: i.string().optional(),
      createdAt: i.string().optional(),
      rating: i.number().optional(),
      replied: i.boolean().optional(),
      source: i.string().optional(),
    }),
    // -- Execution Data (stubs) --
    componentInstances: i.entity({
      created_at: i.number().optional(),
    }),
    productionRecords: i.entity({
      created_at: i.number().optional(),
    }),
    dishInstances: i.entity({
      created_at: i.number().optional(),
    }),
  },
  links: {
    // -- System links --
    $filesUploadedBy: {
      forward: { on: "$files", has: "one", label: "uploadedBy" },
      reverse: { on: "$users", has: "many", label: "$files" },
    },
    $streams$files: {
      forward: { on: "$streams", has: "many", label: "$files" },
      reverse: { on: "$files", has: "one", label: "$stream", onDelete: "cascade" },
    },
    $usersLinkedPrimaryUser: {
      forward: { on: "$users", has: "one", label: "linkedPrimaryUser", onDelete: "cascade" },
      reverse: { on: "$users", has: "many", label: "linkedGuestUsers" },
    },
    // -- Org links --
    orgRolesOrg: {
      forward: { on: "orgRoles", has: "one", label: "org" },
      reverse: { on: "orgs", has: "many", label: "roles" },
    },
    orgRolesUser: {
      forward: { on: "orgRoles", has: "one", label: "user" },
      reverse: { on: "$users", has: "many", label: "orgRoles" },
    },
    orgsLogo: {
      forward: { on: "orgs", has: "one", label: "logo" },
      reverse: { on: "$files", has: "many", label: "logoForOrgs" },
    },
    eventsOrg: {
      forward: { on: "events", has: "one", label: "org" },
      reverse: { on: "orgs", has: "many", label: "events" },
    },
    // -- Master Data links --
    recipesComponent: {
      forward: { on: "recipes", has: "one", label: "component" },
      reverse: { on: "components", has: "many", label: "recipes" },
    },
    skusComponent: {
      forward: { on: "skus", has: "one", label: "component" },
      reverse: { on: "components", has: "many", label: "skus" },
    },
    dishesComponents: {
      forward: { on: "dishes", has: "many", label: "components" },
      reverse: { on: "components", has: "many", label: "dishes" },
    },
    menusDishes: {
      forward: { on: "menus", has: "many", label: "dishes" },
      reverse: { on: "dishes", has: "many", label: "menus" },
    },
    dishesPhoto: {
      forward: { on: "dishes", has: "one", label: "photo" },
      reverse: { on: "$files", has: "many", label: "dishPhotos" },
    },
    // -- Execution Data links --
    componentInstancesComponent: {
      forward: { on: "componentInstances", has: "one", label: "component" },
      reverse: { on: "components", has: "many", label: "instances" },
    },
    componentInstancesSku: {
      forward: { on: "componentInstances", has: "one", label: "sku" },
      reverse: { on: "skus", has: "many", label: "instances" },
    },
    componentInstancesProductionRecord: {
      forward: { on: "componentInstances", has: "one", label: "productionRecord" },
      reverse: { on: "productionRecords", has: "one", label: "componentInstance" },
    },
    dishInstancesDish: {
      forward: { on: "dishInstances", has: "one", label: "dish" },
      reverse: { on: "dishes", has: "many", label: "instances" },
    },
    dishInstancesComponentInstances: {
      forward: { on: "dishInstances", has: "many", label: "componentInstances" },
      reverse: { on: "componentInstances", has: "many", label: "dishInstances" },
    },
  },
  rooms: {},
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
```

- [ ] **Step 2: Push the schema**

```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin && pnpm exec instant-cli push schema
```

Expected: Schema pushed successfully. If prompted to confirm destructive changes (removing `menuItems`, `measuredIngredients`), confirm yes.

- [ ] **Step 3: Commit**

```bash
git add instant.schema.ts && git commit -m "feat: update InstantDB schema for master-data migration"
```

---

### Task 2: Update Permissions

**Files:**
- Modify: `instant.perms.ts`

- [ ] **Step 1: Add permissions for new entities**

Replace the contents of `instant.perms.ts`:

```typescript
import type { InstantRules } from "@instantdb/react";

const rules = {
  $files: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  $users: {
    allow: {
      view: "true",
      update: "auth.id == data.id",
    },
  },
  orgs: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  events: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  orgRoles: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  components: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  recipes: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  skus: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  dishes: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  menus: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  componentInstances: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  productionRecords: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  dishInstances: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  reviews: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
} satisfies InstantRules;

export default rules;
```

- [ ] **Step 2: Push the permissions**

```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin && pnpm exec instant-cli push perms
```

- [ ] **Step 3: Commit**

```bash
git add instant.perms.ts && git commit -m "feat: add permissions for new InstantDB entities"
```

---

### Task 3: Write Migration Script

**Files:**
- Create: `scripts/migrate-master-data.ts`

This script reads all JSON files from `master-data/`, creates InstantDB entities, and links them. It uses deterministic UUIDs so re-running is safe.

- [ ] **Step 1: Create the migration script**

```typescript
import { init } from '@instantdb/admin';
import { v5 as uuidv5 } from 'uuid';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing VITE_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const SEED_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
function sid(prefix: string, key: string): string {
  return uuidv5(`${prefix}:${key}`, SEED_NS);
}

const MASTER = path.resolve(import.meta.dirname ?? '.', '..', 'master-data');

async function readJsonDir(dir: string): Promise<Record<string, unknown>[]> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const results: Record<string, unknown>[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await readFile(path.join(dir, f), 'utf-8');
    results.push(JSON.parse(raw));
  }
  return results;
}

async function migrate() {
  // ── 1. Read all source data ──
  const purchasableIngredients = await readJsonDir(path.join(MASTER, 'purchasable_ingredients'));
  const recipesRaw = await readJsonDir(path.join(MASTER, 'recipes'));
  const dishesRaw = await readJsonDir(path.join(MASTER, 'dishes'));
  const menusRaw = await readJsonDir(path.join(MASTER, 'menus'));
  const skusRaw = await readJsonDir(path.join(MASTER, 'skus'));

  console.log(`Found: ${purchasableIngredients.length} purchasable ingredients, ${recipesRaw.length} recipes, ${dishesRaw.length} dishes, ${menusRaw.length} menus, ${skusRaw.length} skus`);

  // ── 2. Create components from purchasable ingredients ──
  console.log('Creating components from purchasable ingredients...');
  const compTxns = purchasableIngredients.map((ing) => {
    const id = ing.id as string;
    return db.tx.components[sid('comp', id)].update({
      name: (ing.name as string) ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      type: (ing.type as string) ?? (ing.ingredient_type as string) ?? null,
      allergen: (ing.allergen as boolean) ?? false,
    });
  });
  if (compTxns.length > 0) await db.transact(compTxns);

  // ── 3. Create components + recipes from recipe files ──
  console.log('Creating components and recipes from recipe files...');
  const recipeCompTxns = recipesRaw.map((r) => {
    const id = r.id as string;
    return db.tx.components[sid('comp', id)].update({
      name: (r.name as string) ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      type: (r.ingredient_type as string) ?? null,
      allergen: false,
    });
  });
  if (recipeCompTxns.length > 0) await db.transact(recipeCompTxns);

  const recipeTxns = recipesRaw.flatMap((r) => {
    const id = r.id as string;
    const rawIngredients = (r.ingredients ?? []) as [number, string, string][];
    const ingredients = rawIngredients.map(([qty, unit, componentId]) => ({
      qty,
      unit,
      componentId: sid('comp', componentId),
    }));

    const recipeId = sid('recipe', id);
    return [
      db.tx.recipes[recipeId].update({
        name: (r.name as string) ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        ingredients,
        instructions: (r.instructions as string[]) ?? [],
        equipment: (r.equipment as string[]) ?? [],
      }),
      db.tx.recipes[recipeId].link({ component: sid('comp', id) }),
    ];
  });
  if (recipeTxns.length > 0) await db.transact(recipeTxns);

  // ── 4. Create SKUs and link to components by name match ──
  console.log('Creating SKUs...');

  // Build a map of component name (lowercase) -> component seed ID
  const allComponentNames = new Map<string, string>();
  for (const ing of purchasableIngredients) {
    const id = ing.id as string;
    const name = ((ing.name as string) ?? id.replace(/_/g, ' ')).toLowerCase();
    allComponentNames.set(name, sid('comp', id));
  }
  for (const r of recipesRaw) {
    const id = r.id as string;
    const name = ((r.name as string) ?? id.replace(/_/g, ' ')).toLowerCase();
    allComponentNames.set(name, sid('comp', id));
  }

  for (const sku of skusRaw) {
    const asin = sku.asin as string;
    if (!asin) continue;
    const skuId = sid('sku', asin);
    const skuTxns: any[] = [
      db.tx.skus[skuId].update({
        name: (sku.name as string) ?? '',
        url: (sku.url as string) ?? null,
        asin,
        brand: (sku.brand as string) ?? null,
        quantity: (sku.quantity as number) ?? null,
        unit: (sku.unit as string) ?? null,
        dimensions: (sku.dimensions as string) ?? null,
        upc: (sku.upc as string) ?? null,
        manufacturer: (sku.manufacturer as string) ?? null,
        prices: (sku.prices as unknown[]) ?? [],
      }),
    ];

    // Try to match SKU to a component by checking if any component name appears in the SKU name
    const skuNameLower = ((sku.name as string) ?? '').toLowerCase();
    for (const [compName, compId] of allComponentNames) {
      if (skuNameLower.includes(compName) || compName.includes(skuNameLower.split(' ')[0])) {
        skuTxns.push(db.tx.skus[skuId].link({ component: compId }));
        break;
      }
    }

    await db.transact(skuTxns);
  }

  // ── 5. Create dishes ──
  console.log('Creating dishes...');
  const dishTxns = dishesRaw.flatMap((d) => {
    const id = d.id as string;
    const dishId = sid('dish', id);
    const txns: any[] = [
      db.tx.dishes[dishId].update({
        name: (d.name as string) ?? id,
        description: (d.description as string) ?? null,
        price: (d.price as number) ?? null,
        section: (d.section as string) ?? null,
        available: (d.available as boolean) ?? true,
        instructions: (d.instructions as string[]) ?? null,
      }),
    ];

    // Link dish to components
    const componentIds = (d.components ?? []) as string[];
    for (const compRefId of componentIds) {
      // Component IDs in dishes reference the old string IDs (lowercase with underscores)
      // Try to find matching component
      const compSeedId = sid('comp', compRefId.toUpperCase());
      txns.push(db.tx.dishes[dishId].link({ components: compSeedId }));
    }

    return txns;
  });
  if (dishTxns.length > 0) await db.transact(dishTxns);

  // ── 6. Create menus ──
  console.log('Creating menus...');
  const menuTxns = menusRaw.map((m) => {
    const id = m.id as string;
    const { id: _id, name, ...layout } = m;
    return db.tx.menus[sid('menu', id)].update({
      name: (name as string) ?? id,
      layout,
    });
  });
  if (menuTxns.length > 0) await db.transact(menuTxns);

  // ── 7. Migrate design tokens to org ──
  console.log('Migrating design tokens to org...');
  try {
    const tokensRaw = await readFile(path.join(MASTER, 'design-tokens.json'), 'utf-8');
    const tokens = JSON.parse(tokensRaw);
    const { orgs } = await db.query({ orgs: {} });
    if (orgs.length > 0) {
      await db.transact([db.tx.orgs[orgs[0].id].update({ designTokens: tokens })]);
      console.log(`Design tokens saved to org "${orgs[0].name}"`);
    } else {
      console.warn('No org found — skipping design tokens migration');
    }
  } catch (err) {
    console.warn('Could not migrate design tokens:', err);
  }

  // ── 8. Clean up old entities ──
  console.log('Cleaning up old menuItems and measuredIngredients...');
  try {
    const { menuItems } = await db.query({ menuItems: {} });
    if (menuItems && menuItems.length > 0) {
      // Migrate existing menuItems photo links to dishes before deleting
      // First, check if any menuItems have photos we need to preserve
      const { menuItems: itemsWithPhotos } = await db.query({ menuItems: { photo: {} } });
      if (itemsWithPhotos) {
        for (const item of itemsWithPhotos) {
          // Try to find a matching dish by name
          const { dishes: matchingDishes } = await db.query({
            dishes: { $: { where: { name: item.name } } },
          });
          const photo = Array.isArray(item.photo) ? item.photo[0] : item.photo;
          if (matchingDishes?.length > 0 && photo?.id) {
            await db.transact([db.tx.dishes[matchingDishes[0].id].link({ photo: photo.id })]);
            console.log(`  Migrated photo for "${item.name}" to dish`);
          }
        }
      }

      await db.transact(menuItems.map((mi: any) => db.tx.menuItems[mi.id].delete()));
      console.log(`  Deleted ${menuItems.length} menuItems`);
    }
  } catch (err) {
    console.log('  menuItems cleanup skipped (entity may not exist):', (err as Error).message);
  }

  try {
    const { measuredIngredients } = await db.query({ measuredIngredients: {} });
    if (measuredIngredients && measuredIngredients.length > 0) {
      await db.transact(measuredIngredients.map((mi: any) => db.tx.measuredIngredients[mi.id].delete()));
      console.log(`  Deleted ${measuredIngredients.length} measuredIngredients`);
    }
  } catch (err) {
    console.log('  measuredIngredients cleanup skipped:', (err as Error).message);
  }

  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the migration**

```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin && pnpm exec tsx scripts/migrate-master-data.ts
```

Expected output: Counts for each entity type, "Migration complete!"

- [ ] **Step 3: Verify data in InstantDB**

Open the InstantDB dashboard and check that components, recipes, skus, dishes, menus entities have data. Verify a few links (e.g. a recipe links to its component, a dish links to its components).

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-master-data.ts && git commit -m "feat: add master-data to InstantDB migration script"
```

---

### Task 4: Rewrite Server Index and Remove repoPath

**Files:**
- Modify: `server/src/index.ts`
- Delete: `server/src/lib/recipes.ts`
- Delete: `server/src/lib/git.ts`

- [ ] **Step 1: Update server/src/index.ts**

Replace the contents of `server/src/index.ts`:

```typescript
import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { recipeRoutes } from './routes/recipes.js';
import { dishRoutes } from './routes/dishes.js';
import { menuRoutes } from './routes/menus.js';
import { designTokenRoutes } from './routes/designTokens.js';
import { chatRoutes } from './routes/chat.js';
import { skuRoutes } from './routes/skus.js';
import { publicMenuRoutes } from './routes/publicMenu.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = new Hono();

if (!isProduction) {
  app.use('/api/*', cors({ origin: 'http://localhost:5173' }));
}

app.route('/api/recipes', recipeRoutes());
app.route('/api/dishes', dishRoutes());
app.route('/api/menus', menuRoutes());
app.route('/api/design-tokens', designTokenRoutes());
app.route('/api/chat', chatRoutes());
app.route('/api/skus', skuRoutes());
app.route('/api/public', publicMenuRoutes());

// In production, serve the built frontend
if (isProduction) {
  const distPath = path.resolve(__dirname, '..', '..', 'app', 'dist');
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), distPath) + '/' }));
  // SPA fallback: serve index.html for non-API, non-static routes
  app.get('*', async (c) => {
    const html = await readFile(path.join(distPath, 'index.html'), 'utf-8');
    return c.html(html);
  });
}

const port = parseInt(process.env.PORT ?? '3001', 10);
console.log(`Server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
```

Note: `fileRoutes` is removed — URL replacement in menu layouts will be handled differently now that menus are in InstantDB.

- [ ] **Step 2: Delete server/src/lib/recipes.ts and server/src/lib/git.ts**

```bash
rm /Users/markwatabe/Documents/GitHub/pagu-admin/server/src/lib/recipes.ts /Users/markwatabe/Documents/GitHub/pagu-admin/server/src/lib/git.ts
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts && git rm server/src/lib/recipes.ts server/src/lib/git.ts && git commit -m "refactor: remove repoPath and file-based libs from server"
```

---

### Task 5: Rewrite Recipes Route

**Files:**
- Modify: `server/src/routes/recipes.ts`

The recipes route now queries `components` and `recipes` from InstantDB. The `/api/recipes` endpoint returns components (what was previously "list all recipes/ingredients"). The `/api/recipes/:id` endpoint returns a component with its linked recipes.

- [ ] **Step 1: Rewrite recipes.ts**

```typescript
import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function recipeRoutes() {
  const app = new Hono();

  // GET /api/recipes — list all components (replaces old list of recipes + purchasable ingredients)
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
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/recipes.ts && git commit -m "refactor: rewrite recipes route to use InstantDB"
```

---

### Task 6: Rewrite Dishes Route

**Files:**
- Modify: `server/src/routes/dishes.ts`

- [ ] **Step 1: Rewrite dishes.ts**

```typescript
import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function dishRoutes() {
  const app = new Hono();

  // GET /api/dishes — list all dishes
  app.get('/', async (c) => {
    const { dishes } = await db.query({ dishes: { photo: {}, components: {} } });
    const items = (dishes ?? [])
      .sort((a, b) =>
        (a.section ?? '').localeCompare(b.section ?? '') ||
        a.name.localeCompare(b.name)
      );
    return c.json(items);
  });

  // GET /api/dishes/:id — single dish with components
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const { dishes } = await db.query({
      dishes: { $: { where: { id } }, components: { recipes: {} }, photo: {} },
    });

    const dish = dishes?.[0];
    if (!dish) return c.json({ error: 'Dish not found' }, 404);

    return c.json(dish);
  });

  return app;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/dishes.ts && git commit -m "refactor: rewrite dishes route to use InstantDB"
```

---

### Task 7: Rewrite Menus Route

**Files:**
- Modify: `server/src/routes/menus.ts`

- [ ] **Step 1: Rewrite menus.ts**

```typescript
import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function menuRoutes() {
  const app = new Hono();

  // GET /api/menus — list all menus
  app.get('/', async (c) => {
    const { menus } = await db.query({ menus: {} });
    const items = (menus ?? [])
      .map((m) => ({ id: m.id, name: m.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return c.json(items);
  });

  // GET /api/menus/:id — single menu with full layout
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const { menus } = await db.query({
      menus: { $: { where: { id } }, dishes: {} },
    });

    const menu = menus?.[0];
    if (!menu) return c.json({ error: 'Menu not found' }, 404);

    return c.json({
      id: menu.id,
      name: menu.name,
      layout: menu.layout,
      dishes: menu.dishes ?? [],
    });
  });

  // PUT /api/menus/:id — save layout
  app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<{ name?: string; layout?: unknown }>();

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.layout !== undefined) update.layout = body.layout;

    await db.transact([db.tx.menus[id].update(update)]);
    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/menus.ts && git commit -m "refactor: rewrite menus route to use InstantDB"
```

---

### Task 8: Rewrite SKUs Route

**Files:**
- Modify: `server/src/routes/skus.ts`

- [ ] **Step 1: Rewrite skus.ts**

```typescript
import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';
import { id as instantId } from '@instantdb/admin';

export function skuRoutes() {
  const app = new Hono();

  // GET /api/skus — list all SKUs
  app.get('/', async (c) => {
    const { skus } = await db.query({ skus: { component: {} } });
    const items = (skus ?? [])
      .map((sku) => ({
        id: sku.id,
        name: sku.name,
        url: sku.url,
        asin: sku.asin,
        brand: sku.brand,
        quantity: sku.quantity,
        unit: sku.unit,
        latestPrice: Array.isArray(sku.prices) && sku.prices.length > 0
          ? (sku.prices as any[])[(sku.prices as any[]).length - 1].price
          : null,
        latestDate: Array.isArray(sku.prices) && sku.prices.length > 0
          ? (sku.prices as any[])[(sku.prices as any[]).length - 1].date
          : null,
        component: Array.isArray(sku.component) ? sku.component[0] ?? null : sku.component ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return c.json(items);
  });

  // POST /api/skus — create a new SKU
  app.post('/', async (c) => {
    const body = await c.req.json<{
      name: string;
      url?: string;
      asin?: string;
      brand?: string;
      quantity?: number;
      unit?: string;
      componentId?: string;
    }>();

    if (!body.name) {
      return c.json({ error: 'name is required' }, 400);
    }

    const newId = instantId();
    const txns: any[] = [
      db.tx.skus[newId].update({
        name: body.name,
        url: body.url ?? null,
        asin: body.asin ?? null,
        brand: body.brand ?? null,
        quantity: body.quantity ?? null,
        unit: body.unit ?? null,
        prices: [],
      }),
    ];

    if (body.componentId) {
      txns.push(db.tx.skus[newId].link({ component: body.componentId }));
    }

    await db.transact(txns);
    return c.json({ ok: true, id: newId });
  });

  // DELETE /api/skus/:id — delete a SKU
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await db.transact([db.tx.skus[id].delete()]);
    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/skus.ts && git commit -m "refactor: rewrite skus route to use InstantDB"
```

---

### Task 9: Rewrite Design Tokens Route

**Files:**
- Modify: `server/src/routes/designTokens.ts`

- [ ] **Step 1: Rewrite designTokens.ts**

```typescript
import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function designTokenRoutes() {
  const app = new Hono();

  // GET /api/design-tokens — read from first org's designTokens field
  app.get('/', async (c) => {
    const { orgs } = await db.query({ orgs: {} });
    const org = orgs?.[0];
    return c.json(org?.designTokens ?? {});
  });

  // PUT /api/design-tokens ��� save to first org's designTokens field
  app.put('/', async (c) => {
    const body = await c.req.json();
    const { orgs } = await db.query({ orgs: {} });
    const org = orgs?.[0];

    if (!org) {
      return c.json({ error: 'No org found' }, 404);
    }

    await db.transact([db.tx.orgs[org.id].update({ designTokens: body })]);
    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/designTokens.ts && git commit -m "refactor: rewrite design tokens route to use org entity"
```

---

### Task 10: Rewrite Public Menu Route

**Files:**
- Modify: `server/src/routes/publicMenu.ts`

- [ ] **Step 1: Rewrite publicMenu.ts**

```typescript
import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function publicMenuRoutes() {
  const app = new Hono();

  // Public endpoint — no auth required
  app.get('/menu-items', async (c) => {
    const { dishes } = await db.query({ dishes: { photo: {} } });
    const items = (dishes ?? [])
      .filter((d: any) => d.available)
      .sort((a: any, b: any) =>
        (a.section ?? '').localeCompare(b.section ?? '') ||
        (a.name ?? '').localeCompare(b.name ?? '')
      )
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        section: d.section,
        price: d.price,
        photo: Array.isArray(d.photo) ? d.photo[0]?.url ?? null : d.photo?.url ?? null,
      }));

    return c.json(items);
  });

  return app;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/publicMenu.ts && git commit -m "refactor: public menu route queries dishes instead of menuItems"
```

---

### Task 11: Rewrite Chat Route and Agent Tools

**Files:**
- Modify: `server/src/routes/chat.ts`
- Modify: `server/src/lib/agent-tools.ts`

- [ ] **Step 1: Rewrite agent-tools.ts**

```typescript
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { db } from './instantdb.js';
import { id as instantId } from '@instantdb/admin';

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'list_components',
    description: 'List all components (ingredients and recipe items) in the database',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_component',
    description: 'Read a component with its recipes and SKUs',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Component UUID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_component',
    description: 'Create a new component with an optional recipe',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Component name' },
        type: { type: 'string', description: 'Component type (e.g. sauce, protein, nut)' },
        allergen: { type: 'boolean', description: 'Whether this is a common allergen' },
        recipe: {
          type: 'object',
          description: 'Optional recipe for this component',
          properties: {
            name: { type: 'string' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  qty: { type: 'number' },
                  unit: { type: 'string' },
                  componentId: { type: 'string' },
                },
              },
            },
            instructions: { type: 'array', items: { type: 'string' } },
            equipment: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['name'],
    },
  },
];

export async function executeToolCall(
  toolName: string,
  input: Record<string, any>,
): Promise<string> {
  switch (toolName) {
    case 'list_components': {
      const { components } = await db.query({ components: { recipes: {} } });
      return JSON.stringify(
        (components ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          hasRecipe: Array.isArray(c.recipes) && c.recipes.length > 0,
        }))
      );
    }
    case 'read_component': {
      const { components } = await db.query({
        components: { $: { where: { id: input.id } }, recipes: {}, skus: {} },
      });
      const comp = components?.[0];
      if (!comp) return `Component not found: ${input.id}`;
      return JSON.stringify(comp, null, 2);
    }
    case 'create_component': {
      const compId = instantId();
      const txns: any[] = [
        db.tx.components[compId].update({
          name: input.name,
          type: input.type ?? null,
          allergen: input.allergen ?? false,
        }),
      ];

      if (input.recipe) {
        const recipeId = instantId();
        txns.push(
          db.tx.recipes[recipeId].update({
            name: input.recipe.name ?? input.name,
            ingredients: input.recipe.ingredients ?? [],
            instructions: input.recipe.instructions ?? [],
            equipment: input.recipe.equipment ?? [],
          }),
          db.tx.recipes[recipeId].link({ component: compId }),
        );
      }

      await db.transact(txns);
      return JSON.stringify({ ok: true, id: compId });
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
```

- [ ] **Step 2: Update chat.ts to remove repoPath**

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_TOOLS, executeToolCall } from '../lib/agent-tools.js';

const SYSTEM_PROMPT = `You are Pagu Assistant, an AI helper for the Pagu restaurant admin dashboard.
You help manage components and recipes in the restaurant's database. You can list, read, and create components.
Components are ingredients or items that can have recipes (if made in-house) or SKUs (if purchased).
Be concise and helpful.`;

const MAX_AGENT_ITERATIONS = 10;

export function chatRoutes() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set — chat endpoint will fail');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const app = new Hono();

  app.post('/', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let messages: Anthropic.MessageParam[];
    try {
      const body = await c.req.json<{ messages: Anthropic.MessageParam[] }>();
      messages = body.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        return c.json({ error: 'messages must be a non-empty array' }, 400);
      }
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    return streamSSE(c, async (stream) => {
      try {
        let currentMessages = [...messages];

        for (let i = 0; i < MAX_AGENT_ITERATIONS; i++) {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages: currentMessages,
          });

          for (const block of response.content) {
            if (block.type === 'text') {
              await stream.writeSSE({ data: JSON.stringify({ type: 'text', text: block.text }) });
            } else if (block.type === 'tool_use') {
              await stream.writeSSE({
                data: JSON.stringify({ type: 'tool_use', name: block.name, input: block.input }),
              });
            }
          }

          if (response.stop_reason !== 'tool_use') {
            await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) });
            return;
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type === 'tool_use') {
              const result = await executeToolCall(
                block.name,
                block.input as Record<string, any>,
              );
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });

              await stream.writeSSE({
                data: JSON.stringify({ type: 'tool_result', name: block.name, result }),
              });
            }
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ];
        }

        await stream.writeSSE({
          data: JSON.stringify({ type: 'error', message: 'Agent reached maximum iteration limit' }),
        });
      } catch (err) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'error',
            message: err instanceof Error ? err.message : 'Internal error',
          }),
        });
      }
    });
  });

  return app;
}
```

- [ ] **Step 3: Delete server/src/routes/files.ts**

The URL replacement utility is no longer needed since menus are in InstantDB.

```bash
rm /Users/markwatabe/Documents/GitHub/pagu-admin/server/src/routes/files.ts
```

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/agent-tools.ts server/src/routes/chat.ts && git rm server/src/routes/files.ts && git commit -m "refactor: rewrite chat/agent-tools for InstantDB, remove files route"
```

---

### Task 12: Update Frontend — DishesPage

**Files:**
- Modify: `app/src/pages/DishesPage.tsx`

DishesPage currently queries `menuItems` — switch to `dishes`.

- [ ] **Step 1: Update DishesPage.tsx**

Change the query and all references from `menuItems` to `dishes`:

In `DishesPage.tsx`, replace:
```typescript
  const { isLoading, error, data } = db.useQuery({ menuItems: { photo: {} } });
```
with:
```typescript
  const { isLoading, error, data } = db.useQuery({ dishes: { photo: {} } });
```

Replace:
```typescript
  const dishes = [...(data?.menuItems ?? [])]
```
with:
```typescript
  const dishes = [...(data?.dishes ?? [])]
```

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/DishesPage.tsx && git commit -m "refactor: DishesPage queries dishes instead of menuItems"
```

---

### Task 13: Update Frontend — DishPage

**Files:**
- Modify: `app/src/pages/DishPage.tsx`

DishPage needs to: query `dishes` instead of `menuItems`, use InstantDB for components instead of REST fetch, and update all `db.tx.menuItems` to `db.tx.dishes`.

- [ ] **Step 1: Update DishPage.tsx**

Replace the `ComponentPicker` component's fetch with InstantDB query. Replace:
```typescript
  useEffect(() => {
    if (!open || allItems.length > 0) return;
    setLoading(true);
    fetch('/api/recipes/all')
      .then((r) => r.json())
      .then(setAllItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);
```
with:
```typescript
  useEffect(() => {
    if (!open || allItems.length > 0) return;
    setLoading(true);
    fetch('/api/recipes')
      .then((r) => r.json())
      .then(setAllItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);
```

Update the `ComponentInfo` interface:
```typescript
interface ComponentInfo {
  id: string;
  name: string;
  type?: string;
  allergen?: boolean;
  hasRecipe?: boolean;
}
```

Update the `ComponentPicker` badge rendering — replace `production_type` references:
```typescript
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              item.hasRecipe
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {item.hasRecipe ? 'Recipe' : 'Purchased'}
            </span>
            {item.type && (
              <span className="text-xs text-gray-400">{item.type}</span>
            )}
```

Update the main query — replace:
```typescript
  const { isLoading, error, data } = db.useQuery({
    menuItems: { $: { where: { id } }, photo: {} },
  });
```
with:
```typescript
  const { isLoading, error, data } = db.useQuery({
    dishes: { $: { where: { id } }, photo: {}, components: {} },
  });
```

Replace:
```typescript
  const dish = data?.menuItems?.[0];
  const componentIds = (dish?.components ?? []) as string[];
```
with:
```typescript
  const dish = data?.dishes?.[0];
```

Remove the entire `components` state and `useEffect` that fetches from `/api/recipes/:id` (lines ~126-156), since components now come from the query directly.

Update the `components` variable to use the query data:
```typescript
  const components = (dish?.components ?? []) as ComponentInfo[];
```

Replace all `db.tx.menuItems` with `db.tx.dishes`:
- `db.tx.menuItems[id].link({ photo: result.id })` → `db.tx.dishes[id!].link({ photo: result.id })`
- `db.tx.menuItems[id].unlink({ photo: linkedPhoto.id })` → `db.tx.dishes[id!].unlink({ photo: linkedPhoto.id })`

Update `handleAddComponent` to use link instead of updating a JSON array:
```typescript
  function handleAddComponent(componentId: string) {
    if (!id) return;
    db.transact([db.tx.dishes[id].link({ components: componentId })]);
  }
```

Update `handleRemoveComponent` to use unlink:
```typescript
  function handleRemoveComponent(componentId: string) {
    if (!id) return;
    db.transact([db.tx.dishes[id].unlink({ components: componentId })]);
  }
```

Update component list rendering — replace `production_type` badges in the component list with `hasRecipe`-based badges (same pattern as ComponentPicker above). Replace `comp.ingredient_type ?? comp.type` with `comp.type`.

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/DishPage.tsx && git commit -m "refactor: DishPage uses InstantDB dishes entity with component links"
```

---

### Task 14: Update Frontend — RecipesPage and IngredientsPage

**Files:**
- Modify: `app/src/pages/RecipesPage.tsx`
- Modify: `app/src/pages/IngredientsPage.tsx`

These pages fetch from `/api/recipes` and display lists. The API response shape is changing (no more `production_type`/`ingredient_type`, now `type`/`allergen`/`hasRecipe`). Update to match.

- [ ] **Step 1: Read current RecipesPage.tsx and IngredientsPage.tsx**

Read both files to understand the current rendering logic before making changes. Update any references to `production_type`, `ingredient_type`, `hasRecipe` (old boolean based on ingredients array) to match the new API shape where `hasRecipe` is based on linked recipes.

The fetch URLs remain the same (`/api/recipes`) since the server route still serves at that path — but the response shape changes. Update any type interfaces and rendering accordingly.

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/RecipesPage.tsx app/src/pages/IngredientsPage.tsx && git commit -m "refactor: update RecipesPage and IngredientsPage for new component data shape"
```

---

### Task 15: Update Frontend — RecipePage

**Files:**
- Modify: `app/src/pages/RecipePage.tsx`

RecipePage currently fetches a single recipe via REST. It needs to be updated to work with the new component + recipe structure. A component can have multiple recipes — RecipePage should show the component and its recipes.

- [ ] **Step 1: Update RecipePage.tsx**

The page fetches `/api/recipes/:id` which now returns a component with its linked recipes. Update the interfaces and rendering:

- The response now has `{ id, name, type, allergen, recipes: [...], skus: [...] }` instead of `{ id, name, ingredients: [...], instructions: [...] }`
- Each recipe in `recipes` array has `{ id, name, ingredients, instructions, equipment }`
- The `ingredients` array items are now `{ qty, unit, componentId }` objects instead of `{ amount, unit, ingredientId, name }`
- Ingredient names won't be resolved server-side anymore — the RecipePage can fetch component names client-side or display componentIds

Update the `AddIngredientForm` — this now adds to a recipe, not directly to the component. The form needs to know which recipe to add to.

Update the batch size table to work with the new ingredient format (`qty` instead of `amount`, `componentId` instead of `ingredientId`).

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/RecipePage.tsx && git commit -m "refactor: RecipePage works with component + recipe structure"
```

---

### Task 16: Update Frontend — SkusPage

**Files:**
- Modify: `app/src/pages/SkusPage.tsx`

Update to match the new API response shape. The SKU delete endpoint now takes an InstantDB ID instead of an ASIN.

- [ ] **Step 1: Read current SkusPage.tsx and update**

Update the SKU list to use the new response shape (`id` field instead of relying on `asin` for deletion). Update the delete handler to use `/api/skus/:id` instead of `/api/skus/:asin`.

The add form may need updates — the old form just added a URL to a CSV. The new form should create a full SKU entity.

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/SkusPage.tsx && git commit -m "refactor: SkusPage uses InstantDB SKU entities"
```

---

### Task 17: Update Frontend — LayoutEditorPage and Menu Rendering

**Files:**
- Modify: `app/src/pages/LayoutEditorPage.tsx`
- Modify: `app/src/pages/MenuRenderPrintPage.tsx`
- Modify: `app/src/components/print-layout/useDesignTokens.ts`

These pages fetch menus and design tokens via REST. The REST endpoints still work (they now query InstantDB on the server), so the frontend fetch calls remain valid. However, the menu response shape may differ slightly — the layout is now in a `layout` field rather than spread across the root object.

- [ ] **Step 1: Update LayoutEditorPage.tsx**

The old menu JSON had `{ id, name, pageWidth, pageHeight, pages: [...] }` at the root. Now the response is `{ id, name, layout: { pageWidth, pageHeight, pages: [...] } }`. Update the page to read from `menu.layout` instead of the root.

When saving via `PUT /api/menus/:id`, send `{ layout: { ...layoutData } }` instead of the full object.

- [ ] **Step 2: Update MenuRenderPrintPage.tsx**

Same layout nesting change as LayoutEditorPage.

- [ ] **Step 3: Update useDesignTokens.ts**

The design tokens endpoint still returns the same shape (a flat JSON object of CSS variables), so this hook should work without changes. Verify and adjust if needed.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/LayoutEditorPage.tsx app/src/pages/MenuRenderPrintPage.tsx app/src/components/print-layout/useDesignTokens.ts && git commit -m "refactor: update menu pages for nested layout structure"
```

---

### Task 18: Update Frontend — TableTestPage and PublicMenuPreviewPage

**Files:**
- Modify: `app/src/pages/TableTestPage.tsx`
- Modify: `app/src/pages/PublicMenuPreviewPage.tsx`

- [ ] **Step 1: Update TableTestPage.tsx**

This page fetches `/api/recipes` — the response shape changes. Update the type interface and rendering to match the new component shape.

- [ ] **Step 2: Update PublicMenuPreviewPage.tsx**

If this page fetches from `/api/public/menu-items`, the response shape stays the same (the server route was updated to query dishes). Verify and adjust if needed.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/TableTestPage.tsx app/src/pages/PublicMenuPreviewPage.tsx && git commit -m "refactor: update remaining pages for new data shape"
```

---

### Task 19: Delete master-data and Clean Up

**Files:**
- Delete: `master-data/` directory
- Modify: `.gitignore` if needed

- [ ] **Step 1: Verify the app works**

Start the dev server and verify:
```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin && pnpm dev
```

Check that:
- `/api/recipes` returns components
- `/api/dishes` returns dishes
- `/api/menus` returns menus
- `/api/skus` returns SKUs
- `/api/design-tokens` returns tokens
- Frontend pages load without errors

- [ ] **Step 2: Delete master-data**

```bash
rm -rf /Users/markwatabe/Documents/GitHub/pagu-admin/master-data
```

- [ ] **Step 3: Remove REPO_PATH from .env if present**

Check `.env` for `REPO_PATH` and remove it if present.

- [ ] **Step 4: Commit**

```bash
git rm -r master-data && git add -A && git commit -m "chore: delete master-data folder, migration to InstantDB complete"
```

---

### Task 20: Final Verification

- [ ] **Step 1: Full app smoke test**

Start the app and navigate through all pages:
- Dishes list and detail pages
- Recipe/component pages
- SKUs page
- Menu editor
- Public menu preview

- [ ] **Step 2: Verify no remaining references to master-data or repoPath**

```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin && grep -r "master-data\|repoPath\|REPO_PATH" --include="*.ts" --include="*.tsx" server/ app/
```

Expected: No matches (or only in comments/docs).
