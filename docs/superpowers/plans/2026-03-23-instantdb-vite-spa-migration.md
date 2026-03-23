# InstantDB + Vite SPA Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Astro + AstroDB with a Vite SPA using React Router v7 and InstantDB for data and magic-code auth.

**Architecture:** All pages become React components under a React Router `ProtectedLayout` that checks InstantDB auth and `is_admin`. The `AppLayout` component provides nav/footer for admin pages; print and preview pages render standalone. A one-time migration script seeds InstantDB from the existing AstroDB seed data.

**Tech Stack:** Vite, React 19, React Router v7 (`react-router-dom`), InstantDB (`@instantdb/react`, `@instantdb/admin`), Tailwind CSS v4, TypeScript strict

**Spec:** `docs/superpowers/specs/2026-03-23-instantdb-migration-design.md`

---

## File Map

### Created
| File | Purpose |
|---|---|
| `index.html` | Vite SPA entry point |
| `vite.config.ts` | Vite config with React + Tailwind plugins |
| `tsconfig.json` | Replace Astro base with plain strict config |
| `.env.example` | Document required env vars |
| `src/main.tsx` | ReactDOM root mount |
| `src/App.tsx` | BrowserRouter + all route definitions |
| `src/lib/db.ts` | Single InstantDB client instance |
| `src/components/Spinner.tsx` | Full-screen loading indicator |
| `src/components/AppLayout.tsx` | Nav + `<Outlet />` + footer (replaces Layout.astro) |
| `src/components/ProtectedLayout.tsx` | Auth gate layout route |
| `src/components/LoginForm.tsx` | Two-step magic code form |
| `src/pages/LoginPage.tsx` | Public login page |
| `src/pages/UsersPage.tsx` | Users table |
| `src/pages/ReviewsPage.tsx` | Reviews list |
| `src/pages/MenuBuilderPage.tsx` | Menu items by section |
| `src/pages/MenuIngredientsPage.tsx` | Menu items with nested ingredients |
| `src/pages/MenuRenderPage.tsx` | Public-style menu listing |
| `src/styles/menu-print.css` | Shared print/preview CSS (Bryant Pro font + layout) |
| `src/pages/MenuRenderPrintPage.tsx` | Print-ready A4 layout |
| `src/pages/MenuPreviewPage.tsx` | Scaled visual preview with toolbar |
| `scripts/migrate-to-instantdb.ts` | One-time data migration |
| `scripts/bootstrap-admin.ts` | Links first `$users` auth to `users` profile, sets `is_admin` |

### Deleted (Task 15)
- `astro.config.mjs`
- `src/pages/*.astro`
- `src/layouts/Layout.astro`
- `src/components/FeatureCard.astro`
- `src/components/admin/TodoPage.tsx`
- `src/queries/menuItemsWithIngredients.ts`
- `db/config.ts`, `db/seed.ts`
- `drizzle.config.ts` (if present)

---

## Task 1: Package Swap

**Files:**
- Modify: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `.env.example`

- [ ] **Step 1: Uninstall Astro packages**

```bash
npm uninstall astro @astrojs/react @astrojs/db drizzle-kit
```

- [ ] **Step 2: Install Vite SPA packages**

```bash
npm install react-router-dom @instantdb/react @instantdb/admin uuid
npm install --save-dev vite @vitejs/plugin-react dotenv tsx @types/uuid
```

Note: `dotenv` and `tsx` are required by the migration and bootstrap scripts in Tasks 12–13. Installing them here ensures they are available before the scripts are written.

- [ ] **Step 3: Update package.json scripts**

Open `package.json` and replace the `scripts` block with:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```
Also remove the `"astro": "astro"` script entry if present.

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pagu Admin</title>
  </head>
  <body class="bg-white text-gray-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 6: Replace `tsconfig.json`**

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

- [ ] **Step 7: Create `.env.example`**

```
# Exposed to the browser via Vite (VITE_ prefix required)
VITE_INSTANT_APP_ID=your-instant-app-id

# Used only by scripts/migrate-to-instantdb.ts and scripts/bootstrap-admin.ts
# Never commit this value or expose it to the browser
INSTANT_ADMIN_TOKEN=your-instant-admin-token
```

- [ ] **Step 8: Verify Vite starts (will fail without src/main.tsx — that's expected)**

```bash
npm run dev
```

Expected: error like `Could not resolve entry module "src/main.tsx"`. This confirms Vite is wired up correctly.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json .env.example
git commit -m "chore: swap Astro for Vite, install InstantDB + React Router"
```

---

## Task 2: InstantDB Schema Setup

**Files:**
- Create: `src/lib/db.ts`

**Note:** The InstantDB schema (namespaces + links) must be configured in the InstantDB dashboard at https://instantdb.com before the code will work. Do this step manually.

- [ ] **Step 1: Create the schema in the InstantDB dashboard**

In the InstantDB dashboard for your app, go to **Schema** and create these namespaces and attributes:

**`users`** namespace:
- `name` (string)
- `email` (string)
- `role` (string)
- `active` (boolean)
- `createdAt` (string)
- `is_admin` (boolean)

**`menuItems`** namespace:
- `name` (string)
- `description` (string)
- `section` (string)
- `price` (number)
- `available` (boolean)

**`reviews`** namespace:
- `author` (string)
- `rating` (number)
- `body` (string)
- `source` (string)
- `replied` (boolean)
- `createdAt` (string)

**`ingredients`** namespace:
- `name` (string)
- `unit` (string)

**`measuredIngredients`** namespace:
- `amount` (number)
- `unit` (string)

Then create these **links** in the dashboard:
- `$users` → `users` (one-to-one, name the forward link `users` on `$users`)
- `measuredIngredients` → `menuItems` (many-to-one, name the forward link `menuItem`)
- `measuredIngredients` → `ingredients` (many-to-one, name the forward link `ingredient`)

- [ ] **Step 2: Create `src/lib/db.ts`**

```ts
import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID as string;

if (!APP_ID) {
  throw new Error('VITE_INSTANT_APP_ID is not set. Add it to your .env file.');
}

export const db = init({ appId: APP_ID });
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add InstantDB client"
```

---

## Task 3: Shared Components

**Files:**
- Create: `src/components/Spinner.tsx`
- Create: `src/components/AppLayout.tsx`

- [ ] **Step 1: Create `src/components/Spinner.tsx`**

```tsx
export function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/AppLayout.tsx`**

This replaces `Layout.astro`. Uses React Router `<Link>` for nav and `<Outlet />` for page content.

```tsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';

export function AppLayout() {
  const navigate = useNavigate();

  function handleSignOut() {
    db.auth.signOut();
    navigate('/login');
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-indigo-600">
            Pagu
          </Link>
          <ul className="flex items-center gap-8 text-sm font-medium text-gray-600">
            <li>
              <Link to="/menu-builder" className="transition hover:text-indigo-600">
                Menu Builder
              </Link>
            </li>
            <li>
              <Link to="/users" className="transition hover:text-indigo-600">
                Users
              </Link>
            </li>
            <li>
              <Link to="/reviews" className="transition hover:text-indigo-600">
                Reviews
              </Link>
            </li>
          </ul>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            Sign out
          </button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Pagu Admin</p>
        </div>
      </footer>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Spinner.tsx src/components/AppLayout.tsx
git commit -m "feat: add Spinner and AppLayout components"
```

---

## Task 4: Auth — LoginForm, LoginPage, ProtectedLayout

**Files:**
- Create: `src/components/LoginForm.tsx`
- Create: `src/pages/LoginPage.tsx`
- Create: `src/components/ProtectedLayout.tsx`

- [ ] **Step 1: Create `src/components/LoginForm.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';

export function LoginForm() {
  const navigate = useNavigate();
  const [sentEmail, setSentEmail] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await db.auth.sendMagicCode({ email });
      setSentEmail(email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send code';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await db.auth.signInWithMagicCode({ email: sentEmail, code });
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code';
      setError(message);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  if (!sentEmail) {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="you@pagu.app"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send magic code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <p className="text-sm text-gray-500">
        A 6-digit code was sent to <strong>{sentEmail}</strong>.
      </p>
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Verification code
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="123456"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Verifying…' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={() => { setSentEmail(''); setCode(''); setError(''); }}
        className="w-full text-sm text-gray-500 hover:text-gray-700"
      >
        Use a different email
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/pages/LoginPage.tsx`**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { LoginForm } from '../components/LoginForm';
import { Spinner } from '../components/Spinner';

export function LoginPage() {
  const { isLoading, user } = db.useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/', { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return <Spinner />;
  if (user) return null; // redirect in progress

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-600">Pagu</h1>
          <p className="mt-2 text-sm text-gray-500">Admin panel — sign in to continue</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ProtectedLayout.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from './Spinner';

export function ProtectedLayout() {
  const { isLoading, user } = db.useAuth();

  // Query the app profile linked to the current auth user.
  // Pass null when there is no user to skip the query.
  const { isLoading: profileLoading, data } = db.useQuery(
    user ? { users: { $: { where: { '$users.id': user.id } } } } : null
  );
  const profile = data?.users?.[0];

  if (isLoading || (user && profileLoading)) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  if (!profile?.is_admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-gray-900">Access denied</p>
        <p className="text-sm text-gray-500">Your account does not have admin access.</p>
        <button
          onClick={() => db.auth.signOut()}
          className="rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Sign out
        </button>
      </div>
    );
  }

  return <Outlet />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/LoginForm.tsx src/pages/LoginPage.tsx src/components/ProtectedLayout.tsx
git commit -m "feat: add magic-code auth (LoginForm, LoginPage, ProtectedLayout)"
```

---

## Task 5: App Entry Point + Router

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 2: Create `src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedLayout } from './components/ProtectedLayout';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { MenuBuilderPage } from './pages/MenuBuilderPage';
import { MenuIngredientsPage } from './pages/MenuIngredientsPage';
import { MenuRenderPage } from './pages/MenuRenderPage';
import { MenuRenderPrintPage } from './pages/MenuRenderPrintPage';
import { MenuPreviewPage } from './pages/MenuPreviewPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          {/* Pages with nav/footer */}
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/users" replace />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/menu-builder" element={<MenuBuilderPage />} />
            <Route path="/menu-ingredients" element={<MenuIngredientsPage />} />
            <Route path="/menu-render" element={<MenuRenderPage />} />
          </Route>
          {/* Full-page views — no AppLayout nav */}
          <Route path="/menu-render-print" element={<MenuRenderPrintPage />} />
          <Route path="/menu-preview" element={<MenuPreviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Verify dev server starts and login page renders**

```bash
npm run dev
```

Open http://localhost:5173 — expect to see the login page (Pagu / Admin panel — sign in to continue).
Open http://localhost:5173/users — expect to redirect to `/login` (not yet signed in).

Expected: No TypeScript errors. Page component stubs don't exist yet so there will be import errors — create placeholder stubs to unblock:

Create each missing page file with a stub export (you will fill them in subsequent tasks):
```tsx
// Example stub — repeat for each missing page
export function UsersPage() { return <div>Users</div>; }
```

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/App.tsx src/pages/
git commit -m "feat: add Vite SPA entry point and React Router layout"
```

---

## Task 6: UsersPage

**Files:**
- Modify: `src/pages/UsersPage.tsx`

Convert `src/pages/users.astro` to a React component using `db.useQuery`.

- [ ] **Step 1: Write `src/pages/UsersPage.tsx`**

```tsx
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

export function UsersPage() {
  const { isLoading, error, data } = db.useQuery({ users: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const users = [...(data?.users ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Users</h1>
          <p className="mt-1 text-gray-500">{users.length} team members</p>
        </div>
        <button className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          + Invite user
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="transition hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={[
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    user.role === 'Owner' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600',
                  ].join(' ')}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={[
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                  ].join(' ')}>
                    <span className={[
                      'h-1.5 w-1.5 rounded-full',
                      user.active ? 'bg-green-500' : 'bg-red-400',
                    ].join(' ')} />
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify in browser**

After signing in (or after the migration runs), navigate to `/users`. Expect to see the users table populated with data.

- [ ] **Step 3: Commit**

```bash
git add src/pages/UsersPage.tsx
git commit -m "feat: add UsersPage with InstantDB useQuery"
```

---

## Task 7: ReviewsPage

**Files:**
- Modify: `src/pages/ReviewsPage.tsx`

Convert `src/pages/reviews.astro`.

- [ ] **Step 1: Write `src/pages/ReviewsPage.tsx`**

```tsx
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

const sourceIcon: Record<string, string> = {
  Google: '🔵',
  Yelp: '🔴',
  'In-app': '⭐',
};

export function ReviewsPage() {
  const { isLoading, error, data } = db.useQuery({ reviews: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const reviews = [...(data?.reviews ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const unReplied = reviews.filter((r) => !r.replied).length;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reviews</h1>
          <p className="mt-1 text-gray-500">
            {reviews.length} total · {unReplied} awaiting reply
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-3">
          <span className="text-2xl font-bold text-indigo-600">{avg.toFixed(1)}</span>
          <div>
            <div className="flex text-yellow-400 text-sm">
              {'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}
            </div>
            <p className="text-xs text-gray-500">avg rating</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600">
                  {review.author[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{review.author}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{sourceIcon[review.source] ?? '💬'} {review.source}</span>
                    <span>·</span>
                    <span>
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-yellow-400">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
                {review.replied ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    Replied
                  </span>
                ) : (
                  <button className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200">
                    Reply
                  </button>
                )}
              </div>
            </div>
            <p className="mt-4 leading-relaxed text-gray-600">{review.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ReviewsPage.tsx
git commit -m "feat: add ReviewsPage with InstantDB useQuery"
```

---

## Task 8: MenuBuilderPage

**Files:**
- Modify: `src/pages/MenuBuilderPage.tsx`

Convert `src/pages/menu-builder.astro`.

- [ ] **Step 1: Write `src/pages/MenuBuilderPage.tsx`**

```tsx
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuBuilderPage() {
  const { isLoading, error, data } = db.useQuery({ menuItems: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])].sort((a, b) =>
    a.section.localeCompare(b.section) || a.name.localeCompare(b.name)
  );
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Menu Builder</h1>
          <p className="mt-1 text-gray-500">
            {items.length} items across {sections.length} sections
          </p>
        </div>
        <button className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          + Add item
        </button>
      </div>

      <div className="space-y-10">
        {sections.map((section) => {
          const sectionItems = items.filter((i) => i.section === section);
          return (
            <div key={section}>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">{section}</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sectionItems.map((item) => (
                      <tr key={item.id} className="transition hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-gray-500">{item.description}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{formatPrice(item.price)}</td>
                        <td className="px-6 py-4">
                          <span className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
                          ].join(' ')}>
                            <span className={[
                              'h-1.5 w-1.5 rounded-full',
                              item.available ? 'bg-green-500' : 'bg-gray-400',
                            ].join(' ')} />
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MenuBuilderPage.tsx
git commit -m "feat: add MenuBuilderPage with InstantDB useQuery"
```

---

## Task 9: MenuIngredientsPage

**Files:**
- Modify: `src/pages/MenuIngredientsPage.tsx`

Convert `src/pages/menu-ingredients.astro`. Uses nested InstantDB query to replace `menuItemsWithIngredients.ts`.

- [ ] **Step 1: Write `src/pages/MenuIngredientsPage.tsx`**

The nested query `{ menuItems: { measuredIngredients: { ingredient: {} } } }` returns each menuItem with its `measuredIngredients` array, each of which has an `ingredient` object.

```tsx
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuIngredientsPage() {
  const { isLoading, error, data } = db.useQuery({
    menuItems: { measuredIngredients: { ingredient: {} } },
  });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])].sort((a, b) =>
    a.section.localeCompare(b.section) || a.name.localeCompare(b.name)
  );
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Menu Ingredients</h1>
        <p className="mt-1 text-gray-500">
          {items.length} items across {sections.length} sections
        </p>
      </div>

      <div className="space-y-10">
        {sections.map((section) => {
          const sectionItems = items.filter((i) => i.section === section);
          return (
            <div key={section}>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">{section}</h2>
              <div className="space-y-3">
                {sectionItems.map((item) => {
                  const measuredIngredients = item.measuredIngredients ?? [];
                  return (
                    <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <div className="flex items-baseline justify-between border-b border-gray-50 px-6 py-4">
                        <div>
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          {item.description && (
                            <span className="ml-2 text-sm text-gray-400">{item.description}</span>
                          )}
                        </div>
                        <span className="ml-4 shrink-0 text-sm font-medium text-gray-700">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      <div className="px-6 py-3">
                        {measuredIngredients.length === 0 ? (
                          <p className="text-sm italic text-gray-400">No ingredients listed</p>
                        ) : (
                          <ul className="flex flex-wrap gap-2">
                            {measuredIngredients.map((mi) => (
                              <li
                                key={mi.id}
                                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                              >
                                {mi.ingredient?.[0]?.name ?? '—'}
                                {(mi.amount || mi.unit) && (
                                  <span className="text-gray-400">
                                    {mi.amount}{mi.unit ? ` ${mi.unit}` : ''}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

**Note on nested query shape:** InstantDB returns links as arrays even for many-to-one links. `mi.ingredient` is an array; use `mi.ingredient?.[0]` to access the single linked ingredient.

- [ ] **Step 2: Commit**

```bash
git add src/pages/MenuIngredientsPage.tsx
git commit -m "feat: add MenuIngredientsPage with nested InstantDB query"
```

---

## Task 10: MenuRenderPage

**Files:**
- Modify: `src/pages/MenuRenderPage.tsx`

Convert `src/pages/menu-render.astro`. Filters to available items only.

- [ ] **Step 1: Write `src/pages/MenuRenderPage.tsx`**

```tsx
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuRenderPage() {
  const { isLoading, error, data } = db.useQuery({ menuItems: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-gray-900">Our Menu</h1>
      <p className="mb-12 text-gray-500">Fresh ingredients, served with care.</p>

      <div className="space-y-12">
        {sections.map((section) => (
          <div key={section}>
            <h2 className="mb-6 border-b border-gray-100 pb-3 text-xl font-bold tracking-tight text-gray-900">
              {section}
            </h2>
            <ul className="space-y-5">
              {items.filter((i) => i.section === section).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-6">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-gray-900">{formatPrice(item.price)}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MenuRenderPage.tsx
git commit -m "feat: add MenuRenderPage"
```

---

## Task 11: MenuRenderPrintPage + MenuPreviewPage

**Files:**
- Create: `src/styles/menu-print.css`
- Modify: `src/pages/MenuRenderPrintPage.tsx`
- Modify: `src/pages/MenuPreviewPage.tsx`

The two pages share all page-content CSS. Extract it to `menu-print.css`; each page has only its own outer-container styles as inline JSX or a small additional CSS block.

**Important:** The original pages hardcode sections `['Starters', 'Mains', 'Desserts']` that don't match the data. The new versions derive sections from the data and put all available items on a single page (since the multi-page split was based on wrong section names and needs redesign separately).

- [ ] **Step 1: Create `src/styles/menu-print.css`**

Copy the shared CSS (`.page-header`, `.menu-section`, `.menu-item`, `.menu-item-*`, `.leader`, `.menu-item-desc`, `.page-footer`) and the `@font-face` blocks. These classes are used identically in both pages.

```css
@font-face {
  font-family: 'Bryant Pro';
  src: url('/fonts/BryantPro-RegularAlternate.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Bryant Pro';
  src: url('/fonts/BryantPro-RegularItalic.otf') format('opentype');
  font-weight: 400;
  font-style: italic;
}
@font-face {
  font-family: 'Bryant Pro';
  src: url('/fonts/BryantPro-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Bryant Pro';
  src: url('/fonts/BryantPro-BoldItalic.otf') format('opentype');
  font-weight: 700;
  font-style: italic;
}

.page-header {
  text-align: center;
  border-bottom: 2px solid black;
  padding-bottom: 24px;
  margin-bottom: 40px;
}
.page-header h1 { font-size: 48px; font-weight: 700; letter-spacing: -0.02em; margin: 0; line-height: 1; }
.page-header p  { margin: 8px 0 0; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; color: #6b7280; }

.menu-section + .menu-section { margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e7eb; }
.menu-section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #6b7280; margin: 0 0 20px; }
.menu-section ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 20px; }

.menu-item       { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.menu-item-left  { flex: 1; }
.menu-item-name-row { display: flex; align-items: baseline; gap: 12px; }
.menu-item-name  { font-size: 15px; font-weight: 600; line-height: 1.375; white-space: nowrap; }
.leader          { flex: 1; border-bottom: 1px dotted #9ca3af; margin-bottom: 3px; }
.menu-item-desc  { font-size: 13px; color: #6b7280; margin: 2px 0 0; line-height: 1.4; }
.menu-item-price { font-size: 15px; font-weight: 600; white-space: nowrap; flex-shrink: 0; font-variant-numeric: tabular-nums; }

.page-footer { margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; font-size: 11px; color: #9ca3af; }
```

- [ ] **Step 2: Write `src/pages/MenuRenderPrintPage.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';
import '../styles/menu-print.css';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuRenderPrintPage() {
  const { isLoading, error, data } = db.useQuery({ menuItems: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div style={{ margin: 0, fontFamily: "'Bryant Pro', sans-serif", background: 'white', color: 'black' }}>
      <style>{`
        @page { size: A4; margin: 0; }
        body { margin: 0; }
        @media screen {
          body { background: #e5e7eb; }
          .print-page { box-sizing: border-box; width: 210mm; max-width: calc(100vw - 32px); padding: 20mm 18mm; margin: 32px auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,.15); border: 1px solid #d1d5db; }
          .no-print { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 10; background: #f3f4f6; padding: 12px 32px; font-size: 13px; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { box-sizing: border-box; width: 210mm; height: 297mm; margin: 0; padding: 20mm 18mm; break-after: page; overflow: hidden; }
          .print-page:last-child { break-after: auto; }
        }
      `}</style>

      <div className="no-print">
        <span>
          Print preview &mdash;{' '}
          <Link to="/menu-render" style={{ color: '#4f46e5' }}>back to screen version</Link>
          &nbsp;·&nbsp;
          <Link to="/menu-preview" style={{ color: '#4f46e5' }}>visual preview</Link>
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{ background: 'black', color: 'white', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="print-page">
        <div className="page-header">
          <h1>Pagu</h1>
          <p>Restaurant Menu</p>
        </div>
        {sections.map((section) => (
          <div key={section} className="menu-section">
            <h2>{section}</h2>
            <ul>
              {items.filter((i) => i.section === section).map((item) => (
                <li key={item.id} className="menu-item">
                  <div className="menu-item-left">
                    <div className="menu-item-name-row">
                      <span className="menu-item-name">{item.name}</span>
                      <span className="leader" />
                    </div>
                    <p className="menu-item-desc">{item.description}</p>
                  </div>
                  <span className="menu-item-price">{formatPrice(item.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="page-footer">
          Prices include applicable taxes. Menu subject to change.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/pages/MenuPreviewPage.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';
import '../styles/menu-print.css';

const PAGE_W = 794;
const PAGE_H = 1123;

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuPreviewPage() {
  const { isLoading, error, data } = db.useQuery({ menuItems: {} });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function applyScale() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const wraps = canvas.querySelectorAll<HTMLElement>('[data-page]');
      const available = canvas.clientWidth - 96;
      const scale = Math.min(1, available / PAGE_W);
      const scaledW = Math.round(PAGE_W * scale);
      const scaledH = Math.round(PAGE_H * scale);
      wraps.forEach((wrap) => {
        const page = wrap.querySelector<HTMLElement>('.page');
        if (!page) return;
        wrap.style.width = `${scaledW}px`;
        wrap.style.height = `${scaledH}px`;
        page.style.transform = `scale(${scale})`;
      });
    }
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, [data]);

  if (isLoading) return <Spinner />;
  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div style={{ margin: 0, fontFamily: "'Bryant Pro', sans-serif", background: '#2a2a2a' }}>
      <style>{`
        #toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #1a1a1a; color: #aaa; padding: 12px 24px; font-size: 13px; border-bottom: 1px solid #444; }
        #canvas  { display: flex; flex-wrap: wrap; justify-content: center; gap: 40px; padding: 48px 24px 80px; }
        .page-wrap { position: relative; flex-shrink: 0; }
        .page { position: absolute; top: 0; left: 0; width: ${PAGE_W}px; height: ${PAGE_H}px; background: white; box-shadow: 0 8px 40px rgba(0,0,0,.55); border: 1px solid #555; box-sizing: border-box; padding: 76px 68px; overflow: hidden; transform-origin: top left; color: black; }
        .page-footer-abs { position: absolute; bottom: 76px; left: 68px; right: 68px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; font-size: 11px; color: #9ca3af; }
        .page-num { position: absolute; bottom: 28px; right: 68px; font-size: 11px; color: #d1d5db; }
      `}</style>

      <div id="toolbar">
        <span>
          Menu preview &mdash;{' '}
          <Link to="/menu-render-print" style={{ color: '#818cf8' }}>open print page</Link>
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/menu-render" style={{ display: 'inline-block', background: 'white', color: 'black', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Screen version
          </Link>
          <button
            onClick={() => window.open('/menu-render-print')}
            style={{ background: 'white', color: 'black', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Print / PDF
          </button>
        </div>
      </div>

      <div id="canvas" ref={canvasRef}>
        <div className="page-wrap" data-page>
          <div className="page">
            <div className="page-header">
              <h1>Pagu</h1>
              <p>Restaurant Menu</p>
            </div>
            {sections.map((section) => (
              <div key={section} className="menu-section">
                <h2>{section}</h2>
                <ul>
                  {items.filter((i) => i.section === section).map((item) => (
                    <li key={item.id} className="menu-item">
                      <div className="menu-item-left">
                        <div className="menu-item-name-row">
                          <span className="menu-item-name">{item.name}</span>
                          <span className="leader" />
                        </div>
                        <p className="menu-item-desc">{item.description}</p>
                      </div>
                      <span className="menu-item-price">{formatPrice(item.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="page-footer-abs">
              Prices include applicable taxes. Menu subject to change.
            </div>
            <span className="page-num">1 / 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/styles/menu-print.css src/pages/MenuRenderPrintPage.tsx src/pages/MenuPreviewPage.tsx
git commit -m "feat: add MenuRenderPrintPage and MenuPreviewPage"
```

---

## Task 12: Migration Script

**Files:**
- Create: `scripts/migrate-to-instantdb.ts`

Reads all seed data and transacts it into InstantDB using the Admin SDK.

- [ ] **Step 1: Create `scripts/migrate-to-instantdb.ts`**

```ts
import { init } from '@instantdb/admin';
import { v5 as uuidv5 } from 'uuid';
import 'dotenv/config';

const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const APP_ID = process.env.VITE_INSTANT_APP_ID;

if (!ADMIN_TOKEN || !APP_ID) {
  console.error('Missing INSTANT_ADMIN_TOKEN or VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// ── Helpers ───────────────────────────────────────────────────────────────────

// InstantDB requires valid UUID v4-format entity IDs.
// We use UUID v5 (deterministic, based on a fixed namespace + key) so that
// re-running the script is safe — the same input always produces the same UUID.
const SEED_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID v5 namespace (URL)

function seedId(namespace: string, numericId: number): string {
  return uuidv5(`${namespace}:${numericId}`, SEED_NAMESPACE);
}

// ── Data ──────────────────────────────────────────────────────────────────────

const ingredients = [
  { id: 1,  name: 'lime' },
  { id: 2,  name: 'garlic' },
  { id: 3,  name: 'tamari' },
  { id: 4,  name: 'fish sauce' },
  { id: 5,  name: 'thai chili' },
  { id: 6,  name: 'pickled daikon' },
  { id: 7,  name: 'aji amarillo' },
  { id: 8,  name: 'ginger' },
  { id: 9,  name: 'maple' },
  { id: 10, name: 'arugula' },
  { id: 11, name: 'yuzu' },
  { id: 12, name: 'blood orange' },
  { id: 13, name: 'PAGU granola' },
  { id: 14, name: 'sherry vinegar' },
  { id: 15, name: 'cilantro' },
  { id: 16, name: 'sesame' },
  { id: 17, name: 'tomato' },
  { id: 18, name: 'picual olive oil' },
  { id: 19, name: 'pan de cristal' },
  { id: 20, name: 'anchovies' },
  { id: 21, name: 'vinegar' },
  { id: 22, name: 'togarashi' },
  { id: 23, name: 'thai chili alioli' },
  { id: 24, name: 'mojo verde' },
  { id: 25, name: 'thai chili hot sauce' },
  { id: 26, name: 'alioli' },
  { id: 27, name: 'pickled red onion' },
  { id: 28, name: "za'atar" },
  { id: 29, name: 'feta' },
  { id: 30, name: 'pickled cucumbers' },
  { id: 31, name: 'candied seeds' },
  { id: 32, name: 'pickled papaya' },
  { id: 33, name: 'thai basil alioli' },
  { id: 34, name: 'garlic-ginger marinade' },
  { id: 35, name: 'fried thai basil' },
  { id: 36, name: 'caramelized onion sauce' },
  { id: 37, name: "za'atar fries" },
  { id: 38, name: 'piquillo pepper' },
  { id: 39, name: 'pea puree' },
  { id: 40, name: 'koji corn' },
  { id: 41, name: 'woodear mushroom' },
  { id: 42, name: 'bao' },
  { id: 43, name: 'hot sauce' },
  { id: 44, name: 'romesco' },
  { id: 45, name: 'pickles' },
  { id: 46, name: 'kimchi' },
  { id: 47, name: 'cranberry hoisin' },
  { id: 48, name: 'seasoned nori' },
  { id: 49, name: 'sushi rice' },
  { id: 50, name: 'furikake' },
  { id: 51, name: 'citrus' },
  { id: 52, name: 'tamari lime sauce' },
  { id: 53, name: 'shiso' },
  { id: 54, name: 'pork' },
  { id: 55, name: 'mushrooms' },
  { id: 56, name: 'chili crisp' },
  { id: 57, name: 'scallions' },
  { id: 58, name: 'fried shallots' },
  { id: 59, name: 'soy egg' },
  { id: 60, name: 'pork belly' },
  { id: 61, name: 'nori' },
  { id: 62, name: 'ramen noodles' },
  { id: 63, name: 'shrimp' },
  { id: 64, name: 'coconut milk' },
  { id: 65, name: 'herbs' },
  { id: 66, name: 'sofrito' },
  { id: 67, name: 'turmeric' },
  { id: 68, name: 'peas' },
  { id: 69, name: 'green beans' },
  { id: 70, name: 'squash' },
  { id: 71, name: 'herb alioli' },
  { id: 72, name: 'confit duck leg' },
  { id: 73, name: 'shiitake' },
  { id: 74, name: 'sichuan peppercorn' },
  { id: 75, name: 'cornmeal' },
  { id: 76, name: 'dark chocolate' },
  { id: 77, name: 'maine blueberry sauce' },
  { id: 78, name: 'dark chocolate mousse' },
  { id: 79, name: 'coffee' },
  { id: 80, name: 'cacao nibs' },
  { id: 81, name: 'coconut' },
  { id: 82, name: 'passionfruit caramel' },
  { id: 83, name: 'jamón ibérico de bellota' },
];

const menuItems = [
  { id: 1,  name: 'Japanese Hamachi Crudo',          description: 'lime, garlic, tamari, fish sauce, thai chili',                                              section: 'Chilled',        price: 1800, available: true },
  { id: 2,  name: 'Tuna Tartare',                    description: 'pickled daikon, aji amarillo, ginger, maple',                                               section: 'Chilled',        price: 2000, available: true },
  { id: 3,  name: 'Roasted Beet & Burrata Salad',    description: 'arugula, yuzu, blood orange, PAGU granola',                                                 section: 'Chilled',        price: 1500, available: true },
  { id: 4,  name: 'Chilled Japanese Eggplant',       description: 'tamari, sherry vinegar, cilantro, sesame',                                                  section: 'Chilled',        price: 1100, available: true },
  { id: 5,  name: 'Aljomar Jamón Ibérico de Bellota',description: 'acorn-fed, 36-48 month aged spanish ham',                                                   section: 'Tapas',          price: 1700, available: true },
  { id: 6,  name: 'Pan Con Tomate',                  description: 'tomato, garlic, picual olive oil, pan de cristal',                                          section: 'Tapas',          price:  800, available: true },
  { id: 7,  name: 'Boquerones',                      description: 'anchovies, vinegar, togarashi, picual olive oil',                                           section: 'Tapas',          price:  800, available: true },
  { id: 8,  name: 'Patatas Bravas',                  description: 'thai chili alioli, mojo verde',                                                             section: 'Tapas',          price: 1200, available: true },
  { id: 9,  name: 'Tempura String Beans',            description: 'thai chili hot sauce, alioli, togarashi, sesame',                                           section: 'Tapas',          price: 1400, available: true },
  { id: 10, name: 'Black Cod Croquetas',             description: 'thai chili alioli, togarashi, pickled red onion',                                           section: 'Tapas',          price: 1500, available: true },
  { id: 11, name: 'Shio Koji Roasted Corn',          description: "za'atar, feta, alioli, lime, togarashi",                                                    section: 'Tapas',          price: 1400, available: true },
  { id: 12, name: 'Braised Pork Belly Bao',          description: 'pickled cucumbers, candied seeds',                                                          section: 'Baos',           price: 1600, available: true },
  { id: 13, name: 'Green Pea Bao',                   description: 'pickled papaya, thai basil alioli',                                                         section: 'Baos',           price: 1500, available: true },
  { id: 14, name: 'Chicken Karaage',                 description: 'garlic-ginger marinade, fried thai basil, thai chili alioli',                               section: 'Land & Sea',     price: 1800, available: true },
  { id: 15, name: 'Koji Marinated 8oz Mishima Wagyu Striploin', description: "caramelized onion sauce, za'atar fries, piquillo peppers",                       section: 'Land & Sea',     price: 5800, available: true },
  { id: 16, name: 'Miso Roasted Black Cod',          description: 'pea puree, koji corn, woodear mushroom',                                                    section: 'Land & Sea',     price: 3600, available: true },
  { id: 17, name: 'Suckling Pig',                    description: 'bao, hot sauce, romesco, pickles, kimchi, cranberry hoisin',                                section: 'Land & Sea',     price: 7200, available: true },
  { id: 18, name: 'Roasted Local Tuna Collar',       description: 'seasoned nori, sushi rice, furikake, pickled red onion, citrus, tamari lime sauce, shiso',  section: 'Land & Sea',     price: 9800, available: true },
  { id: 19, name: 'Spicy Knife Cut Noodles',         description: 'pork or mushrooms, sherry vinegar, chili crisp, scallions, fried shallots',                 section: 'Noodles & Rice', price: 1900, available: true },
  { id: 20, name: "2011 Guchi's Midnight Ramen",     description: 'soy egg, pork belly, chili crisp, scallions, nori',                                         section: 'Noodles & Rice', price: 1800, available: true },
  { id: 21, name: 'Green Crab Laksa',                description: 'ramen noodles, shrimp, coconut milk, chili crisp, fried shallots, herbs',                   section: 'Noodles & Rice', price: 2400, available: true },
  { id: 22, name: 'Veggie Paella',                   description: 'sofrito, turmeric, piquillo pepper, peas, mushrooms, green beans, squash, herb alioli',     section: 'Noodles & Rice', price: 1800, available: true },
  { id: 23, name: 'Duck Paella',                     description: 'confit duck leg, shiitake, sofrito, peas, sichuan peppercorn',                              section: 'Noodles & Rice', price: 3300, available: true },
  { id: 24, name: 'Matcha Cookie',                   description: 'cornmeal, dark chocolate',                                                                  section: 'Sweet',          price:  300, available: true },
  { id: 25, name: 'Yuzu Basque Burnt Cheesecake',    description: 'maine blueberry sauce',                                                                     section: 'Sweet',          price: 1400, available: true },
  { id: 26, name: 'Dark Chocolate Cake',             description: 'dark chocolate mousse, coffee, cacao nibs',                                                 section: 'Sweet',          price: 1300, available: true },
  { id: 27, name: 'Ube Panna Cotta',                 description: 'coconut, passionfruit caramel',                                                             section: 'Sweet',          price: 1200, available: true },
];

const reviews = [
  { id: 1, author: 'James L.',  rating: 5, body: "Absolutely incredible ramen. Best I've had outside of Japan. Will be back every week!", source: 'Google',  replied: true,  createdAt: '2025-11-02' },
  { id: 2, author: 'Sara M.',   rating: 4, body: 'Great food, cozy atmosphere. The gyoza were perfect. Service was a bit slow but worth the wait.', source: 'Yelp', replied: false, createdAt: '2025-11-15' },
  { id: 3, author: 'Kevin R.',  rating: 2, body: 'Waited 40 minutes and my order came out wrong. Food was okay once fixed but disappointing experience.', source: 'Google', replied: false, createdAt: '2025-12-01' },
  { id: 4, author: 'Priya S.',  rating: 5, body: 'The matcha ice cream is a must. Everything was fresh and beautifully presented.', source: 'In-app', replied: true,  createdAt: '2025-12-10' },
  { id: 5, author: 'Tom W.',    rating: 3, body: 'Decent place, nothing extraordinary. The curry was a bit bland for my taste but the portions were generous.', source: 'Yelp', replied: false, createdAt: '2026-01-08' },
  { id: 6, author: 'Mia C.',    rating: 5, body: 'My new favourite spot. The salmon teriyaki was cooked to perfection and the staff were so friendly.', source: 'Google', replied: true,  createdAt: '2026-01-22' },
  { id: 7, author: 'Luca F.',   rating: 1, body: 'Found a hair in my food. Staff apologised but the whole experience was ruined. Not returning.', source: 'In-app', replied: true,  createdAt: '2026-02-03' },
  { id: 8, author: 'Hana Y.',   rating: 5, body: 'Authentic flavours and lovely vibes. The mochi platter was a perfect end to the meal!', source: 'In-app', replied: false, createdAt: '2026-02-18' },
];

const users = [
  { id: 1, name: 'Alice Nguyen', email: 'alice@pagu.app', role: 'Owner',   active: true,  createdAt: '2024-01-10', is_admin: true },
  { id: 2, name: 'Bob Tanaka',   email: 'bob@pagu.app',   role: 'Manager', active: true,  createdAt: '2024-02-14', is_admin: false },
  { id: 3, name: 'Cara Diaz',    email: 'cara@pagu.app',  role: 'Staff',   active: true,  createdAt: '2024-03-01', is_admin: false },
  { id: 4, name: 'Dan Osei',     email: 'dan@pagu.app',   role: 'Staff',   active: false, createdAt: '2024-03-20', is_admin: false },
  { id: 5, name: 'Eva Kim',      email: 'eva@pagu.app',   role: 'Manager', active: true,  createdAt: '2024-04-05', is_admin: false },
];

// measuredIngredients: [{ id, menuItemId, ingredientId }]
const measuredIngredients = [
  { id:   1, menuItemId:  1, ingredientId:  1 }, { id:   2, menuItemId:  1, ingredientId:  2 },
  { id:   3, menuItemId:  1, ingredientId:  3 }, { id:   4, menuItemId:  1, ingredientId:  4 },
  { id:   5, menuItemId:  1, ingredientId:  5 }, { id:   6, menuItemId:  2, ingredientId:  6 },
  { id:   7, menuItemId:  2, ingredientId:  7 }, { id:   8, menuItemId:  2, ingredientId:  8 },
  { id:   9, menuItemId:  2, ingredientId:  9 }, { id:  10, menuItemId:  3, ingredientId: 10 },
  { id:  11, menuItemId:  3, ingredientId: 11 }, { id:  12, menuItemId:  3, ingredientId: 12 },
  { id:  13, menuItemId:  3, ingredientId: 13 }, { id:  14, menuItemId:  4, ingredientId:  3 },
  { id:  15, menuItemId:  4, ingredientId: 14 }, { id:  16, menuItemId:  4, ingredientId: 15 },
  { id:  17, menuItemId:  4, ingredientId: 16 }, { id:  18, menuItemId:  5, ingredientId: 83 },
  { id:  19, menuItemId:  6, ingredientId: 17 }, { id:  20, menuItemId:  6, ingredientId:  2 },
  { id:  21, menuItemId:  6, ingredientId: 18 }, { id:  22, menuItemId:  6, ingredientId: 19 },
  { id:  23, menuItemId:  7, ingredientId: 20 }, { id:  24, menuItemId:  7, ingredientId: 21 },
  { id:  25, menuItemId:  7, ingredientId: 22 }, { id:  26, menuItemId:  7, ingredientId: 18 },
  { id:  27, menuItemId:  8, ingredientId: 23 }, { id:  28, menuItemId:  8, ingredientId: 24 },
  { id:  29, menuItemId:  9, ingredientId: 25 }, { id:  30, menuItemId:  9, ingredientId: 26 },
  { id:  31, menuItemId:  9, ingredientId: 22 }, { id:  32, menuItemId:  9, ingredientId: 16 },
  { id:  33, menuItemId: 10, ingredientId: 23 }, { id:  34, menuItemId: 10, ingredientId: 22 },
  { id:  35, menuItemId: 10, ingredientId: 27 }, { id:  36, menuItemId: 11, ingredientId: 28 },
  { id:  37, menuItemId: 11, ingredientId: 29 }, { id:  38, menuItemId: 11, ingredientId: 26 },
  { id:  39, menuItemId: 11, ingredientId:  1 }, { id:  40, menuItemId: 11, ingredientId: 22 },
  { id:  41, menuItemId: 12, ingredientId: 30 }, { id:  42, menuItemId: 12, ingredientId: 31 },
  { id:  43, menuItemId: 13, ingredientId: 32 }, { id:  44, menuItemId: 13, ingredientId: 33 },
  { id:  45, menuItemId: 14, ingredientId: 34 }, { id:  46, menuItemId: 14, ingredientId: 35 },
  { id:  47, menuItemId: 14, ingredientId: 23 }, { id:  48, menuItemId: 15, ingredientId: 36 },
  { id:  49, menuItemId: 15, ingredientId: 37 }, { id:  50, menuItemId: 15, ingredientId: 38 },
  { id:  51, menuItemId: 16, ingredientId: 39 }, { id:  52, menuItemId: 16, ingredientId: 40 },
  { id:  53, menuItemId: 16, ingredientId: 41 }, { id:  54, menuItemId: 17, ingredientId: 42 },
  { id:  55, menuItemId: 17, ingredientId: 43 }, { id:  56, menuItemId: 17, ingredientId: 44 },
  { id:  57, menuItemId: 17, ingredientId: 45 }, { id:  58, menuItemId: 17, ingredientId: 46 },
  { id:  59, menuItemId: 17, ingredientId: 47 }, { id:  60, menuItemId: 18, ingredientId: 48 },
  { id:  61, menuItemId: 18, ingredientId: 49 }, { id:  62, menuItemId: 18, ingredientId: 50 },
  { id:  63, menuItemId: 18, ingredientId: 27 }, { id:  64, menuItemId: 18, ingredientId: 51 },
  { id:  65, menuItemId: 18, ingredientId: 52 }, { id:  66, menuItemId: 18, ingredientId: 53 },
  { id:  67, menuItemId: 19, ingredientId: 54 }, { id:  68, menuItemId: 19, ingredientId: 55 },
  { id:  69, menuItemId: 19, ingredientId: 14 }, { id:  70, menuItemId: 19, ingredientId: 56 },
  { id:  71, menuItemId: 19, ingredientId: 57 }, { id:  72, menuItemId: 19, ingredientId: 58 },
  { id:  73, menuItemId: 20, ingredientId: 59 }, { id:  74, menuItemId: 20, ingredientId: 60 },
  { id:  75, menuItemId: 20, ingredientId: 56 }, { id:  76, menuItemId: 20, ingredientId: 57 },
  { id:  77, menuItemId: 20, ingredientId: 61 }, { id:  78, menuItemId: 21, ingredientId: 62 },
  { id:  79, menuItemId: 21, ingredientId: 63 }, { id:  80, menuItemId: 21, ingredientId: 64 },
  { id:  81, menuItemId: 21, ingredientId: 56 }, { id:  82, menuItemId: 21, ingredientId: 58 },
  { id:  83, menuItemId: 21, ingredientId: 65 }, { id:  84, menuItemId: 22, ingredientId: 66 },
  { id:  85, menuItemId: 22, ingredientId: 67 }, { id:  86, menuItemId: 22, ingredientId: 38 },
  { id:  87, menuItemId: 22, ingredientId: 68 }, { id:  88, menuItemId: 22, ingredientId: 55 },
  { id:  89, menuItemId: 22, ingredientId: 69 }, { id:  90, menuItemId: 22, ingredientId: 70 },
  { id:  91, menuItemId: 22, ingredientId: 71 }, { id:  92, menuItemId: 23, ingredientId: 72 },
  { id:  93, menuItemId: 23, ingredientId: 73 }, { id:  94, menuItemId: 23, ingredientId: 66 },
  { id:  95, menuItemId: 23, ingredientId: 68 }, { id:  96, menuItemId: 23, ingredientId: 74 },
  { id:  97, menuItemId: 24, ingredientId: 75 }, { id:  98, menuItemId: 24, ingredientId: 76 },
  { id:  99, menuItemId: 25, ingredientId: 77 }, { id: 100, menuItemId: 26, ingredientId: 78 },
  { id: 101, menuItemId: 26, ingredientId: 79 }, { id: 102, menuItemId: 26, ingredientId: 80 },
  { id: 103, menuItemId: 27, ingredientId: 81 }, { id: 104, menuItemId: 27, ingredientId: 82 },
];

// ── Migration ─────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('Migrating ingredients…');
  await db.transact(
    ingredients.map((ing) =>
      db.tx.ingredients[seedId('ing', ing.id)].update({ name: ing.name })
    )
  );

  console.log('Migrating menuItems…');
  await db.transact(
    menuItems.map((item) =>
      db.tx.menuItems[seedId('menu', item.id)].update({
        name: item.name,
        description: item.description,
        section: item.section,
        price: item.price,
        available: item.available,
      })
    )
  );

  console.log('Migrating reviews…');
  await db.transact(
    reviews.map((r) =>
      db.tx.reviews[seedId('rev', r.id)].update({
        author: r.author,
        rating: r.rating,
        body: r.body,
        source: r.source,
        replied: r.replied,
        createdAt: r.createdAt,
      })
    )
  );

  console.log('Migrating users…');
  await db.transact(
    users.map((u) =>
      db.tx.users[seedId('user', u.id)].update({
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
        is_admin: u.is_admin,
      })
    )
  );

  console.log('Migrating measuredIngredients + links…');
  await db.transact(
    measuredIngredients.flatMap((mi) => [
      db.tx.measuredIngredients[seedId('mi', mi.id)].update({}),
      db.tx.measuredIngredients[seedId('mi', mi.id)].link({
        menuItem: seedId('menu', mi.menuItemId),
        ingredient: seedId('ing', mi.ingredientId),
      }),
    ])
  );

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the migration**

```bash
npx tsx scripts/migrate-to-instantdb.ts
```

Expected output:
```
Migrating ingredients…
Migrating menuItems…
Migrating reviews…
Migrating users…
Migrating measuredIngredients + links…
Migration complete.
```

If it fails with a permissions error, verify `INSTANT_ADMIN_TOKEN` and `VITE_INSTANT_APP_ID` are set in `.env`.

- [ ] **Step 3: Verify data in InstantDB dashboard**

Open the InstantDB dashboard → Explorer. Confirm all 5 namespaces have records. Check that a `measuredIngredients` record shows linked `menuItem` and `ingredient` entries.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-to-instantdb.ts
git commit -m "feat: add InstantDB migration script"
```

---

## Task 13: Bootstrap Admin Script

**Files:**
- Create: `scripts/bootstrap-admin.ts`

Run after first sign-in to link the `$users` auth identity to the `users` profile and set `is_admin: true`.

- [ ] **Step 1: Create `scripts/bootstrap-admin.ts`**

```ts
import { init } from '@instantdb/admin';
import 'dotenv/config';

const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const APP_ID = process.env.VITE_INSTANT_APP_ID;

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/bootstrap-admin.ts <email>');
  process.exit(1);
}
if (!ADMIN_TOKEN || !APP_ID) {
  console.error('Missing INSTANT_ADMIN_TOKEN or VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function bootstrap() {
  // 1. Find the $users auth identity by email.
  // db.auth.getUser() throws if the user is not found — catch it explicitly.
  let authUser: { id: string };
  try {
    authUser = await db.auth.getUser({ email });
  } catch {
    console.error(`No $users record found for ${email}. Sign in first via the magic code flow.`);
    process.exit(1);
  }
  console.log(`Found $users record: ${authUser.id}`);

  // 2. Find the users profile record by email
  const result = await db.query({ users: { $: { where: { email } } } });
  const profile = result.users?.[0];
  if (!profile) {
    console.error(`No users profile found with email ${email}. Run the migration script first.`);
    process.exit(1);
  }
  console.log(`Found users profile: ${profile.id}`);

  // 3. Set is_admin and link $users → users.
  // The link must be established FROM the $users namespace (forward link direction).
  // The forward link name is 'users' (configured in the dashboard as $users.users).
  await db.transact([
    db.tx.users[profile.id].update({ is_admin: true }),
    db.tx['$users'][authUser.id].link({ users: profile.id }),
  ]);

  console.log(`Done. ${email} is now an admin.`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the bootstrap flow**

1. Start the dev server: `npm run dev`
2. Open http://localhost:5173/login in a browser
3. Enter your email and complete the magic code flow
4. You will see "Access denied" — that is expected
5. Run the bootstrap script with your email:

```bash
npx tsx scripts/bootstrap-admin.ts your@email.com
```

Expected:
```
Found $users record: <id>
Found users profile: <id>
Done. your@email.com is now an admin.
```

6. Refresh the browser — you should now land on `/users`

- [ ] **Step 3: Commit**

```bash
git add scripts/bootstrap-admin.ts
git commit -m "feat: add bootstrap-admin script"
```

---

## Task 14: Delete Astro Files

Once all pages are verified working in the browser, remove all Astro source files.

- [ ] **Step 1: Delete Astro source files**

```bash
rm astro.config.mjs
rm src/pages/index.astro src/pages/users.astro src/pages/reviews.astro
rm src/pages/menu-builder.astro src/pages/menu-ingredients.astro
rm src/pages/menu-render.astro src/pages/menu-render-print.astro src/pages/menu-preview.astro
rm src/layouts/Layout.astro
rm src/components/FeatureCard.astro
rm src/components/admin/TodoPage.tsx
rm src/queries/menuItemsWithIngredients.ts
```

- [ ] **Step 2: Delete AstroDB files**

```bash
rm db/config.ts db/seed.ts
rm -f drizzle.config.ts
```

- [ ] **Step 3: Verify the build still passes**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove all Astro source files and AstroDB config"
```

---

## Completion Checklist

After all tasks, verify:

- [ ] `npm run dev` starts without errors
- [ ] `/login` shows the magic code form
- [ ] Unauthenticated visit to `/users` redirects to `/login`
- [ ] After signing in, landing on `/` redirects to `/users`
- [ ] All 7 protected pages render with data from InstantDB
- [ ] `/menu-render-print` renders with correct section names (`Chilled`, `Tapas`, etc.)
- [ ] `/menu-preview` scales correctly on resize
- [ ] Sign-out button in nav clears session and redirects to `/login`
- [ ] `npx tsx scripts/bootstrap-admin.ts <email>` prints "Done. X is now an admin."
- [ ] InstantDB dashboard → Explorer shows the `$users → users` link on your profile record
- [ ] `npm run build` succeeds
