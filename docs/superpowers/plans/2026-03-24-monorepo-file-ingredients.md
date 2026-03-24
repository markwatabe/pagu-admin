# Monorepo + File-Based Ingredients Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the project into a pnpm workspaces monorepo with a Hono API server that serves ingredient data from JSON files in the REPO directory.

**Architecture:** pnpm workspaces with two packages: `app` (Vite React SPA) and `server` (Hono). The server reads `REPO/ingredients/*.json` on each request. Vite proxies `/api` to the server in dev.

**Tech Stack:** pnpm workspaces, Hono, tsx, concurrently, Vite proxy

**Spec:** `docs/superpowers/specs/2026-03-24-monorepo-file-ingredients-design.md`

---

## File Structure

### New files to create
- `pnpm-workspace.yaml` — workspace definition
- `app/package.json` — app workspace config
- `app/vite.config.ts` — moved + proxy added
- `app/tsconfig.json` — moved from root
- `server/package.json` — server workspace config
- `server/tsconfig.json` — server TS config
- `server/src/index.ts` — Hono app entrypoint
- `server/src/routes/ingredients.ts` — ingredient API routes
- `REPO/ingredients/MIRIN.json`
- `REPO/ingredients/ORGANIC_CANE_SUGAR.json`
- `REPO/ingredients/RICE_VINEGAR.json`
- `REPO/ingredients/SCALLION.json`
- `REPO/ingredients/SESAME_OIL.json`
- `REPO/ingredients/GARLIC_MINCED.json`
- `REPO/ingredients/GINGER_PEELED_MINCED.json`
- `REPO/ingredients/APPLE_CORED_PEELED.json`

### Files to modify
- `package.json` — strip to root-only, add concurrently + dev script
- `app/src/pages/IngredientsPage.tsx` — fetch from API instead of InstantDB
- `app/src/pages/IngredientPage.tsx` — fetch from API instead of InstantDB

### Files to move (root → app/)
- `src/` → `app/src/`
- `index.html` → `app/index.html`
- `vite.config.ts` → `app/vite.config.ts`
- `tsconfig.json` → `app/tsconfig.json`

---

### Task 1: Create missing ingredient JSON files in REPO

**Files:**
- Create: `REPO/ingredients/MIRIN.json`
- Create: `REPO/ingredients/ORGANIC_CANE_SUGAR.json`
- Create: `REPO/ingredients/RICE_VINEGAR.json`
- Create: `REPO/ingredients/SCALLION.json`
- Create: `REPO/ingredients/SESAME_OIL.json`
- Create: `REPO/ingredients/GARLIC_MINCED.json`
- Create: `REPO/ingredients/GINGER_PEELED_MINCED.json`
- Create: `REPO/ingredients/APPLE_CORED_PEELED.json`

- [ ] **Step 1: Create all 8 JSON files**

Follow the `SOY_SAUCE.json` pattern. Each file:

```json
{
    "id": "MIRIN",
    "production_type": "purchasable",
    "type": "spirit",
    "unit": "gram"
}
```

Types: MIRIN=spirit, ORGANIC_CANE_SUGAR=sweetener, RICE_VINEGAR=vinegar, SCALLION=produce, SESAME_OIL=oil, GARLIC_MINCED=produce, GINGER_PEELED_MINCED=produce, APPLE_CORED_PEELED=produce.

APPLE_CORED_PEELED uses `"unit": "whole"`. All others use `"unit": "gram"`.

- [ ] **Step 2: Verify all referenced ingredients exist**

Run: `ls REPO/ingredients/`

Expected: 11 files (KALBI_MARINADE, SAKE, SOY_SAUCE + 8 new). Every ID in KALBI_MARINADE.json's `ingredients` array should have a corresponding `.json` file.

- [ ] **Step 3: Commit**

```bash
cd REPO && git add ingredients/ && git commit -m "feat: add base ingredient files for kalbi marinade recipe"
```

---

### Task 2: Restructure into pnpm workspaces monorepo

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `app/package.json`
- Modify: `package.json` (root)
- Move: `src/` → `app/src/`
- Move: `index.html` → `app/index.html`
- Move: `vite.config.ts` → `app/vite.config.ts`
- Move: `tsconfig.json` → `app/tsconfig.json`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'app'
  - 'server'
```

- [ ] **Step 2: Create `app/` directory and move files**

```bash
mkdir -p app
mv src app/src
mv index.html app/index.html
mv vite.config.ts app/vite.config.ts
mv tsconfig.json app/tsconfig.json
```

- [ ] **Step 2b: Update `app/tsconfig.json`**

Remove `"scripts"` from `include` (scripts stay at root):

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `app/package.json`**

Move all current dependencies and devDependencies (except `dotenv`, `tsx`, `uuid`) to `app/package.json`. Keep scripts for vite:

```json
{
  "name": "app",
  "private": true,
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/utilities": "^3.2.2",
    "@instantdb/react": "^0.22.169",
    "liquidjs": "^10.25.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.2",
    "tailwindcss": "^4.2.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "jsdom": "^29.0.1",
    "vite": "^8.0.2",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 4: Update root `package.json`**

Strip to root-only concerns. Keep `@instantdb/admin`, `uuid`, `dotenv`, `tsx` for scripts:

```json
{
  "name": "pagu-admin",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "concurrently --names app,server --prefix-colors blue,green \"pnpm --filter app dev\" \"pnpm --filter server dev\""
  },
  "devDependencies": {
    "@instantdb/admin": "^0.22.169",
    "concurrently": "^9.1.2",
    "dotenv": "^17.3.1",
    "tsx": "^4.21.0",
    "uuid": "^13.0.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

- [ ] **Step 5: Create minimal root `tsconfig.json` for scripts**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["scripts"]
}
```

- [ ] **Step 6: Add Vite proxy to `app/vite.config.ts`**

Add `server.proxy` config. The `@` alias uses `__dirname` which resolves to `app/`, so `./src` remains correct.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

- [ ] **Step 7: Install dependencies**

```bash
rm -rf node_modules
pnpm install
```

- [ ] **Step 8: Verify app still builds**

```bash
pnpm --filter app build
```

Expected: successful build with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "refactor: restructure into pnpm workspaces monorepo (app + server)"
```

---

### Task 3: Create Hono server with ingredient endpoints

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/routes/ingredients.ts`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "server",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "hono": "^4.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "dotenv": "^17.3.1",
    "tsx": "^4.21.0"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `server/src/routes/ingredients.ts`**

```ts
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
```

- [ ] **Step 4: Create `server/src/index.ts`**

```ts
import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingredientRoutes } from './routes/ingredients.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoPath = path.resolve(__dirname, '..', '..', process.env.REPO_PATH ?? 'REPO');

const app = new Hono();

app.use('/api/*', cors({ origin: 'http://localhost:5173' }));
app.route('/api/ingredients', ingredientRoutes(repoPath));

const port = 3001;
console.log(`Server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
```

- [ ] **Step 5: Install server dependencies**

```bash
pnpm install
```

- [ ] **Step 6: Verify server starts**

```bash
pnpm --filter server dev
```

Expected: `Server listening on http://localhost:3001`

Test in another terminal:
```bash
curl http://localhost:3001/api/ingredients | head
curl http://localhost:3001/api/ingredients/KALBI_MARINADE | head
```

Expected: JSON responses with ingredient data.

- [ ] **Step 7: Commit**

```bash
git add server/ && git commit -m "feat: add Hono server with ingredient API endpoints"
```

---

### Task 4: Update frontend pages to use API

**Files:**
- Modify: `app/src/pages/IngredientsPage.tsx`
- Modify: `app/src/pages/IngredientPage.tsx`

- [ ] **Step 1: Rewrite `IngredientsPage.tsx` to fetch from API**

```tsx
import { Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useEffect, useState } from 'react';

interface IngredientSummary {
  id: string;
  name: string;
  production_type: string;
  ingredient_type?: string;
  type?: string;
  hasRecipe: boolean;
}

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState<IngredientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ingredients')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setIngredients)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!ingredients) return <Spinner />;

  const withRecipe = ingredients.filter((i) => i.hasRecipe);
  const withoutRecipe = ingredients.filter((i) => !i.hasRecipe);

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Ingredients</h1>
        <p className="mt-1 text-gray-500">
          {ingredients.length} ingredients &middot; {withRecipe.length} with recipes
        </p>
      </div>

      {withRecipe.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Recipes</h2>
          <div className="space-y-3">
            {withRecipe.map((ing) => (
              <Link
                key={ing.id}
                to={`/ingredient/${ing.id}`}
                className="flex items-center justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <span className="font-semibold text-gray-900">{ing.name}</span>
                <span className="text-sm text-gray-400">&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Base Ingredients</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <ul className="divide-y divide-gray-50">
            {withoutRecipe.map((ing) => (
              <li key={ing.id}>
                <Link
                  to={`/ingredient/${ing.id}`}
                  className="block px-6 py-3 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-indigo-600"
                >
                  {ing.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `IngredientPage.tsx` to fetch from API**

```tsx
import { useParams, Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useEffect, useState } from 'react';

interface ResolvedIngredient {
  amount: number;
  unit: string;
  ingredientId: string;
  name: string;
}

interface IngredientDetail {
  id: string;
  name: string;
  production_type: string;
  ingredient_type?: string;
  type?: string;
  ingredients?: ResolvedIngredient[];
  instructions?: string[];
  directions?: string[];
  equipment?: string[];
}

export function IngredientPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<IngredientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ingredients/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Ingredient not found' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return <Spinner />;

  const recipe = (data.ingredients ?? []).sort((a, b) => b.amount - a.amount);
  const totalWeight = recipe.reduce((sum, r) => sum + r.amount, 0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link to="/ingredients" className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; All Ingredients
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          {data.name}
        </h1>
        {recipe.length > 0 && (
          <p className="mt-1 text-gray-500">
            {recipe.length} ingredients &middot; {totalWeight}g total
          </p>
        )}
      </div>

      {recipe.length === 0 ? (
        <p className="text-sm italic text-gray-400">
          This ingredient has no recipe — it is a base ingredient.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Ingredient</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recipe.map((r) => {
                const pct = totalWeight > 0 ? (r.amount / totalWeight) * 100 : 0;
                return (
                  <tr key={r.ingredientId} className="transition hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      <Link
                        to={`/ingredient/${r.ingredientId}`}
                        className="hover:text-indigo-600"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {r.amount} {r.unit}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-400">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.instructions && data.instructions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Instructions</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
            {data.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {data.directions && data.directions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Directions</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {data.directions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {data.equipment && data.equipment.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Equipment</h2>
          <ul className="flex flex-wrap gap-2">
            {data.equipment.map((e) => (
              <li
                key={e}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verify both run together**

```bash
pnpm dev
```

Expected: both app and server start. Navigate to `http://localhost:5173/ingredients` — should show the ingredient list. Click into "Korean Short Rib Marinade" — should show recipe table with resolved ingredient names.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/IngredientsPage.tsx app/src/pages/IngredientPage.tsx
git commit -m "feat: update ingredient pages to fetch from Hono API"
```
