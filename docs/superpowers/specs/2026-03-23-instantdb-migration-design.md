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
- Note: The existing AstroDB schema has an `outputIngredientId` column that does not appear in any seed data rows. This column is intentionally omitted from the InstantDB schema and migration. If real production data exists in this column, a second link `measuredIngredients.outputIngredient` → `ingredients` would be needed.

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
4. Query `users` namespace for the app profile linked to the current auth user:
   ```ts
   const { data } = db.useQuery(
     user ? { users: { $: { where: { '$users.id': user.id } } } } : null
   );
   const profile = data?.users?.[0];
   ```
5. Profile still loading → render spinner
6. `!profile?.is_admin` → render "Access denied" message
7. `profile.is_admin` → render `children`

**`src/pages/login.astro`**
Public Astro page (no AuthGate). Renders a `<LoginForm client:load>` React component.

**`src/components/LoginForm.tsx`**
Two-step UI:
- Step 1: Email input → `db.auth.sendMagicCode({ email })` → advance to step 2
- Step 2: Code input → `db.auth.signInWithMagicCode({ email, code })` → on success, `window.location.href = '/'`

No additional profile-linking step is needed at login. The `$users.users` link is queried in `AuthGate` by matching `$users.id` to the auth user's id.

### Auth Persistence

InstantDB stores the refresh token client-side (browser storage). The SDK reconnects the WebSocket with this token on every page load. `db.useAuth()` in any React component picks up the live session — no cookies or server sessions needed.

### All Other Pages

Each existing Astro page imports `AuthGate` as the single client island. Page content React components are imported and rendered as **plain React children inside `AuthGate`** — they do not get their own `client:load` directive:

```astro
---
import Layout from '../layouts/Layout.astro';
import AuthGate from '../components/AuthGate';
import UsersPage from '../components/admin/UsersPage';
---
<Layout title="Users — Pagu">
  <AuthGate client:load>
    <UsersPage />
  </AuthGate>
</Layout>
```

`AuthGate` is the single Astro island boundary. All components rendered inside it are regular React and do not need their own hydration directive.

### `menu-render-print.astro` Special Case

This page is a self-contained `<!doctype html>` document (no `Layout.astro`) with its own print CSS. To preserve this, `AuthGate` is rendered directly in the `<body>` without a Layout wrapper:

```astro
---
import AuthGate from '../components/AuthGate';
import MenuRenderPrintPage from '../components/admin/MenuRenderPrintPage';
---
<!doctype html>
<html>
  <head><!-- existing print CSS --></head>
  <body>
    <AuthGate client:load>
      <MenuRenderPrintPage />
    </AuthGate>
  </body>
</html>
```

### `index.astro` — Home Page

The current home page is a generic starter template with no admin data. After migration it should redirect to the dashboard or be replaced with a simple authenticated landing page. It is gated with `AuthGate` like all other pages.

### `is_admin` Bootstrap

After first sign-in, the auth user exists in `$users` but has no linked `users` profile (the `users` namespace records were created by the migration script without the `$users` link). Every login will hit "Access denied" until the link is established.

**Bootstrap procedure after first sign-in:**
1. Sign in via the magic code flow — this creates a `$users` record.
2. Run the bootstrap script: `npx tsx scripts/bootstrap-admin.ts <your-email>`
   - This script queries `$users` by email, finds the matching `users` profile, creates the `$users.users` link, and sets `is_admin: true`.
3. Refresh the page — AuthGate will now resolve `is_admin: true` and grant access.

Other team members follow the same flow, but an admin sets `is_admin: true` for them via the Users page or the dashboard.

## 3. Data Layer — Page Conversions

All Astro frontmatter DB queries are removed. Each page gets a corresponding React component that uses `db.useQuery`.

| Astro Page | New React Component | InstantDB Query |
|---|---|---|
| `index.astro` | `HomePage.tsx` (or redirect) | none / `{}` |
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

**Note on `menu-render-print` section names:** The existing print page logic uses hardcoded section names (`'Starters'`, `'Mains'`, `'Desserts'`) that do not match the actual data (`'Chilled'`, `'Tapas'`, `'Baos'`, `'Land & Sea'`, `'Noodles & Rice'`, `'Sweet'`). The `MenuRenderPrintPage` component must use the actual section names from the data.

## 4. Data Migration

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

## 5. Environment Variables

Add to `.env` (already present) and document in `.env.example`:

```
VITE_INSTANT_APP_ID=your-app-id     # exposed to browser via Vite
INSTANT_ADMIN_TOKEN=your-admin-token # server/scripts only, never exposed to browser
```

## 6. Packages to Add / Remove

**Add:**
- `@instantdb/react` — client SDK with `useQuery`, `useAuth`, `db.auth.*`
- `@instantdb/admin` — server/script SDK for migration and bootstrap

**Remove (in this order):**
1. Uninstall `@astrojs/db` and `drizzle-kit`
2. Remove `db()` from `astro.config.mjs`
3. Delete source files (see Section 7)

## 7. Files to Delete After Migration

- `db/config.ts`
- `db/seed.ts`
- `drizzle.config.ts` (if present)
- `src/queries/menuItemsWithIngredients.ts`
- `scripts/migrate-to-instantdb.ts` (after migration is confirmed complete)
- `scripts/bootstrap-admin.ts` (after all admins are bootstrapped)
