# Cloudflare Workers + AI Agent System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate pagu-admin from a Node.js monorepo to a single Cloudflare Workers project, swap the filesystem-based ingredient API to GitHub API, and add an AI agent chat system.

**Architecture:** Single Cloudflare Worker serves both the React SPA (as static assets) and the Hono API. The ingredient API reads/writes JSON files in the `markwatabe/pagu-db` GitHub repo via the Contents API. A chat endpoint streams Claude API responses with tool-use for ingredient CRUD. Cron Triggers run background validation agents.

**Tech Stack:** Hono (Cloudflare Workers), React 19, Vite + @cloudflare/vite-plugin, Tailwind CSS 4, GitHub Contents API, Claude API (Anthropic SDK), Cloudflare KV, InstantDB (auth)

---

## File Structure

```
pagu-admin/
├── src/
│   ├── worker/
│   │   ├── index.ts                  # Hono app entry point (Worker export)
│   │   ├── routes/
│   │   │   ├── ingredients.ts        # Ingredient API (GitHub-backed)
│   │   │   └── chat.ts              # Chat endpoint (Claude + tools)
│   │   ├── lib/
│   │   │   ├── github.ts            # GitHub Contents API client
│   │   │   └── agent-tools.ts       # Tool definitions for Claude
│   │   └── cron.ts                  # Scheduled event handler
│   ├── app/                          # React SPA (moved from app/src/)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── lib/
│   │   │   └── db.ts
│   │   ├── components/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── ProtectedLayout.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── ChatPanel.tsx         # New: sliding chat sidebar
│   │   │   └── print-layout/        # Existing print layout components
│   │   └── pages/                    # Existing pages (unchanged)
│   └── styles/                       # Existing styles
├── wrangler.jsonc                    # Cloudflare Worker config
├── vite.config.ts                    # Vite + Cloudflare plugin
├── package.json                      # Single package (no workspaces)
├── tsconfig.json
├── .dev.vars                         # Local secrets (gitignored)
├── index.html                        # SPA entry point
└── REPO/                             # Kept for reference, no longer used at runtime
```

---

## Task 1: Restructure project from monorepo to single Cloudflare project

**Files:**
- Create: `wrangler.jsonc`
- Create: `.dev.vars`
- Modify: `package.json` (merge app + server deps, new scripts)
- Modify: `vite.config.ts` (move from `app/`, add Cloudflare plugin)
- Move: `app/src/` → `src/app/`
- Move: `server/src/` → `src/worker/`
- Move: `app/index.html` → `index.html`
- Delete: `app/package.json`, `server/package.json`, `pnpm-workspace.yaml`, `app/vite.config.ts`

- [ ] **Step 1: Create `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "pagu-admin",
  "main": "./src/worker/index.ts",
  "compatibility_date": "2026-03-24",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "not_found_handling": "single-page-application"
  },
  "kv_namespaces": [
    {
      "binding": "AGENT_LOGS",
      "id": "PLACEHOLDER"
    }
  ],
  "vars": {
    "GITHUB_REPO": "markwatabe/pagu-db"
  },
  "triggers": {
    "crons": ["0 8 * * *"]
  }
}
```

- [ ] **Step 2: Create `.dev.vars`**

```
GITHUB_TOKEN=ghp_PLACEHOLDER
ANTHROPIC_API_KEY=sk-ant-PLACEHOLDER
```

- [ ] **Step 3: Add `.dev.vars` to `.gitignore`**

Append `.dev.vars` to the existing `.gitignore`.

- [ ] **Step 4: Move source files to new structure**

```bash
mkdir -p src/worker src/app
# Move app source
mv app/src/* src/app/
# Move server source
mv server/src/* src/worker/
# Move index.html to root
mv app/index.html index.html
# Clean up empty directories
rm -rf app/src server/src
```

- [ ] **Step 5: Update `index.html` script src**

Change the script `src` from `/src/main.tsx` to `/src/app/main.tsx`.

- [ ] **Step 6: Create merged `package.json`**

```json
{
  "name": "pagu-admin",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "deploy": "vite build && wrangler deploy",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "cf-typegen": "wrangler types"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.50.0",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/utilities": "^3.2.2",
    "@instantdb/react": "^0.22.169",
    "hono": "^4.7.0",
    "liquidjs": "^10.25.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.2",
    "tailwindcss": "^4.2.2"
  },
  "devDependencies": {
    "@cloudflare/vite-plugin": "^1.15.0",
    "@tailwindcss/vite": "^4.2.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "jsdom": "^29.0.1",
    "vite": "^8.0.2",
    "vitest": "^4.1.0",
    "wrangler": "^4.56.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

- [ ] **Step 7: Create `vite.config.ts` at project root**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src/app') },
  },
});
```

- [ ] **Step 8: Delete old workspace files**

```bash
rm -rf app/package.json app/vite.config.ts app/tsconfig.json server/package.json server/tsconfig.json pnpm-workspace.yaml app/ server/
```

- [ ] **Step 9: Create `tsconfig.json` at project root**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/app/*"]
    }
  },
  "include": ["src/**/*", "worker-configuration.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 10: Update import paths in moved files**

Grep for `@/` imports and verify they resolve correctly with the new alias (`src/app/`). Fix any broken relative imports. Internal structure within `src/app/` is preserved, so most relative imports should be fine.

- [ ] **Step 11: Add `VITE_INSTANT_APP_ID` to `.env`**

Create `.env.example` at root (committed) and `.env` (gitignored):
```bash
# .env.example (committed — shows what's needed)
VITE_INSTANT_APP_ID=

# .env (gitignored — actual values for local dev)
VITE_INSTANT_APP_ID=<your-actual-app-id>
```

Add `.env` to `.gitignore`. For production builds, set `VITE_INSTANT_APP_ID` as a Cloudflare environment variable (in wrangler.jsonc `vars` or via `wrangler vars set`).

Note: `.dev.vars` is for Worker runtime secrets. `.env` is for Vite build-time vars. Both are gitignored.

- [ ] **Step 12: Run `pnpm install`**

```bash
pnpm install
```

- [ ] **Step 13: Run `pnpm cf-typegen`**

Generates the `Env` type with `AGENT_LOGS`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `GITHUB_REPO` bindings into `worker-configuration.d.ts`.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "refactor: collapse monorepo into single Cloudflare Workers project"
```

---

## Task 2: GitHub API client for pagu-db

**Files:**
- Create: `src/worker/lib/github.ts`
- Test: `src/worker/lib/github.test.ts`

- [ ] **Step 1: Write failing test for `listFiles`**

```ts
// src/worker/lib/github.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GitHubClient } from './github';

describe('GitHubClient', () => {
  it('listFiles returns file names from directory listing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { name: 'APPLE.json', type: 'file' },
        { name: 'GARLIC.json', type: 'file' },
      ]),
    });

    const client = new GitHubClient('fake-token', 'owner/repo', mockFetch);
    const files = await client.listFiles('ingredients');

    expect(files).toEqual(['APPLE.json', 'GARLIC.json']);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/contents/ingredients',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/worker/lib/github.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `GitHubClient` implementation**

```ts
// src/worker/lib/github.ts
export class GitHubClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private fetchFn: typeof fetch;

  constructor(token: string, repo: string, fetchFn: typeof fetch = fetch) {
    this.baseUrl = `https://api.github.com/repos/${repo}/contents`;
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'pagu-admin',
    };
    this.fetchFn = fetchFn;
  }

  async listFiles(dir: string): Promise<string[]> {
    const res = await this.fetchFn(`${this.baseUrl}/${dir}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const items: { name: string; type: string }[] = await res.json();
    return items.filter((i) => i.type === 'file').map((i) => i.name);
  }

  async readFile(filePath: string): Promise<{ content: string; sha: string }> {
    const res = await this.fetchFn(`${this.baseUrl}/${filePath}`, {
      headers: this.headers,
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error('File not found');
      throw new Error(`GitHub API error: ${res.status}`);
    }
    const data: { content: string; sha: string } = await res.json();
    // Decode base64 safely for non-ASCII content (e.g., Japanese text)
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
    const content = new TextDecoder().decode(bytes);
    return { content, sha: data.sha };
  }

  async writeFile(
    filePath: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<void> {
    const body: Record<string, string> = {
      message,
      // Encode safely for non-ASCII content (e.g., Japanese text)
      content: btoa(String.fromCharCode(...new TextEncoder().encode(content))),
    };
    if (sha) body.sha = sha;

    const res = await this.fetchFn(`${this.baseUrl}/${filePath}`, {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/worker/lib/github.test.ts`
Expected: PASS

- [ ] **Step 5: Add tests for `readFile` and `writeFile`**

```ts
// append to github.test.ts
it('readFile decodes base64 content', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      content: btoa('{"id":"APPLE"}'),
      sha: 'abc123',
    }),
  });

  const client = new GitHubClient('fake-token', 'owner/repo', mockFetch);
  const result = await client.readFile('ingredients/APPLE.json');

  expect(result.content).toBe('{"id":"APPLE"}');
  expect(result.sha).toBe('abc123');
});

it('writeFile sends PUT with base64 content', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ ok: true });

  const client = new GitHubClient('fake-token', 'owner/repo', mockFetch);
  await client.writeFile(
    'ingredients/NEW.json',
    '{"id":"NEW"}',
    'Add new ingredient',
  );

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('ingredients/NEW.json'),
    expect.objectContaining({ method: 'PUT' }),
  );
});

it('readFile throws on 404', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

  const client = new GitHubClient('fake-token', 'owner/repo', mockFetch);
  await expect(client.readFile('missing.json')).rejects.toThrow('File not found');
});
```

- [ ] **Step 6: Run all tests**

Run: `pnpm vitest run src/worker/lib/github.test.ts`
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/worker/lib/github.ts src/worker/lib/github.test.ts
git commit -m "feat: add GitHub Contents API client for pagu-db"
```

---

## Task 3: Migrate ingredient routes from filesystem to GitHub API

**Files:**
- Modify: `src/worker/routes/ingredients.ts` (rewrite)
- Modify: `src/worker/index.ts` (rewrite for Worker export)
- Test: `src/worker/routes/ingredients.test.ts`

- [ ] **Step 1: Write failing test for GET /api/ingredients**

```ts
// src/worker/routes/ingredients.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { ingredientRoutes } from './ingredients';

function mockGitHub(files: { name: string; content: string }[]) {
  return {
    listFiles: vi.fn().mockResolvedValue(files.map((f) => f.name)),
    readFile: vi.fn().mockImplementation(async (path: string) => {
      const name = path.split('/').pop()!;
      const file = files.find((f) => f.name === name);
      if (!file) throw new Error('File not found');
      return { content: file.content, sha: 'abc' };
    }),
    writeFile: vi.fn(),
  };
}

function createApp(github: ReturnType<typeof mockGitHub>) {
  const app = new Hono();
  // Simulate the middleware that sets github on context
  app.use('/*', async (c, next) => {
    c.set('github', github);
    await next();
  });
  app.route('/api/ingredients', ingredientRoutes());
  return app;
}

describe('ingredient routes', () => {
  it('GET / lists ingredients sorted by name', async () => {
    const github = mockGitHub([
      { name: 'SOY_SAUCE.json', content: '{"id":"SOY_SAUCE","production_type":"purchasable"}' },
      { name: 'APPLE.json', content: '{"id":"APPLE","production_type":"purchasable","type":"produce"}' },
    ]);

    const app = createApp(github);
    const res = await app.request('/api/ingredients');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data[0].name).toBe('Apple');
    expect(data[1].name).toBe('Soy Sauce');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/worker/routes/ingredients.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite `ingredients.ts` to use GitHubClient**

```ts
// src/worker/routes/ingredients.ts
import { Hono } from 'hono';
import type { GitHubClient } from '../lib/github';

type Env = {
  Bindings: { GITHUB_TOKEN: string; GITHUB_REPO: string; ANTHROPIC_API_KEY: string; AGENT_LOGS: KVNamespace };
  Variables: { github: GitHubClient };
};

function titleCase(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function ingredientRoutes() {
  const app = new Hono<Env>();

  app.get('/', async (c) => {
    const github = c.get('github');
    const fileNames = await github.listFiles('ingredients');
    const jsonFiles = fileNames.filter((f) => f.endsWith('.json'));

    const ingredients = await Promise.all(
      jsonFiles.map(async (file) => {
        const { content } = await github.readFile(`ingredients/${file}`);
        const data = JSON.parse(content);
        return {
          id: data.id,
          name: data.name ?? titleCase(data.id),
          production_type: data.production_type,
          ingredient_type: data.ingredient_type,
          type: data.type,
          hasRecipe: Array.isArray(data.ingredients) && data.ingredients.length > 0,
        };
      }),
    );

    ingredients.sort((a, b) => a.name.localeCompare(b.name));
    return c.json(ingredients);
  });

  app.get('/:id', async (c) => {
    const github = c.get('github');
    const id = c.req.param('id');

    let content: string;
    try {
      const result = await github.readFile(`ingredients/${id}.json`);
      content = result.content;
    } catch {
      return c.json({ error: 'Ingredient not found' }, 404);
    }

    const data = JSON.parse(content);
    data.name = data.name ?? titleCase(data.id);

    // Resolve sub-ingredient names using cached directory listing
    if (Array.isArray(data.ingredients)) {
      const allFiles = await github.listFiles('ingredients');
      const nameCache = new Map<string, string>();

      data.ingredients = await Promise.all(
        data.ingredients.map(async ([amount, unit, ingredientId]: [number, string, string]) => {
          let name = titleCase(ingredientId);
          if (allFiles.includes(`${ingredientId}.json`) && !nameCache.has(ingredientId)) {
            try {
              const { content: subRaw } = await github.readFile(`ingredients/${ingredientId}.json`);
              const subData = JSON.parse(subRaw);
              nameCache.set(ingredientId, subData.name ?? titleCase(subData.id));
            } catch {
              // fallback to titleCase
            }
          }
          if (nameCache.has(ingredientId)) name = nameCache.get(ingredientId)!;
          return { amount, unit, ingredientId, name };
        }),
      );
    }

    return c.json(data);
  });

  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/worker/routes/ingredients.test.ts`
Expected: PASS

- [ ] **Step 5: Rewrite `src/worker/index.ts` as Worker entry point**

```ts
// src/worker/index.ts
import { Hono } from 'hono';
import { GitHubClient } from './lib/github';
import { ingredientRoutes } from './routes/ingredients';
import { handleScheduled } from './cron';

type Bindings = {
  GITHUB_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  GITHUB_REPO: string;
  AGENT_LOGS: KVNamespace;
};

type Variables = {
  github: GitHubClient;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware: create GitHubClient per request
app.use('/api/*', async (c, next) => {
  c.set('github', new GitHubClient(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO));
  await next();
});

// Mount ingredient routes — ingredientRoutes now reads github from context
app.route('/api/ingredients', ingredientRoutes());

app.get('/api/agent-status', async (c) => {
  const result = await c.env.AGENT_LOGS.get('last-validation-run');
  if (!result) return c.json({ message: 'No runs yet' });
  return c.json(JSON.parse(result));
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const github = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
    ctx.waitUntil(handleScheduled(github, env.AGENT_LOGS));
  },
};
```

Note: This uses the object export form from the start (with both `fetch` and `scheduled`), and sets `github` on Hono context via middleware instead of the fragile `routes.fetch()` sub-app pattern.

- [ ] **Step 6: Run `pnpm dev` and verify the app loads**

Run: `pnpm dev`
Expected: Vite dev server starts, SPA loads at localhost, `/api/ingredients` returns data from GitHub

- [ ] **Step 7: Commit**

```bash
git add src/worker/ src/worker/routes/ingredients.test.ts
git commit -m "feat: migrate ingredient API from filesystem to GitHub Contents API"
```

---

## Task 4: Agent tools and chat endpoint

**Files:**
- Create: `src/worker/lib/agent-tools.ts`
- Create: `src/worker/routes/chat.ts`
- Test: `src/worker/lib/agent-tools.test.ts`

- [ ] **Step 1: Write failing test for tool definitions**

```ts
// src/worker/lib/agent-tools.test.ts
import { describe, it, expect, vi } from 'vitest';
import { executeToolCall } from './agent-tools';

describe('executeToolCall', () => {
  it('list_ingredients returns ingredient names', async () => {
    const github = {
      listFiles: vi.fn().mockResolvedValue(['APPLE.json', 'SOY_SAUCE.json']),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };

    const result = await executeToolCall(github as any, 'list_ingredients', {});
    expect(result).toContain('APPLE.json');
    expect(result).toContain('SOY_SAUCE.json');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/worker/lib/agent-tools.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement agent tools**

```ts
// src/worker/lib/agent-tools.ts
import type { GitHubClient } from './github';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'list_ingredients',
    description: 'List all ingredient files in the pagu-db repository',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_ingredient',
    description: 'Read the full JSON content of a specific ingredient file',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Ingredient ID (e.g., APPLE_CORED_PEELED)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'write_ingredient',
    description: 'Create or update an ingredient JSON file in the repository',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Ingredient ID (e.g., NEW_INGREDIENT)' },
        content: { type: 'string', description: 'Full JSON content for the ingredient file' },
        message: { type: 'string', description: 'Git commit message describing the change' },
      },
      required: ['id', 'content', 'message'],
    },
  },
];

export async function executeToolCall(
  github: GitHubClient,
  toolName: string,
  input: Record<string, string>,
): Promise<string> {
  switch (toolName) {
    case 'list_ingredients': {
      const files = await github.listFiles('ingredients');
      return JSON.stringify(files);
    }
    case 'read_ingredient': {
      const { content } = await github.readFile(`ingredients/${input.id}.json`);
      return content;
    }
    case 'write_ingredient': {
      let sha: string | undefined;
      try {
        const existing = await github.readFile(`ingredients/${input.id}.json`);
        sha = existing.sha;
      } catch {
        // New file, no sha needed
      }
      await github.writeFile(
        `ingredients/${input.id}.json`,
        input.content,
        input.message,
        sha,
      );
      return `Successfully wrote ingredients/${input.id}.json`;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/worker/lib/agent-tools.test.ts`
Expected: PASS

- [ ] **Step 5: Add tests for `read_ingredient` and `write_ingredient`**

```ts
// append to agent-tools.test.ts
it('read_ingredient returns file content', async () => {
  const github = {
    listFiles: vi.fn(),
    readFile: vi.fn().mockResolvedValue({ content: '{"id":"APPLE"}', sha: 'abc' }),
    writeFile: vi.fn(),
  };

  const result = await executeToolCall(github as any, 'read_ingredient', { id: 'APPLE' });
  expect(result).toBe('{"id":"APPLE"}');
  expect(github.readFile).toHaveBeenCalledWith('ingredients/APPLE.json');
});

it('write_ingredient creates new file', async () => {
  const github = {
    listFiles: vi.fn(),
    readFile: vi.fn().mockRejectedValue(new Error('not found')),
    writeFile: vi.fn(),
  };

  const result = await executeToolCall(github as any, 'write_ingredient', {
    id: 'NEW',
    content: '{"id":"NEW"}',
    message: 'Add new ingredient',
  });

  expect(result).toContain('Successfully wrote');
  expect(github.writeFile).toHaveBeenCalledWith(
    'ingredients/NEW.json',
    '{"id":"NEW"}',
    'Add new ingredient',
    undefined,
  );
});
```

- [ ] **Step 6: Run all tests**

Run: `pnpm vitest run src/worker/lib/agent-tools.test.ts`
Expected: all PASS

- [ ] **Step 7: Commit tools**

```bash
git add src/worker/lib/agent-tools.ts src/worker/lib/agent-tools.test.ts
git commit -m "feat: add agent tool definitions for ingredient CRUD"
```

- [ ] **Step 8: Create chat route with SSE streaming**

```ts
// src/worker/routes/chat.ts
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import type { GitHubClient } from '../lib/github';
import { AGENT_TOOLS, executeToolCall } from '../lib/agent-tools';

const SYSTEM_PROMPT = `You are Pagu Assistant, an AI helper for the Pagu restaurant admin dashboard.
You help manage ingredients in the restaurant's database. You can list, read, and create/update ingredient files.
Each ingredient is a JSON file with fields: id, production_type, type, unit, and optionally ingredients (for recipes), instructions, directions, equipment.
Be concise and helpful. When creating ingredients, follow the existing JSON format.`;

type Env = {
  Bindings: { GITHUB_TOKEN: string; ANTHROPIC_API_KEY: string; GITHUB_REPO: string; AGENT_LOGS: KVNamespace };
  Variables: { github: GitHubClient };
};

export function chatRoutes() {
  const app = new Hono<Env>();

  // Auth middleware: verify InstantDB token
  app.use('/*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    // TODO: verify InstantDB token with InstantDB admin SDK
    // For v1, presence of a token is sufficient since the frontend
    // only sends requests when the user is authenticated
    await next();
  });

  app.post('/', async (c) => {
    const github = c.get('github');
    const { messages } = await c.req.json<{
      messages: Anthropic.MessageParam[];
    }>();

    const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });

    return streamSSE(c, async (stream) => {
      let currentMessages = [...messages];

      // Agent loop: keep going while Claude wants to use tools
      while (true) {
        // Use streaming for real-time text delivery
        const streamResponse = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: AGENT_TOOLS,
          messages: currentMessages,
        });

        // Stream text deltas as they arrive
        streamResponse.on('text', async (text) => {
          await stream.writeSSE({ data: JSON.stringify({ type: 'text_delta', text }) });
        });

        const response = await streamResponse.finalMessage();

        // Send tool use events
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            await stream.writeSSE({
              data: JSON.stringify({ type: 'tool_use', name: block.name, input: block.input }),
            });
          }
        }

        // If no tool use, we're done
        if (response.stop_reason !== 'tool_use') {
          await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) });
          break;
        }

        // Execute tool calls and continue
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeToolCall(
              github,
              block.name,
              block.input as Record<string, string>,
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
    });
  });

  return app;
}
```

- [ ] **Step 9: Wire chat route into `src/worker/index.ts`**

Add to the Hono app in `index.ts`:

```ts
import { chatRoutes } from './routes/chat';

// After the ingredients route:
app.route('/api/chat', chatRoutes());
```

- [ ] **Step 10: Commit**

```bash
git add src/worker/routes/chat.ts src/worker/index.ts
git commit -m "feat: add chat endpoint with Claude agent loop and SSE streaming"
```

---

## Task 5: Chat panel frontend component

**Files:**
- Create: `src/app/components/ChatPanel.tsx`
- Modify: `src/app/components/AppLayout.tsx` (add chat toggle button)

- [ ] **Step 1: Create `ChatPanel.tsx`**

```tsx
// src/app/components/ChatPanel.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../lib/db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolEvent {
  type: 'tool_use' | 'tool_result';
  name: string;
  input?: Record<string, unknown>;
  result?: string;
}

// Parse SSE lines from a stream, handling events that span chunk boundaries
function parseSSELines(buffer: string): { events: string[]; remaining: string } {
  const events: string[] = [];
  const lines = buffer.split('\n');
  // Last element may be incomplete — keep it as remaining
  const remaining = lines.pop() ?? '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      events.push(line.slice(6));
    }
  }
  return { events, remaining };
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = db.useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolEvents]);

  const send = useCallback(async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setToolEvents([]);

    try {
      // Get the current user's refresh token for auth header
      // Note: verify the exact InstantDB API for getting user tokens
      // at implementation time — may be user.token or db.auth.getToken()
      const token = user.refresh_token;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let sseBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const { events, remaining } = parseSSELines(sseBuffer);
          sseBuffer = remaining;

          for (const eventData of events) {
            const data = JSON.parse(eventData);

            if (data.type === 'text_delta') {
              assistantText += data.text;
              setMessages([...newMessages, { role: 'assistant', content: assistantText }]);
            } else if (data.type === 'tool_use') {
              setToolEvents((prev) => [...prev, { type: 'tool_use', name: data.name, input: data.input }]);
            } else if (data.type === 'tool_result') {
              setToolEvents((prev) => [...prev, { type: 'tool_result', name: data.name, result: data.result }]);
            }
          }
        }
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, user]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l border-gray-200 bg-white shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Pagu Assistant</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block max-w-[80%] rounded-xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {toolEvents.map((evt, i) => (
          <div key={`tool-${i}`} className="text-xs text-gray-400 italic">
            {evt.type === 'tool_use' ? `Using ${evt.name}...` : `${evt.name} done`}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about ingredients..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={send}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add chat toggle to `AppLayout.tsx`**

Add a chat button to the header and render `ChatPanel`:

```tsx
// In AppLayout.tsx, add:
import { useState } from 'react';
import { ChatPanel } from './ChatPanel';

// Inside AppLayout component, add state:
const [chatOpen, setChatOpen] = useState(false);

// Add button to header nav (before sign out button):
<button
  type="button"
  onClick={() => setChatOpen((o) => !o)}
  className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600"
>
  Assistant
</button>

// After </footer>, add:
<ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
```

- [ ] **Step 3: Run `pnpm dev` and verify chat panel opens/closes**

Expected: clicking "Assistant" toggles the sliding panel

- [ ] **Step 4: Commit**

```bash
git add src/app/components/ChatPanel.tsx src/app/components/AppLayout.tsx
git commit -m "feat: add chat panel UI with SSE streaming"
```

---

## Task 6: Background cron validation agent

**Files:**
- Create: `src/worker/cron.ts`
- Create: `src/worker/cron.test.ts`
- Create: `src/app/components/AgentStatus.tsx`
- Modify: `src/app/components/AppLayout.tsx` (add agent status)

Note: The `scheduled` handler and `/api/agent-status` endpoint are already wired in `index.ts` from Task 3.

- [ ] **Step 1: Write failing test for cron handler**

```ts
// src/worker/cron.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handleScheduled } from './cron';

describe('handleScheduled', () => {
  it('writes validation results to KV', async () => {
    const github = {
      listFiles: vi.fn().mockResolvedValue(['APPLE.json', 'BAD.json']),
      readFile: vi.fn().mockImplementation(async (path: string) => {
        if (path.includes('BAD')) return { content: '{"id":"BAD"}', sha: 'x' };
        return { content: '{"id":"APPLE","production_type":"purchasable"}', sha: 'x' };
      }),
    };
    const kv = { put: vi.fn(), get: vi.fn() };

    await handleScheduled(github as any, kv as any);

    expect(kv.put).toHaveBeenCalledWith('last-validation-run', expect.any(String));
    const result = JSON.parse(kv.put.mock.calls[0][1]);
    expect(result.filesChecked).toBe(2);
    expect(result.issuesFound).toBe(1);
    expect(result.issues[0].file).toBe('BAD.json');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/worker/cron.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the cron handler**

```ts
// src/worker/cron.ts
import { GitHubClient } from './lib/github';

const REQUIRED_FIELDS = ['id', 'production_type'];

interface ValidationIssue {
  file: string;
  issues: string[];
}

export async function handleScheduled(
  github: GitHubClient,
  kv: KVNamespace,
): Promise<void> {
  const files = await github.listFiles('ingredients');
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const issues: ValidationIssue[] = [];

  for (const file of jsonFiles) {
    const { content } = await github.readFile(`ingredients/${file}`);
    const data = JSON.parse(content);
    const fileIssues: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      if (!data[field]) {
        fileIssues.push(`Missing required field: ${field}`);
      }
    }

    if (fileIssues.length > 0) {
      issues.push({ file, issues: fileIssues });
    }
  }

  const result = {
    timestamp: new Date().toISOString(),
    filesChecked: jsonFiles.length,
    issuesFound: issues.length,
    issues,
  };

  await kv.put('last-validation-run', JSON.stringify(result));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/worker/cron.test.ts`
Expected: PASS

- [ ] **Step 5: Run `pnpm dev` and verify `/api/agent-status` returns**

Expected: `{"message":"No runs yet"}` initially (the scheduled handler and endpoint are already wired in `index.ts`)

- [ ] **Step 6: Create `AgentStatus.tsx` component**

```tsx
// src/app/components/AgentStatus.tsx
import { useEffect, useState } from 'react';

interface ValidationResult {
  timestamp: string;
  filesChecked: number;
  issuesFound: number;
  issues: { file: string; issues: string[] }[];
}

export function AgentStatus() {
  const [status, setStatus] = useState<ValidationResult | null>(null);

  useEffect(() => {
    fetch('/api/agent-status')
      .then((r) => r.json())
      .then((data) => {
        if (data.timestamp) setStatus(data);
      })
      .catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700">Last Validation Run</h3>
      <p className="mt-1 text-xs text-gray-500">
        {new Date(status.timestamp).toLocaleString()} — {status.filesChecked} files checked
      </p>
      {status.issuesFound > 0 ? (
        <p className="mt-1 text-xs text-amber-600">{status.issuesFound} issue(s) found</p>
      ) : (
        <p className="mt-1 text-xs text-green-600">All files valid</p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Add `AgentStatus` to the dashboard**

In `AppLayout.tsx`, import and render `<AgentStatus />` in the footer area or as a small widget on the main layout.

- [ ] **Step 8: Commit**

```bash
git add src/worker/cron.ts src/worker/cron.test.ts src/app/components/AgentStatus.tsx src/app/components/AppLayout.tsx
git commit -m "feat: add daily cron validation agent with KV logging and status UI"
```

---

## Task 7: Deploy to Cloudflare

- [ ] **Step 1: Create KV namespaces**

```bash
pnpm wrangler kv namespace create AGENT_LOGS
pnpm wrangler kv namespace create AGENT_LOGS --preview
```

Copy the production `id` into `wrangler.jsonc` replacing `"PLACEHOLDER"`. Copy the preview `id` as `preview_id` in the same KV config block (needed for `wrangler dev` to work locally).

- [ ] **Step 2: Set secrets**

```bash
pnpm wrangler secret put GITHUB_TOKEN
pnpm wrangler secret put ANTHROPIC_API_KEY
```

- [ ] **Step 3: Deploy**

```bash
pnpm deploy
```

- [ ] **Step 4: Verify deployment**

Visit the deployed URL. Check:
- SPA loads and routes work
- `/api/ingredients` returns data from GitHub
- Chat panel sends messages and gets responses
- Cron trigger is registered (check Cloudflare dashboard)

- [ ] **Step 5: Commit any deployment config updates**

```bash
git add wrangler.jsonc
git commit -m "chore: add KV namespace ID for deployment"
```
