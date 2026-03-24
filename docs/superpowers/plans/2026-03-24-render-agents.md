# Render Agent System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI agent chat system to pagu-admin that reads/writes ingredient files on the local filesystem and syncs via git push to pagu-db.

**Architecture:** Hono server gets a new `/api/chat` endpoint. Claude API reasons about ingredient data using tools that call the same filesystem functions as the existing ingredient API. Agent writes are committed and pushed to pagu-db. React frontend adds a chat sidebar.

**Tech Stack:** Hono (Node.js), React 19, Anthropic SDK, Node.js child_process (git), InstantDB (auth)

---

## File Structure (new/modified files only)

```
server/
  src/
    index.ts                    # Modified: add chat route
    routes/
      ingredients.ts            # Unchanged
      chat.ts                   # New: chat endpoint with SSE streaming
    lib/
      agent-tools.ts            # New: tool definitions + execution
      git.ts                    # New: git commit + push helper
app/
  src/
    components/
      ChatPanel.tsx             # New: sliding chat sidebar
      AppLayout.tsx             # Modified: add chat toggle button
```

---

## Task 1: Add Anthropic SDK dependency

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install the Anthropic SDK**

```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin
pnpm --filter server add @anthropic-ai/sdk
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to .env**

Append to `.env`:
```
ANTHROPIC_API_KEY=your-key-here
```

- [ ] **Step 3: Add ANTHROPIC_API_KEY to .env.example**

Append to `.env.example`:
```
# Used by the agent chat system for Claude API calls
ANTHROPIC_API_KEY=your-anthropic-api-key
```

- [ ] **Step 4: Commit**

```bash
git add server/package.json pnpm-lock.yaml .env.example
git commit -m "chore: add Anthropic SDK dependency"
```

---

## Task 2: Git helper for agent commits

**Files:**
- Create: `server/src/lib/git.ts`
- Test: `server/src/lib/git.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/src/lib/git.test.ts
import { describe, it, expect, vi } from 'vitest';
import { gitCommitAndPush } from './git';
import { execFile } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

describe('gitCommitAndPush', () => {
  it('runs git add, commit, and push in sequence', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(null, '', '');
      return {} as any;
    });

    await gitCommitAndPush('/data/pagu-db', 'ingredients/NEW.json', 'Add new ingredient');

    expect(mockExecFile).toHaveBeenCalledTimes(3);
    expect(mockExecFile.mock.calls[0][1]).toEqual(['add', 'ingredients/NEW.json']);
    expect(mockExecFile.mock.calls[1][1]).toEqual(['commit', '-m', 'Add new ingredient']);
    expect(mockExecFile.mock.calls[2][1]).toEqual(['push', 'origin', 'main']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec vitest run src/lib/git.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement git helper**

```ts
// server/src/lib/git.ts
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

export async function gitCommitAndPush(
  repoPath: string,
  filePath: string,
  message: string,
): Promise<void> {
  const opts = { cwd: repoPath };
  await execFile('git', ['add', filePath], opts);
  await execFile('git', ['commit', '-m', message], opts);
  await execFile('git', ['push', 'origin', 'main'], opts);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter server exec vitest run src/lib/git.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/git.ts server/src/lib/git.test.ts
git commit -m "feat: add git commit and push helper for agent writes"
```

---

## Task 3: Agent tools (list, read, write ingredients)

**Files:**
- Create: `server/src/lib/agent-tools.ts`
- Test: `server/src/lib/agent-tools.test.ts`

- [ ] **Step 1: Write failing test for list_ingredients**

```ts
// server/src/lib/agent-tools.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeToolCall } from './agent-tools';
import * as fs from 'node:fs/promises';
import * as git from './git';

vi.mock('node:fs/promises');
vi.mock('./git');

const REPO = '/data/pagu-db';

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('list_ingredients returns sorted file names', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      'SOY_SAUCE.json', 'APPLE.json', 'README.md',
    ] as any);

    const result = await executeToolCall(REPO, 'list_ingredients', {});
    const parsed = JSON.parse(result);

    expect(parsed).toEqual(['APPLE.json', 'SOY_SAUCE.json']);
    expect(fs.readdir).toHaveBeenCalledWith('/data/pagu-db/ingredients');
  });

  it('read_ingredient returns file content', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{"id":"APPLE","production_type":"purchasable"}');

    const result = await executeToolCall(REPO, 'read_ingredient', { id: 'APPLE' });

    expect(result).toBe('{"id":"APPLE","production_type":"purchasable"}');
    expect(fs.readFile).toHaveBeenCalledWith('/data/pagu-db/ingredients/APPLE.json', 'utf-8');
  });

  it('write_ingredient writes file and commits', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue();
    vi.mocked(git.gitCommitAndPush).mockResolvedValue();

    const result = await executeToolCall(REPO, 'write_ingredient', {
      id: 'NEW',
      content: '{"id":"NEW","production_type":"purchasable"}',
      message: 'Add new ingredient',
    });

    expect(result).toContain('Successfully wrote');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/data/pagu-db/ingredients/NEW.json',
      '{"id":"NEW","production_type":"purchasable"}',
      'utf-8',
    );
    expect(git.gitCommitAndPush).toHaveBeenCalledWith(
      '/data/pagu-db',
      'ingredients/NEW.json',
      'Add new ingredient',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec vitest run src/lib/agent-tools.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement agent tools**

```ts
// server/src/lib/agent-tools.ts
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { gitCommitAndPush } from './git.js';

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'list_ingredients',
    description: 'List all ingredient files in the database',
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
    description: 'Create or update an ingredient JSON file and commit it to the repository',
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
  repoPath: string,
  toolName: string,
  input: Record<string, string>,
): Promise<string> {
  const ingredientsDir = path.join(repoPath, 'ingredients');

  switch (toolName) {
    case 'list_ingredients': {
      const files = await readdir(ingredientsDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
      return JSON.stringify(jsonFiles);
    }
    case 'read_ingredient': {
      const content = await readFile(
        path.join(ingredientsDir, `${input.id}.json`),
        'utf-8',
      );
      return content;
    }
    case 'write_ingredient': {
      const filePath = path.join(ingredientsDir, `${input.id}.json`);
      await writeFile(filePath, input.content, 'utf-8');
      await gitCommitAndPush(repoPath, `ingredients/${input.id}.json`, input.message);
      return `Successfully wrote ingredients/${input.id}.json and pushed to remote`;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter server exec vitest run src/lib/agent-tools.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/agent-tools.ts server/src/lib/agent-tools.test.ts
git commit -m "feat: add agent tool definitions for ingredient CRUD"
```

---

## Task 4: Chat endpoint with SSE streaming

**Files:**
- Create: `server/src/routes/chat.ts`
- Modify: `server/src/index.ts` (mount chat route)

- [ ] **Step 1: Create chat route**

```ts
// server/src/routes/chat.ts
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_TOOLS, executeToolCall } from '../lib/agent-tools.js';

const SYSTEM_PROMPT = `You are Pagu Assistant, an AI helper for the Pagu restaurant admin dashboard.
You help manage ingredients in the restaurant's database. You can list, read, and create/update ingredient files.
Each ingredient is a JSON file with fields: id, production_type, type, unit, and optionally ingredients (for recipes), instructions, directions, equipment.
Be concise and helpful. When creating ingredients, follow the existing JSON format.`;

export function chatRoutes(repoPath: string) {
  const app = new Hono();

  app.post('/', async (c) => {
    // Auth check: require a token (frontend sends InstantDB user token)
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { messages } = await c.req.json<{
      messages: Anthropic.MessageParam[];
    }>();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    return streamSSE(c, async (stream) => {
      let currentMessages = [...messages];

      // Agent loop: keep going while Claude wants to use tools
      while (true) {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: AGENT_TOOLS,
          messages: currentMessages,
        });

        // Send content blocks to the client
        for (const block of response.content) {
          if (block.type === 'text') {
            await stream.writeSSE({ data: JSON.stringify({ type: 'text', text: block.text }) });
          } else if (block.type === 'tool_use') {
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

        // Execute tool calls and continue the loop
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeToolCall(
              repoPath,
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

- [ ] **Step 2: Mount chat route in index.ts**

Add to `server/src/index.ts` after the ingredients route:

```ts
import { chatRoutes } from './routes/chat.js';

// After: app.route('/api/ingredients', ingredientRoutes(repoPath));
app.route('/api/chat', chatRoutes(repoPath));
```

- [ ] **Step 3: Run `pnpm dev` and test with curl**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"messages":[{"role":"user","content":"List all ingredients"}]}'
```

Expected: SSE stream with tool_use events followed by text response

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/chat.ts server/src/index.ts
git commit -m "feat: add chat endpoint with Claude agent loop and SSE streaming"
```

---

## Task 5: Chat panel frontend component

**Files:**
- Create: `app/src/components/ChatPanel.tsx`
- Modify: `app/src/components/AppLayout.tsx`

- [ ] **Step 1: Create ChatPanel.tsx**

```tsx
// app/src/components/ChatPanel.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../lib/db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolEvent {
  type: 'tool_use' | 'tool_result';
  name: string;
}

function parseSSELines(buffer: string): { events: string[]; remaining: string } {
  const events: string[] = [];
  const lines = buffer.split('\n');
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.refresh_token}`,
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
            try {
              const data = JSON.parse(eventData);
              if (data.type === 'text') {
                assistantText += data.text;
                setMessages([...newMessages, { role: 'assistant', content: assistantText }]);
              } else if (data.type === 'tool_use') {
                setToolEvents((prev) => [...prev, { type: 'tool_use', name: data.name }]);
              } else if (data.type === 'tool_result') {
                setToolEvents((prev) => [...prev, { type: 'tool_result', name: data.name }]);
              }
            } catch {
              // skip malformed events
            }
          }
        }
      }
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : err}`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, user]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l border-gray-200 bg-white shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Pagu Assistant</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Ask me about ingredients, recipes, or menu items.
          </p>
        )}
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
        {loading && toolEvents.length === 0 && (
          <div className="text-xs text-gray-400 italic">Thinking...</div>
        )}
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
            disabled={loading || !input.trim()}
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

- [ ] **Step 2: Add chat toggle to AppLayout.tsx**

Modify `app/src/components/AppLayout.tsx`:

```tsx
// Add imports at top:
import { useState } from 'react';
import { ChatPanel } from './ChatPanel';

// Inside AppLayout, add state:
const [chatOpen, setChatOpen] = useState(false);

// Add button before the Sign out button in the nav:
<button
  type="button"
  onClick={() => setChatOpen((o) => !o)}
  className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600"
>
  Assistant
</button>

// After closing </> fragment, before the return ends, add ChatPanel:
// Change the fragment to include ChatPanel after </footer>:
<ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
```

- [ ] **Step 3: Run `pnpm dev` and verify**

- Click "Assistant" button in nav — chat panel slides in from right
- Type a message — sends to `/api/chat` and streams response
- Agent can list/read/write ingredients

- [ ] **Step 4: Commit**

```bash
git add app/src/components/ChatPanel.tsx app/src/components/AppLayout.tsx
git commit -m "feat: add chat panel UI with SSE streaming"
```

---

## Task 6: Deploy and verify

- [ ] **Step 1: Add vitest to server if not present**

```bash
pnpm --filter server add -D vitest
```

- [ ] **Step 2: Run all tests**

```bash
pnpm --filter server exec vitest run
```

Expected: all PASS

- [ ] **Step 3: Set environment variables on Render**

Via Render dashboard or API, set:
- `VITE_INSTANT_APP_ID` — your InstantDB app ID
- `ANTHROPIC_API_KEY` — your Claude API key
- `INSTANT_ADMIN_TOKEN` — InstantDB admin token (for scripts)

- [ ] **Step 4: Push to deploy**

```bash
git push origin main
```

Render auto-deploys from main. The first deploy will clone pagu-db to the persistent disk.

- [ ] **Step 5: Verify at https://pagu-admin.onrender.com**

- SPA loads and routes work
- `/api/ingredients` returns data
- Chat panel opens and agent responds
- Agent can write an ingredient (check pagu-db for new commits)

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: deployment adjustments"
```
