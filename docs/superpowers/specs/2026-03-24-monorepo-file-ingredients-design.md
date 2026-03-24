# Monorepo + File-Based Ingredients API

**Date:** 2026-03-24
**Status:** Approved

## Problem

Ingredients are master data that belong in version-controlled files, not in a database server. The current app is a client-only Vite SPA with no backend. We need a Hono API server that reads ingredient JSON files from a local REPO directory, and the project needs to be restructured as a pnpm workspaces monorepo.

## Design

### Directory Structure

```
pagu-admin/
├── pnpm-workspace.yaml
├── package.json                  # root: dev script + concurrently
├── app/                          # Vite React SPA
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── tsconfig.json
│   └── src/                      # moved from current ./src
├── server/                       # Hono API server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       └── routes/
│           └── ingredients.ts
├── REPO/                         # git repo with ingredient JSON files
│   └── ingredients/
├── scripts/                      # existing migration scripts (unchanged)
└── .env
```

### Monorepo Setup

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - 'app'
  - 'server'
```

**Root `package.json`:**
- `devDependencies`: `concurrently`
- `scripts.dev`: `concurrently --names app,server --prefix-colors blue,green "pnpm --filter app dev" "pnpm --filter server dev"`

**`app/package.json`:**
- Inherits all current dependencies from root `package.json` (react, instantdb, tailwind, vite, etc.)
- `scripts.dev`: `vite`
- `scripts.build`: `vite build`

**`server/package.json`:**
- `dependencies`: `hono`
- Server reads `.env` from monorepo root via `dotenv` (devDependency)
- `devDependencies`: `tsx`, `@types/node`, `dotenv`
- `scripts.dev`: `tsx watch src/index.ts`

### Files to Move

All current root-level app files move to `/app`:
- `src/` -> `app/src/`
- `index.html` -> `app/index.html`
- `vite.config.ts` -> `app/vite.config.ts`
- `tsconfig.json` -> `app/tsconfig.json`
- `tsconfig.app.json` -> `app/tsconfig.app.json` (if exists)

Files that stay at root:
- `.env`
- `REPO/`
- `scripts/`
- `.git/`

A minimal root `tsconfig.json` remains to cover `scripts/` (used by `tsx` for migration scripts). The app and server each have their own `tsconfig.json`.

**Note:** The `@` alias in `app/vite.config.ts` (`path.resolve(__dirname, './src')`) and `app/tsconfig.json` (`"@/*": ["./src/*"]`) remain unchanged after the move — `__dirname` resolves to `app/` so `./src` correctly points to `app/src/`.

### Server

**`server/src/index.ts`:**
- Creates Hono app
- Resolves `REPO_PATH` from env using `import.meta.url` to anchor relative paths (defaults to `../REPO` relative to `server/`)
- Listens on port 3001
- CORS enabled for `localhost:5173` (Vite dev server)

**`server/src/routes/ingredients.ts`:**

**`GET /api/ingredients`** — list all ingredients
- Reads all `*.json` files from `{REPO_PATH}/ingredients/`
- Returns array of objects: `{ id, name, production_type, ingredient_type?, type?, hasRecipe }`
- `name`: uses the `name` field from the JSON file if present; otherwise derives from `id` by replacing `_` with spaces and title-casing (e.g., `SOY_SAUCE` -> `Soy Sauce`)
- `hasRecipe` is `true` when the file has a non-empty `ingredients` array
- Sorted alphabetically by name

**`GET /api/ingredients/:id`** — get single ingredient
- Reads `{REPO_PATH}/ingredients/{id}.json`
- Returns the full JSON content
- For compound ingredients, resolves each entry in the `ingredients` array by loading the referenced file to include its `name`:
  - Input: `[200, "gram", "SAKE"]`
  - Output: `{ amount: 200, unit: "gram", ingredientId: "SAKE", name: "Sake" }`
- Returns 404 if file not found

### Frontend Changes

**Vite proxy** in `app/vite.config.ts`:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

**`IngredientsPage.tsx`:**
- Fetches `GET /api/ingredients` via `fetch`
- Groups by `hasRecipe` — `true` shown as "Recipes", `false` as "Base Ingredients"
- Each item links to `/ingredient/:id`

**`IngredientPage.tsx`:**
- Fetches `GET /api/ingredients/:id` via `fetch`
- Displays recipe table (amount, unit, ingredient name, percentage)
- Displays `instructions`, `directions`, `equipment` sections when present

### Missing JSON Files

Create in `REPO/ingredients/` following the `SOY_SAUCE.json` pattern:

| File | type |
|------|------|
| `MIRIN.json` | spirit |
| `ORGANIC_CANE_SUGAR.json` | sweetener |
| `RICE_VINEGAR.json` | vinegar |
| `SCALLION.json` | produce |
| `SESAME_OIL.json` | oil |
| `GARLIC_MINCED.json` | produce |
| `GINGER_PEELED_MINCED.json` | produce |
| `APPLE_CORED_PEELED.json` | produce |

All with `production_type: "purchasable"` and `unit: "gram"` (except `APPLE_CORED_PEELED` which uses `unit: "whole"`).

## Out of Scope

- Authentication/authorization on the API
- Write endpoints (ingredients are edited as files, not via API)
- Removing InstantDB — other entities (menu items, reviews, users) remain in InstantDB
- Production deployment configuration
