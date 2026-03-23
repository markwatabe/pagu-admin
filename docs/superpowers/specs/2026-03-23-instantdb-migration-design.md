# InstantDB Migration & Auth Design

**Date:** 2026-03-23
**Project:** pagu-admin
**Status:** Approved

## Overview

Replace the Astro framework with a Vite SPA. Migrate from AstroDB/Drizzle to InstantDB. Use React Router for client-side routing, InstantDB `useQuery` hooks for all data fetching, and InstantDB magic-code auth with an `is_admin` gate on all routes.

Astro's server rendering was appropriate when the goal included public-facing pages. Now that the entire app is an authenticated admin panel with client-side data, a plain Vite + React SPA is the right fit — no island architecture, no hydration directives, no special cases.

## 1. InstantDB Schema

Five namespaces mirror the existing AstroDB tables. Foreign keys become InstantDB links.

### Namespaces

**`users`**
- `name: string`
- `email: string`
- `role: string` — `'Owner' | 'Manager' | 'Staff'`
- `active: boolean`
- `createdAt: string`
- `is_admin: boolean`
- Link: `$users.users` (one-to-one, connects InstantDB auth identity to app profile)

**`menuItems`**
- `name: string`
- `description: string`
- `section: string` — `'Chilled' | 'Tapas' | 'Baos' | 'Land & Sea' | 'Noodles & Rice' | 'Sweet'`
- `price: number` — in cents
- `available: boolean`

**`reviews`**
- `author: string`
- `rating: number` — 1–5
- `body: string`
- `source: string` — `'Google' | 'Yelp' | 'In-app'`
- `replied: boolean`
- `createdAt: string`

**`ingredients`**
- `name: string`
- `unit: string` — optional

**`measuredIngredients`**
- `amount: number` — optional
- `unit: string` — optional
- Link: `measuredIngredients.menuItem` → `menuItems` (many-to-one)
- Link: `measuredIngredients.ingredient` → `ingredients` (many-to-one)
- Note: The existing AstroDB schema has an `outputIngredientId` column that does not appear in any seed data rows. This column is intentionally omitted from the InstantDB schema and migration. If real production data exists in this column, a second link `measuredIngredients.outputIngredient` → `ingredients` would be needed.

### Links Summary

| Link | From | To | Cardinality |
|---|---|---|---|
| `$users.users` | `$users` (auth) | `users` | one-to-one |
| `measuredIngredients.menuItem` | `measuredIngredients` | `menuItems` | many-to-one |
| `measuredIngredients.ingredient` | `measuredIngredients` | `ingredients` | many-to-one |

## 2. Application Architecture

### Tech Stack

| Concern | Tool |
|---|---|
| Build | Vite |
| Framework | React 19 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Database + Auth | InstantDB (`@instantdb/react`) |

### File Structure

```
index.html
vite.config.ts
src/
  main.tsx              — ReactDOM.createRoot, mounts <App />
  App.tsx               — BrowserRouter + route definitions
  styles/
    global.css          — Tailwind directives (existing, kept as-is)
  lib/
    db.ts               — single InstantDB client instance
  components/
    ProtectedLayout.tsx — auth gate as a React Router layout route
    LoginForm.tsx       — magic code two-step form
    Spinner.tsx         — shared loading indicator
  pages/
    LoginPage.tsx
    UsersPage.tsx
    ReviewsPage.tsx
    MenuBuilderPage.tsx
    MenuIngredientsPage.tsx
    MenuRenderPage.tsx
    MenuRenderPrintPage.tsx
    MenuPreviewPage.tsx
scripts/
  migrate-to-instantdb.ts
  bootstrap-admin.ts
```

### Route Definitions (`App.tsx`)

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedLayout />}>
      <Route index element={<Navigate to="/users" replace />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/menu-builder" element={<MenuBuilderPage />} />
      <Route path="/menu-ingredients" element={<MenuIngredientsPage />} />
      <Route path="/menu-render" element={<MenuRenderPage />} />
      <Route path="/menu-render-print" element={<MenuRenderPrintPage />} />
      <Route path="/menu-preview" element={<MenuPreviewPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

## 3. Auth Architecture

### `src/lib/db.ts`

Single InstantDB client instance. Reads `VITE_INSTANT_APP_ID` from `import.meta.env`. Exported as `db` and imported everywhere.

### `src/components/ProtectedLayout.tsx`

React Router layout route. Rendered once for all protected routes. Uses `<Outlet />` to render the matched child route.

Logic:
1. `const { isLoading, user } = db.useAuth()`
2. `isLoading` → render full-screen `<Spinner />`
3. `!user` → `<Navigate to="/login" replace />`
4. Query `users` namespace for the app profile linked to the current auth user:
   ```ts
   const { data } = db.useQuery(
     user ? { users: { $: { where: { '$users.id': user.id } } } } : null
   );
   const profile = data?.users?.[0];
   ```
5. Profile still loading → render `<Spinner />`
6. `!profile?.is_admin` → render "Access denied" message with sign-out button
7. `profile.is_admin` → render `<Outlet />`

### `src/pages/LoginPage.tsx`

Public route — no `ProtectedLayout`. Renders `<LoginForm />`.

### `src/components/LoginForm.tsx`

Two-step UI:
- Step 1: Email input → `db.auth.sendMagicCode({ email })` → advance to step 2
- Step 2: Code input → `db.auth.signInWithMagicCode({ email, code })` → on success, React Router `navigate('/')` (which redirects to `/users`)

### Auth Persistence

InstantDB stores the refresh token in browser storage. The SDK reconnects the WebSocket with this token on every page load. `db.useAuth()` in any React component picks up the live session — no cookies or server sessions needed.

### `is_admin` Bootstrap

After first sign-in, the auth user exists in `$users` but has no linked `users` profile (profiles were created by the migration script without the `$users` link). Every login will hit "Access denied" until the link is established.

**Bootstrap procedure after first sign-in:**
1. Sign in via the magic code flow — this creates a `$users` record.
2. Run: `npx tsx scripts/bootstrap-admin.ts <your-email>`
   - Queries `$users` by email, finds the matching `users` profile, creates the `$users.users` link, sets `is_admin: true`.
3. Refresh — `ProtectedLayout` resolves `is_admin: true` and grants access.

Other team members follow the same flow; an admin sets `is_admin: true` for them via the Users page.

## 4. Data Layer

All data fetching moves to React components using `db.useQuery`. Each page follows the same pattern:

```tsx
const { isLoading, error, data } = db.useQuery({ users: {} });
if (isLoading) return <Spinner />;
if (error) return <div>Error: {error.message}</div>;
const { users } = data;
```

### Query Reference

| Page | InstantDB Query |
|---|---|
| `UsersPage` | `{ users: {} }` |
| `ReviewsPage` | `{ reviews: {} }` |
| `MenuBuilderPage` | `{ menuItems: {} }` |
| `MenuIngredientsPage` | `{ menuItems: { measuredIngredients: { ingredient: {} } } }` |
| `MenuRenderPage` | `{ menuItems: {} }` |
| `MenuRenderPrintPage` | `{ menuItems: {} }` |
| `MenuPreviewPage` | `{ menuItems: {} }` |

The nested query for `MenuIngredientsPage` replaces `src/queries/menuItemsWithIngredients.ts` — InstantDB returns joins inline.

**Note on `MenuRenderPrintPage` section names:** The existing Astro print page uses hardcoded section names (`'Starters'`, `'Mains'`, `'Desserts'`) that do not match the actual data (`'Chilled'`, `'Tapas'`, `'Baos'`, `'Land & Sea'`, `'Noodles & Rice'`, `'Sweet'`). The new component must derive section groups from the actual data rather than hardcoding them.

## 5. Data Migration

### Strategy

One-time Node.js script using `@instantdb/admin`. Reads seed data directly from the existing `db/seed.ts` values (the source of truth). Transacts into InstantDB via the Admin SDK using `INSTANT_ADMIN_TOKEN`.

### Scripts

**`scripts/migrate-to-instantdb.ts`** — main migration
Run with: `npx tsx scripts/migrate-to-instantdb.ts`

**`scripts/bootstrap-admin.ts`** — post-first-login bootstrap
Run with: `npx tsx scripts/bootstrap-admin.ts <email>`

### Migration Order

1. `ingredients` — no dependencies
2. `menuItems` — no dependencies
3. `reviews` — no dependencies
4. `users` (app profiles, without `$users` link) — no dependencies
5. `measuredIngredients` + links to `menuItems` and `ingredients`

Each step uses `db.transact()` with `db.tx.<namespace>[id].update({ ...fields })` for records and `db.tx.<namespace>[id].link({ <linkName>: targetId })` for relationships.

### Auth Users vs App Users

The `users` namespace holds profile data (name, role, is_admin). InstantDB `$users` (auth identities) are created when someone first signs in with a magic code. The `$users.users` link is established by the bootstrap script after first login.

## 6. Environment Variables

Add to `.env` (already present) and document in `.env.example`:

```
VITE_INSTANT_APP_ID=your-app-id      # exposed to browser via Vite
INSTANT_ADMIN_TOKEN=your-admin-token  # scripts only, never sent to browser
```

## 7. Packages

**Add:**
- `vite` — build tool
- `@vitejs/plugin-react` — React JSX transform for Vite
- `react-router-dom` — client-side routing (React Router v7; includes `react-router`)
- `@instantdb/react` — client SDK (`useQuery`, `useAuth`, `db.auth.*`)
- `@instantdb/admin` — server/script SDK for migration and bootstrap

**Remove:**
- `astro`
- `@astrojs/react`
- `@astrojs/db`
- `drizzle-kit`

**Keep:**
- `react`, `react-dom`
- `tailwindcss`, `@tailwindcss/vite`
- `@types/react`, `@types/react-dom`
- `liquidjs`, `@dnd-kit/core`, `@dnd-kit/utilities` — keep if still used by menu pages; remove if not

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 8a. New Config Files

**`index.html`** (root, Vite entry point):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pagu Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**`vite.config.ts`**:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**`tsconfig.json`** — replace the Astro base with a plain strict config:
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
    "jsxImportSource": "react"
  },
  "include": ["src", "scripts"],
  "exclude": ["dist", "node_modules"]
}
```

## 9. Files to Delete

**Astro source (delete entirely):**
- `src/pages/` — all `.astro` page files
- `src/layouts/Layout.astro`
- `src/components/FeatureCard.astro`
- `src/components/admin/TodoPage.tsx` — starter placeholder, not part of the admin panel
- `astro.config.mjs`

**AstroDB / Drizzle:**
- `db/config.ts`
- `db/seed.ts`
- `drizzle.config.ts` (if present)
- `src/queries/menuItemsWithIngredients.ts`

**Migration scripts (after use):**
- `scripts/migrate-to-instantdb.ts` — delete after migration is confirmed complete
- `scripts/bootstrap-admin.ts` — delete after all admins are bootstrapped
