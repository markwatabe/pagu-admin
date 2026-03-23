# Print Layout Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a split-panel React component for visually designing printed pages with draggable, Liquid-templated nodes and a live class/template editor.

**Architecture:** A `usePrintLayout` hook owns all state (nodes, scale, dataModel). `PrintLayoutEditor` renders a scaled preview canvas on the left (nodes are absolutely positioned and draggable via @dnd-kit) and a `ClassEditor` panel on the right (visual pickers + raw class string + Liquid template textarea). Scale-aware drag delta correction happens in the DndContext `onDragEnd` handler using a ref to the current scale value.

**Tech Stack:** React 19, TypeScript, Tailwind v4, @dnd-kit/core, @dnd-kit/utilities, liquidjs, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-23-print-layout-editor-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/components/print-layout/types.ts` | All shared types + `MM_TO_PX` constant |
| `src/components/print-layout/classTokens.ts` | Pure functions for picker↔class string sync |
| `src/components/print-layout/usePrintLayout.ts` | All editor state + mutations |
| `src/components/print-layout/ClassEditor.tsx` | Right panel: pickers, class string, template |
| `src/components/print-layout/NodeDragHandle.tsx` | Per-node: drag wrapper + Liquid render + selection |
| `src/components/print-layout/PreviewCanvas.tsx` | Scaled page canvas + DndContext |
| `src/components/print-layout/PrintLayoutEditor.tsx` | Top-level: toolbar + two-panel layout |
| `src/test/setup.ts` | Vitest global setup (jest-dom matchers) |
| `vitest.config.ts` | Vitest configuration |
| `src/styles/global.css` | Add `@source inline(...)` for dynamic Tailwind tokens |
| `src/pages/layout-editor.astro` | Demo page for manual smoke testing |

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add test script)
- Modify: `tsconfig.json` (add vitest types)

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install @dnd-kit/core @dnd-kit/utilities liquidjs
```

Expected: packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected: packages added to `devDependencies`.

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Add test script to `package.json`**

In the `"scripts"` section, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Add vitest types to `tsconfig.json`**

Add `"types": ["vitest/globals"]` inside `compilerOptions`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "types": ["vitest/globals"]
  }
}
```

- [ ] **Step 7: Verify Vitest works**

```bash
npx vitest run --reporter=verbose
```

Expected: "No test files found" (no errors, just 0 tests).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json package-lock.json tsconfig.json
git commit -m "chore: add @dnd-kit, liquidjs, vitest"
```

---

## Task 2: Types and class token utilities

**Files:**
- Create: `src/components/print-layout/types.ts`
- Create: `src/components/print-layout/classTokens.ts`
- Create: `src/test/classTokens.test.ts`

- [ ] **Step 1: Create `src/components/print-layout/types.ts`**

```ts
export const MM_TO_PX = 96 / 25.4

export interface LayoutNode {
  id: string
  x: number        // logical px, pre-scale
  y: number
  width: number
  height: number
  classes: string  // Tailwind class string
  template: string // Liquid template source
}

export interface PrintLayoutState {
  nodes: LayoutNode[]
  selectedNodeId: string | null
  scale: number
  dataModel: Record<string, unknown>
  pageWidth: number   // mm
  pageHeight: number  // mm
}

export interface UsePrintLayoutReturn extends PrintLayoutState {
  addNode: (node?: Partial<LayoutNode>) => void
  removeNode: (id: string) => void
  updateNode: (id: string, patch: Partial<LayoutNode>) => void
  setSelectedNodeId: (id: string | null) => void
  setScale: (scale: number) => void
  setDataModel: (model: Record<string, unknown>) => void
}
```

- [ ] **Step 2: Write failing tests for `classTokens.ts`**

Create `src/test/classTokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  FONT_SIZE_TOKENS,
  FONT_WEIGHT_TOKENS,
  TEXT_ALIGN_TOKENS,
  TEXT_COLOR_TOKENS,
  getActiveToken,
  applyToken,
} from '../components/print-layout/classTokens'

describe('getActiveToken', () => {
  it('returns matching token from class string', () => {
    expect(getActiveToken('font-bold text-center mb-4', FONT_WEIGHT_TOKENS)).toBe('font-bold')
  })

  it('returns undefined when no category token present', () => {
    expect(getActiveToken('mb-4 p-2', FONT_SIZE_TOKENS)).toBeUndefined()
  })

  it('returns first match when multiple category tokens present (malformed string)', () => {
    expect(getActiveToken('text-sm text-lg', FONT_SIZE_TOKENS)).toBe('text-sm')
  })

  it('does not match text-sm as a color token', () => {
    expect(getActiveToken('text-sm', TEXT_COLOR_TOKENS)).toBeUndefined()
  })

  it('does not match text-gray-500 as a size token', () => {
    expect(getActiveToken('text-gray-500', FONT_SIZE_TOKENS)).toBeUndefined()
  })
})

describe('applyToken', () => {
  it('appends token when category has no existing token', () => {
    expect(applyToken('mb-4', FONT_SIZE_TOKENS, 'text-lg')).toBe('mb-4 text-lg')
  })

  it('replaces existing category token', () => {
    expect(applyToken('text-sm font-bold', FONT_SIZE_TOKENS, 'text-xl')).toBe('font-bold text-xl')
  })

  it('preserves unknown tokens when replacing', () => {
    expect(applyToken('mb-4 text-sm p-2', FONT_SIZE_TOKENS, 'text-2xl')).toBe('mb-4 p-2 text-2xl')
  })

  it('handles empty class string', () => {
    expect(applyToken('', FONT_WEIGHT_TOKENS, 'font-bold')).toBe('font-bold')
  })

  it('does not accidentally remove text-gray-500 when changing size', () => {
    const result = applyToken('text-sm text-gray-500', FONT_SIZE_TOKENS, 'text-xl')
    expect(result).toContain('text-gray-500')
    expect(result).toContain('text-xl')
    expect(result).not.toContain('text-sm')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/test/classTokens.test.ts --reporter=verbose
```

Expected: FAIL — "Cannot find module '../components/print-layout/classTokens'"

- [ ] **Step 4: Create `src/components/print-layout/classTokens.ts`**

```ts
export const FONT_SIZE_TOKENS = [
  'text-xs', 'text-sm', 'text-base', 'text-lg',
  'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
] as const

export const FONT_WEIGHT_TOKENS = [
  'font-normal', 'font-semibold', 'font-bold',
] as const

export const TEXT_ALIGN_TOKENS = [
  'text-left', 'text-center', 'text-right',
] as const

export const TEXT_COLOR_TOKENS = [
  'text-black', 'text-white',
  'text-gray-500', 'text-gray-700',
  'text-indigo-600', 'text-red-600',
] as const

type TokenCategory = readonly string[]

export function getActiveToken(classes: string, category: TokenCategory): string | undefined {
  return classes.split(' ').filter(Boolean).find(t => (category as string[]).includes(t))
}

export function applyToken(classes: string, category: TokenCategory, newToken: string): string {
  const tokens = classes.split(' ').filter(Boolean)
  const filtered = tokens.filter(t => !(category as string[]).includes(t))
  return [...filtered, newToken].join(' ')
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/test/classTokens.test.ts --reporter=verbose
```

Expected: all 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/print-layout/types.ts src/components/print-layout/classTokens.ts src/test/classTokens.test.ts
git commit -m "feat: add types, MM_TO_PX, and class token utilities"
```

---

## Task 3: `usePrintLayout` hook

**Files:**
- Create: `src/components/print-layout/usePrintLayout.ts`
- Create: `src/test/usePrintLayout.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/usePrintLayout.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrintLayout } from '../components/print-layout/usePrintLayout'

describe('usePrintLayout', () => {
  describe('initial state', () => {
    it('uses default state when no initialState given', () => {
      const { result } = renderHook(() => usePrintLayout())
      expect(result.current.nodes).toEqual([])
      expect(result.current.selectedNodeId).toBeNull()
      expect(result.current.scale).toBe(0.6)
      expect(result.current.pageWidth).toBe(210)
      expect(result.current.pageHeight).toBe(297)
    })

    it('merges provided initialState over defaults', () => {
      const { result } = renderHook(() =>
        usePrintLayout({ scale: 0.8, pageWidth: 148 })
      )
      expect(result.current.scale).toBe(0.8)
      expect(result.current.pageWidth).toBe(148)
      expect(result.current.pageHeight).toBe(297) // default
    })
  })

  describe('addNode', () => {
    it('adds a node with default fields when called with no args', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.addNode() })
      expect(result.current.nodes).toHaveLength(1)
      const node = result.current.nodes[0]
      expect(node.x).toBe(20)
      expect(node.y).toBe(20)
      expect(node.width).toBe(200)
      expect(node.height).toBe(80)
      expect(node.classes).toBe('')
      expect(node.template).toBe('')
      expect(node.id).toBeTruthy()
    })

    it('merges provided partial over defaults', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.addNode({ x: 100, template: 'hello' }) })
      expect(result.current.nodes[0].x).toBe(100)
      expect(result.current.nodes[0].template).toBe('hello')
      expect(result.current.nodes[0].y).toBe(20)
    })

    it('appends to end of nodes array (last = on top)', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.addNode({ id: 'a' }) })
      act(() => { result.current.addNode({ id: 'b' }) })
      expect(result.current.nodes[1].id).toBe('b')
    })
  })

  describe('removeNode', () => {
    it('removes a node by id', () => {
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }] })
      )
      act(() => { result.current.removeNode('x') })
      expect(result.current.nodes).toHaveLength(0)
    })

    it('clears selectedNodeId if removed node was selected', () => {
      const { result } = renderHook(() =>
        usePrintLayout({
          nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }],
          selectedNodeId: 'x',
        })
      )
      act(() => { result.current.removeNode('x') })
      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('updateNode', () => {
    it('patches only specified fields', () => {
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 10, y: 20, width: 100, height: 50, classes: 'font-bold', template: 'hi' }] })
      )
      act(() => { result.current.updateNode('x', { x: 99 }) })
      const node = result.current.nodes[0]
      expect(node.x).toBe(99)
      expect(node.y).toBe(20)
      expect(node.classes).toBe('font-bold')
    })
  })

  describe('setSelectedNodeId', () => {
    it('sets selection', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.setSelectedNodeId('abc') })
      expect(result.current.selectedNodeId).toBe('abc')
    })

    it('clears selection with null', () => {
      const { result } = renderHook(() => usePrintLayout({ selectedNodeId: 'abc' }))
      act(() => { result.current.setSelectedNodeId(null) })
      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('setScale', () => {
    it('updates scale', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.setScale(1.0) })
      expect(result.current.scale).toBe(1.0)
    })
  })

  describe('setDataModel', () => {
    it('updates dataModel', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.setDataModel({ name: 'Pagu' }) })
      expect(result.current.dataModel).toEqual({ name: 'Pagu' })
    })
  })

  describe('onChange callback', () => {
    it('fires on addNode', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.addNode() })
      expect(onChange).toHaveBeenCalledOnce()
      expect(onChange.mock.calls[0][0].nodes).toHaveLength(1)
    })

    it('fires on removeNode', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }] }, onChange)
      )
      act(() => { result.current.removeNode('x') })
      expect(onChange).toHaveBeenCalledOnce()
    })

    it('fires on updateNode', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }] }, onChange)
      )
      act(() => { result.current.updateNode('x', { x: 50 }) })
      expect(onChange).toHaveBeenCalledOnce()
    })

    it('fires on setDataModel', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.setDataModel({ x: 1 }) })
      expect(onChange).toHaveBeenCalledOnce()
    })

    it('does NOT fire on setScale', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.setScale(0.5) })
      expect(onChange).not.toHaveBeenCalled()
    })

    it('does NOT fire on setSelectedNodeId', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.setSelectedNodeId('abc') })
      expect(onChange).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/test/usePrintLayout.test.ts --reporter=verbose
```

Expected: FAIL — "Cannot find module '../components/print-layout/usePrintLayout'"

- [ ] **Step 3: Implement `src/components/print-layout/usePrintLayout.ts`**

```ts
import { useState, useCallback, useRef, useEffect } from 'react'
import type { LayoutNode, PrintLayoutState, UsePrintLayoutReturn } from './types'

const NODE_DEFAULTS: Omit<LayoutNode, 'id'> = {
  x: 20, y: 20, width: 200, height: 80, classes: '', template: '',
}

const STATE_DEFAULTS: PrintLayoutState = {
  nodes: [],
  selectedNodeId: null,
  scale: 0.6,
  dataModel: {},
  pageWidth: 210,
  pageHeight: 297,
}

export function usePrintLayout(
  initialState?: Partial<PrintLayoutState>,
  onChange?: (state: PrintLayoutState) => void,
): UsePrintLayoutReturn {
  const [state, setState] = useState<PrintLayoutState>({
    ...STATE_DEFAULTS,
    ...initialState,
  })

  // Stable ref so callbacks always see latest onChange without re-binding
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Helper: update state and optionally fire onChange
  const update = useCallback(
    (updater: (prev: PrintLayoutState) => PrintLayoutState, notify = true) => {
      setState(prev => {
        const next = updater(prev)
        if (notify) onChangeRef.current?.(next)
        return next
      })
    },
    [],
  )

  const addNode = useCallback((partial?: Partial<LayoutNode>) => {
    update(prev => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { ...NODE_DEFAULTS, id: crypto.randomUUID(), ...partial },
      ],
    }))
  }, [update])

  const removeNode = useCallback((id: string) => {
    update(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      selectedNodeId: prev.selectedNodeId === id ? null : prev.selectedNodeId,
    }))
  }, [update])

  const updateNode = useCallback((id: string, patch: Partial<LayoutNode>) => {
    update(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === id ? { ...n, ...patch } : n),
    }))
  }, [update])

  const setSelectedNodeId = useCallback((id: string | null) => {
    update(prev => ({ ...prev, selectedNodeId: id }), false) // no onChange
  }, [update])

  const setScale = useCallback((scale: number) => {
    update(prev => ({ ...prev, scale }), false) // no onChange
  }, [update])

  const setDataModel = useCallback((dataModel: Record<string, unknown>) => {
    update(prev => ({ ...prev, dataModel }))
  }, [update])

  return {
    ...state,
    addNode,
    removeNode,
    updateNode,
    setSelectedNodeId,
    setScale,
    setDataModel,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/test/usePrintLayout.test.ts --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/print-layout/usePrintLayout.ts src/test/usePrintLayout.test.ts
git commit -m "feat: implement usePrintLayout hook"
```

---

## Task 4: `ClassEditor` component

**Files:**
- Create: `src/components/print-layout/ClassEditor.tsx`
- Create: `src/test/ClassEditor.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/test/ClassEditor.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClassEditor } from '../components/print-layout/ClassEditor'
import type { LayoutNode } from '../components/print-layout/types'

const baseNode: LayoutNode = {
  id: 'n1', x: 20, y: 30, width: 200, height: 80,
  classes: 'text-sm font-bold text-left',
  template: '<p>{{ name }}</p>',
}

describe('ClassEditor', () => {
  describe('empty state', () => {
    it('shows placeholder when no node selected', () => {
      render(<ClassEditor node={null} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect(screen.getByText(/select a node/i)).toBeInTheDocument()
    })
  })

  describe('typography pickers', () => {
    it('renders font size picker with current value', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      const select = screen.getByLabelText(/font size/i) as HTMLSelectElement
      expect(select.value).toBe('text-sm')
    })

    it('calls onUpdate with updated classes when size changes', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/font size/i), { target: { value: 'text-xl' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ classes: expect.stringContaining('text-xl') })
      )
      expect(onUpdate.mock.calls[0][0].classes).not.toContain('text-sm')
    })
  })

  describe('raw class string', () => {
    it('shows the full class string', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      const input = screen.getByLabelText(/css classes/i) as HTMLInputElement
      expect(input.value).toBe('text-sm font-bold text-left')
    })

    it('calls onUpdate when class string is edited', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/css classes/i), { target: { value: 'text-xl' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ classes: 'text-xl' }))
    })
  })

  describe('position inputs', () => {
    it('shows current x, y, width, height', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/^x$/i) as HTMLInputElement).value).toBe('20')
      expect((screen.getByLabelText(/^y$/i) as HTMLInputElement).value).toBe('30')
      expect((screen.getByLabelText(/^w$/i) as HTMLInputElement).value).toBe('200')
      expect((screen.getByLabelText(/^h$/i) as HTMLInputElement).value).toBe('80')
    })

    it('calls onUpdate when x changes', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/^x$/i), { target: { value: '50' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ x: 50 }))
    })
  })

  describe('template textarea', () => {
    it('shows current template', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/liquid template/i) as HTMLTextAreaElement).value).toBe('<p>{{ name }}</p>')
    })

    it('calls onUpdate when template changes', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/liquid template/i), { target: { value: '<h1>{{ title }}</h1>' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ template: '<h1>{{ title }}</h1>' }))
    })
  })

  describe('remove button', () => {
    it('calls onRemove when Remove button clicked', () => {
      const onRemove = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={onRemove} />)
      fireEvent.click(screen.getByRole('button', { name: /remove/i }))
      expect(onRemove).toHaveBeenCalledOnce()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/test/ClassEditor.test.tsx --reporter=verbose
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement `src/components/print-layout/ClassEditor.tsx`**

```tsx
import {
  FONT_SIZE_TOKENS, FONT_WEIGHT_TOKENS, TEXT_ALIGN_TOKENS, TEXT_COLOR_TOKENS,
  getActiveToken, applyToken,
} from './classTokens'
import type { LayoutNode } from './types'

interface ClassEditorProps {
  node: LayoutNode | null
  onUpdate: (patch: Partial<LayoutNode>) => void
  onRemove: () => void
}

const ALIGN_ICONS: Record<string, string> = {
  'text-left': '⟵',
  'text-center': '≡',
  'text-right': '⟶',
}

export function ClassEditor({ node, onUpdate, onRemove }: ClassEditorProps) {
  if (!node) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
        Select a node to edit its classes and template.
      </div>
    )
  }

  function updateClasses(category: readonly string[], newToken: string) {
    onUpdate({ classes: applyToken(node!.classes, category, newToken) })
  }

  return (
    <div className="flex flex-col overflow-y-auto text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {node.id.slice(0, 8)}
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700"
          aria-label="Remove node"
        >
          Remove
        </button>
      </div>

      {/* Typography pickers */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</p>

        <div className="flex items-center gap-2">
          <label htmlFor="font-size" className="w-14 shrink-0 text-xs text-gray-500">Font size</label>
          <select
            id="font-size"
            aria-label="Font size"
            className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-xs"
            value={getActiveToken(node.classes, FONT_SIZE_TOKENS) ?? ''}
            onChange={e => updateClasses(FONT_SIZE_TOKENS, e.target.value)}
          >
            <option value="">—</option>
            {FONT_SIZE_TOKENS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="font-weight" className="w-14 shrink-0 text-xs text-gray-500">Weight</label>
          <select
            id="font-weight"
            aria-label="Font weight"
            className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-xs"
            value={getActiveToken(node.classes, FONT_WEIGHT_TOKENS) ?? ''}
            onChange={e => updateClasses(FONT_WEIGHT_TOKENS, e.target.value)}
          >
            <option value="">—</option>
            {FONT_WEIGHT_TOKENS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Align</span>
          <div className="flex gap-1">
            {TEXT_ALIGN_TOKENS.map(t => (
              <button
                key={t}
                onClick={() => updateClasses(TEXT_ALIGN_TOKENS, t)}
                className={`rounded px-2 py-0.5 text-xs border ${
                  getActiveToken(node.classes, TEXT_ALIGN_TOKENS) === t
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
                aria-label={t}
              >
                {ALIGN_ICONS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Color</span>
          <div className="flex flex-wrap gap-1">
            {TEXT_COLOR_TOKENS.map(t => (
              <button
                key={t}
                onClick={() => updateClasses(TEXT_COLOR_TOKENS, t)}
                className={`rounded px-1.5 py-0.5 text-xs border ${
                  getActiveToken(node.classes, TEXT_COLOR_TOKENS) === t
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                aria-label={t}
              >
                {t.replace('text-', '')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Position & size */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position &amp; Size</p>
        <div className="grid grid-cols-2 gap-2">
          {([ ['x', node.x], ['y', node.y], ['w', node.width], ['h', node.height] ] as [string, number][]).map(([label, value]) => (
            <label key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase">{label}</span>
              <input
                aria-label={label}
                type="number"
                className="rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                value={value}
                onChange={e => {
                  const num = Number(e.target.value)
                  const key = label === 'w' ? 'width' : label === 'h' ? 'height' : label as 'x' | 'y'
                  onUpdate({ [key]: num })
                }}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Raw class string */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-1">
        <label htmlFor="class-string" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          CSS Classes
        </label>
        <input
          id="class-string"
          aria-label="CSS classes"
          type="text"
          className="w-full rounded border border-gray-200 px-1.5 py-1 font-mono text-xs"
          value={node.classes}
          onChange={e => onUpdate({ classes: e.target.value })}
        />
      </section>

      {/* Template */}
      <section className="flex flex-col flex-1 px-3 py-3 space-y-1">
        <label htmlFor="template" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Liquid Template
        </label>
        <textarea
          id="template"
          aria-label="Liquid template"
          className="flex-1 min-h-32 w-full resize-y rounded border border-gray-200 p-1.5 font-mono text-xs"
          value={node.template}
          onChange={e => onUpdate({ template: e.target.value })}
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/test/ClassEditor.test.tsx --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/print-layout/ClassEditor.tsx src/test/ClassEditor.test.tsx
git commit -m "feat: add ClassEditor component"
```

---

## Task 5: `NodeDragHandle` component

**Files:**
- Create: `src/components/print-layout/NodeDragHandle.tsx`
- Create: `src/test/NodeDragHandle.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/test/NodeDragHandle.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { Liquid } from 'liquidjs'
import { NodeDragHandle } from '../components/print-layout/NodeDragHandle'
import type { LayoutNode } from '../components/print-layout/types'

const liquid = new Liquid()

const baseNode: LayoutNode = {
  id: 'n1', x: 40, y: 60, width: 200, height: 80,
  classes: 'font-bold', template: '<p>{{ name }}</p>',
}

function wrap(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>)
}

describe('NodeDragHandle', () => {
  it('renders Liquid template with dataModel', async () => {
    wrap(
      <NodeDragHandle
        node={baseNode}
        liquid={liquid}
        dataModel={{ name: 'Pagu' }}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Pagu')).toBeInTheDocument()
    })
  })

  it('shows error message when template is invalid Liquid', async () => {
    wrap(
      <NodeDragHandle
        node={{ ...baseNode, template: '{% invalid %}' }}
        liquid={liquid}
        dataModel={{}}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('figure')).toBeInTheDocument() // error <pre>
    })
  })

  it('applies selected styles when isSelected=true', () => {
    const { container } = wrap(
      <NodeDragHandle
        node={baseNode}
        liquid={liquid}
        dataModel={{}}
        isSelected={true}
        onSelect={vi.fn()}
      />
    )
    expect(container.firstChild).toHaveClass('border-indigo-500')
  })

  it('applies unselected styles when isSelected=false', () => {
    const { container } = wrap(
      <NodeDragHandle
        node={baseNode}
        liquid={liquid}
        dataModel={{}}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    expect(container.firstChild).toHaveClass('border-slate-300')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/test/NodeDragHandle.test.tsx --reporter=verbose
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement `src/components/print-layout/NodeDragHandle.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Liquid } from 'liquidjs'
import type { LayoutNode } from './types'

interface NodeDragHandleProps {
  node: LayoutNode
  liquid: Liquid
  dataModel: Record<string, unknown>
  isSelected: boolean
  onSelect: () => void
}

export function NodeDragHandle({ node, liquid, dataModel, isSelected, onSelect }: NodeDragHandleProps) {
  const [html, setHtml] = useState('')
  const [renderError, setRenderError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
  })

  // Re-render Liquid template when template or dataModel changes
  useEffect(() => {
    let cancelled = false
    liquid.parseAndRender(node.template, dataModel)
      .then(result => {
        if (!cancelled) {
          setHtml(result)
          setRenderError(null)
        }
      })
      .catch(err => {
        if (!cancelled) setRenderError(String(err?.message ?? err))
      })
    return () => { cancelled = true }
  }, [node.template, dataModel, liquid])

  const style: React.CSSProperties = {
    position: 'absolute',
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect()
  }

  const borderClass = isSelected
    ? 'border-2 border-indigo-500 cursor-move'
    : 'border border-dashed border-slate-300 cursor-pointer'

  const dragOverlay = isDragging ? 'opacity-70' : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${borderClass} ${dragOverlay} overflow-hidden`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      {/* Corner handles (decorative, pointer-events-none) */}
      {isSelected && (
        <>
          {['top-[-4px] left-[-4px]', 'top-[-4px] right-[-4px]', 'bottom-[-4px] left-[-4px]', 'bottom-[-4px] right-[-4px]'].map(pos => (
            <div
              key={pos}
              className={`absolute ${pos} h-2 w-2 rounded-sm bg-indigo-500 pointer-events-none`}
            />
          ))}
        </>
      )}

      {/* Content */}
      <div className={`h-full w-full overflow-hidden ${node.classes}`}>
        {renderError ? (
          <pre role="figure" className="m-1 text-xs text-red-500 whitespace-pre-wrap break-all">
            {renderError}
          </pre>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/test/NodeDragHandle.test.tsx --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/print-layout/NodeDragHandle.tsx src/test/NodeDragHandle.test.tsx
git commit -m "feat: add NodeDragHandle with liquid rendering"
```

---

## Task 6: `PreviewCanvas` component

**Files:**
- Create: `src/components/print-layout/PreviewCanvas.tsx`
- Create: `src/test/PreviewCanvas.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/test/PreviewCanvas.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Liquid } from 'liquidjs'
import { PreviewCanvas } from '../components/print-layout/PreviewCanvas'
import type { LayoutNode } from '../components/print-layout/types'

const liquid = new Liquid()

const nodes: LayoutNode[] = [
  { id: 'a', x: 10, y: 10, width: 100, height: 50, classes: '', template: '<span>Node A</span>' },
  { id: 'b', x: 50, y: 50, width: 100, height: 50, classes: '', template: '<span>Node B</span>' },
]

describe('PreviewCanvas', () => {
  it('renders a node for each item in nodes array', async () => {
    render(
      <PreviewCanvas
        nodes={nodes}
        scale={0.6}
        pageWidth={210}
        pageHeight={297}
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={vi.fn()}
        onUpdateNode={vi.fn()}
      />
    )
    // Wait for liquid render
    await screen.findByText('Node A')
    await screen.findByText('Node B')
  })

  it('calls onSelectNode(null) when page background is clicked', () => {
    const onSelectNode = vi.fn()
    const { getByTestId } = render(
      <PreviewCanvas
        nodes={[]}
        scale={0.6}
        pageWidth={210}
        pageHeight={297}
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={onSelectNode}
        onUpdateNode={vi.fn()}
      />
    )
    fireEvent.click(getByTestId('page-canvas'))
    expect(onSelectNode).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/test/PreviewCanvas.test.tsx --reporter=verbose
```

Expected: FAIL

- [ ] **Step 3: Implement `src/components/print-layout/PreviewCanvas.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Liquid } from 'liquidjs'
import { MM_TO_PX } from './types'
import { NodeDragHandle } from './NodeDragHandle'
import type { LayoutNode } from './types'

interface PreviewCanvasProps {
  nodes: LayoutNode[]
  scale: number
  pageWidth: number   // mm
  pageHeight: number  // mm
  selectedNodeId: string | null
  liquid: Liquid
  dataModel: Record<string, unknown>
  onSelectNode: (id: string | null) => void
  onUpdateNode: (id: string, patch: Partial<LayoutNode>) => void
}

export function PreviewCanvas({
  nodes, scale, pageWidth, pageHeight,
  selectedNodeId, liquid, dataModel,
  onSelectNode, onUpdateNode,
}: PreviewCanvasProps) {
  const pageWidthPx = pageWidth * MM_TO_PX
  const pageHeightPx = pageHeight * MM_TO_PX

  // Keep scale in a ref so onDragEnd always has the latest value
  const scaleRef = useRef(scale)
  useEffect(() => { scaleRef.current = scale }, [scale])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event
    const nodeId = active.id as string
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const newX = node.x + delta.x / scaleRef.current
    const newY = node.y + delta.y / scaleRef.current
    const clampedX = Math.max(0, Math.min(newX, pageWidthPx - node.width))
    const clampedY = Math.max(0, Math.min(newY, pageHeightPx - node.height))

    onUpdateNode(nodeId, { x: clampedX, y: clampedY })
  }

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-200 p-8">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: pageWidthPx,
            height: pageHeightPx,
            flexShrink: 0,
          }}
        >
          <div
            data-testid="page-canvas"
            style={{ width: pageWidthPx, height: pageHeightPx, position: 'relative' }}
            className="bg-white shadow-lg"
            onClick={() => onSelectNode(null)}
          >
            {nodes.map(node => (
              <NodeDragHandle
                key={node.id}
                node={node}
                liquid={liquid}
                dataModel={dataModel}
                isSelected={node.id === selectedNodeId}
                onSelect={() => onSelectNode(node.id)}
              />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/test/PreviewCanvas.test.tsx --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/print-layout/PreviewCanvas.tsx src/test/PreviewCanvas.test.tsx
git commit -m "feat: add PreviewCanvas with scale-aware drag"
```

---

## Task 7: `PrintLayoutEditor` + Tailwind token safelist

**Files:**
- Create: `src/components/print-layout/PrintLayoutEditor.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Implement `src/components/print-layout/PrintLayoutEditor.tsx`**

```tsx
import { useMemo } from 'react'
import { Liquid } from 'liquidjs'
import { usePrintLayout } from './usePrintLayout'
import { PreviewCanvas } from './PreviewCanvas'
import { ClassEditor } from './ClassEditor'
import type { PrintLayoutState } from './types'

interface PrintLayoutEditorProps {
  initialState?: Partial<PrintLayoutState>
  onChange?: (state: PrintLayoutState) => void
}

export function PrintLayoutEditor({ initialState, onChange }: PrintLayoutEditorProps) {
  const liquid = useMemo(() => new Liquid(), [])

  const {
    nodes, selectedNodeId, scale, dataModel, pageWidth, pageHeight,
    addNode, removeNode, updateNode, setSelectedNodeId, setScale, setDataModel,
  } = usePrintLayout(initialState, onChange)

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-sm font-semibold text-gray-700">Print Layout Editor</span>

        <div className="ml-auto flex items-center gap-3">
          <label htmlFor="scale-slider" className="text-xs text-gray-500">
            Scale
          </label>
          <input
            id="scale-slider"
            type="range"
            min={0.2}
            max={1.5}
            step={0.05}
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            className="w-24"
          />
          <span className="w-10 text-xs text-gray-700">{scale.toFixed(2)}×</span>
        </div>

        <button
          onClick={() => addNode()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          + Add Node
        </button>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: preview */}
        <PreviewCanvas
          nodes={nodes}
          scale={scale}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          selectedNodeId={selectedNodeId}
          liquid={liquid}
          dataModel={dataModel}
          onSelectNode={setSelectedNodeId}
          onUpdateNode={(id, patch) => updateNode(id, patch)}
        />

        {/* Right: class editor */}
        <div className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white overflow-y-auto">
          <ClassEditor
            node={selectedNode}
            onUpdate={patch => selectedNode && updateNode(selectedNode.id, patch)}
            onRemove={() => selectedNode && removeNode(selectedNode.id)}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `@source inline(...)` to `src/styles/global.css`**

Append at the end of `src/styles/global.css`:

```css
/* Print layout editor: dynamic class tokens that cannot be statically scanned */
@source inline("{text-xs,text-sm,text-base,text-lg,text-xl,text-2xl,text-3xl,text-4xl}");
@source inline("{font-normal,font-semibold,font-bold}");
@source inline("{text-left,text-center,text-right}");
@source inline("{text-black,text-white,text-gray-500,text-gray-700,text-indigo-600,text-red-600}");
```

- [ ] **Step 3: Run all tests to verify nothing broken**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/print-layout/PrintLayoutEditor.tsx src/styles/global.css
git commit -m "feat: add PrintLayoutEditor top-level component"
```

---

## Task 8: Demo page and smoke test

**Files:**
- Create: `src/pages/layout-editor.astro`

- [ ] **Step 1: Verify `src/layouts/Layout.astro` exists**

```bash
ls src/layouts/Layout.astro
```

Expected: file listed. (It exists in this project — this step confirms before proceeding.)

- [ ] **Step 2: Create `src/pages/layout-editor.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Layout Editor — Pagu" description="Print layout editor">
  <div class="h-screen">
    <div id="editor-root" class="h-full" />
  </div>
  <script>
    import { createElement } from 'react'
    import { createRoot } from 'react-dom/client'
    import { PrintLayoutEditor } from '../components/print-layout/PrintLayoutEditor'

    const root = createRoot(document.getElementById('editor-root')!)
    root.render(
      createElement(PrintLayoutEditor, {
        initialState: {
          dataModel: {
            restaurant: { name: 'Pagu', subtitle: 'Restaurant Menu' },
            sections: [
              { name: 'Starters', items: [{ name: 'Spring Rolls', price: '$12' }] },
            ],
          },
        },
      })
    )
  </script>
</Layout>
```

- [ ] **Step 3: Start dev server and open the demo page**

```bash
npm run dev
```

Open `http://localhost:4321/layout-editor` in the browser.

- [ ] **Step 4: Manual smoke test checklist**

Verify each of these manually:

- [ ] Page loads without errors in the browser console
- [ ] Scale slider changes the preview zoom
- [ ] "Add Node" button adds a node to the canvas
- [ ] Clicking a node selects it (blue border + corner handles)
- [ ] Clicking the page background deselects
- [ ] Dragging a node repositions it; it stays within page bounds
- [ ] ClassEditor shows current node's classes and template
- [ ] Editing the font size picker updates the class string below it
- [ ] Editing the raw class string updates the picker selections for known tokens
- [ ] Typing a Liquid template like `<h1>{{ restaurant.name }}</h1>` renders "Pagu" in the preview
- [ ] An invalid Liquid template shows a red error message inline
- [ ] The "Remove" button removes the selected node

- [ ] **Step 5: Commit**

```bash
git add src/pages/layout-editor.astro
git commit -m "feat: add layout-editor demo page"
```

---

## Final: run all tests

- [ ] **Run full test suite**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests PASS with no errors.
