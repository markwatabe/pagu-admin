# InstantDB Migration & Auth Design

**Date:** 2026-03-23
**Project:** pagu-admin
**Status:** Approved

## Overview

Migrate the Pagu admin panel from AstroDB/Drizzle to InstantDB. Replace server-side data fetching with client-side React components using InstantDB `useQuery` hooks. Add magic-code email auth with an `is_admin` gate on all pages.

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

### Links Summary

| Link | From | To | Cardinality |
|---|---|---|---|
| `$users.users` | `$users` (auth) | `users` | one-to-one |
| `measuredIngredients.menuItem` | `measuredIngredients` | `menuItems` | many-to-one |
| `measuredIngredients.ingredient` | `measuredIngredients` | `ingredients` | many-to-one |

## 2. Auth Architecture

### Approach

Option A — Auth wrapper component. Every page renders a `<AuthGate client:load>` React island. The gate checks auth state and either renders page content or redirects to `/login`. No Astro middleware or SSR mode required.

### Key Files

**`src/lib/db.ts`**
Single InstantDB client instance. Reads `VITE_INSTANT_APP_ID` from env. Exported as `db` and used everywhere.

**`src/components/AuthGate.tsx`**
React component. Logic:
1. `const { isLoading, user } = db.useAuth()`
2. `isLoading` → render full-screen spinner
3. `!user` → `window.location.href = '/login'`
4. Query `users` namespace for `is_admin` flag tied to current `user.id`
5. `!is_admin` → render "Access denied" message
6. `is_admin` → render `children`

**`src/pages/login.astro`**
Public Astro page (no AuthGate). Renders a `<LoginForm client:load>` React component.

**`src/components/LoginForm.tsx`**
Two-step UI:
- Step 1: Email input → `db.auth.sendMagicCode({ email })` → advance to step 2
- Step 2: Code input → `db.auth.signInWithMagicCode({ email, code })` → on success, `window.location.href = '/'`

### Auth Persistence

InstantDB stores the refresh token client-side (browser storage). The SDK reconnects the WebSocket with this token on every page load. `db.useAuth()` in any React component picks up the live session — no cookies or server sessions needed.

### All Other Pages

Each existing Astro page:
```astro
---
import Layout from '../layouts/Layout.astro';
import AuthGate from '../components/AuthGate';
import UsersPage from '../components/admin/UsersPage';
---
<Layout title="Users — Pagu">
  <AuthGate client:load>
    <UsersPage client:load />
  </AuthGate>
</Layout>
```

## 3. Data Layer — Page Conversions

All Astro frontmatter DB queries are removed. Each page gets a corresponding React component that uses `db.useQuery`.

| Astro Page | New React Component | InstantDB Query |
|---|---|---|
| `users.astro` | `UsersPage.tsx` | `{ users: {} }` |
| `reviews.astro` | `ReviewsPage.tsx` | `{ reviews: {} }` |
| `menu-builder.astro` | `MenuBuilderPage.tsx` | `{ menuItems: {} }` |
| `menu-ingredients.astro` | `MenuIngredientsPage.tsx` | `{ menuItems: { measuredIngredients: { ingredient: {} } } }` |
| `menu-render.astro` | `MenuRenderPage.tsx` | `{ menuItems: {} }` |
| `menu-render-print.astro` | `MenuRenderPrintPage.tsx` | `{ menuItems: {} }` |
| `menu-preview.astro` | `MenuPreviewPage.tsx` | `{ menuItems: {} }` |

The nested query for `menu-ingredients` replaces `src/queries/menuItemsWithIngredients.ts` — InstantDB returns joins inline.

Each React component follows the same loading pattern:
```tsx
const { isLoading, error, data } = db.useQuery({ users: {} });
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
const { users } = data;
```

## 4. Data Migration

### Strategy

One-time Node.js script using `@instantdb/admin`. Reads seed data directly from the existing `db/seed.ts` values (the source of truth). Transacts into InstantDB via the Admin SDK using `INSTANT_ADMIN_TOKEN`.

### Script Location

`scripts/migrate-to-instantdb.ts`

Run with: `npx tsx scripts/migrate-to-instantdb.ts`

### Migration Order

1. `ingredients` — no dependencies
2. `menuItems` — no dependencies
3. `reviews` — no dependencies
4. `users` (app profiles) — no dependencies
5. `measuredIngredients` + links to `menuItems` and `ingredients`

Each step uses `db.transact()` with `db.tx.<namespace>[id].update({ ...fields })` for records and `db.tx.<namespace>[id].link({ <linkName>: targetId })` for relationships.

### Auth Users vs App Users

The `users` namespace holds profile data (name, role, is_admin). InstantDB `$users` (auth identities) are created separately when each person first signs in with a magic code. The link between `$users` and `users` is established at first login — not during migration.

After running the migration and signing in for the first time, manually set `is_admin: true` on your own `users` record via the InstantDB dashboard or a one-off admin script.

## 5. Packages to Add / Remove

**Add:**
- `@instantdb/react` — client SDK with `useQuery`, `useAuth`, `db.auth.*`
- `@instantdb/admin` — server/script SDK for migration

**Remove:**
- `@astrojs/db` — AstroDB integration
- `drizzle-kit` — no longer needed

**Update:**
- `astro.config.mjs` — remove `db()` integration

## 6. Files to Delete After Migration

- `db/config.ts`
- `db/seed.ts`
- `drizzle.config.ts` (if present)
- `src/queries/menuItemsWithIngredients.ts`
