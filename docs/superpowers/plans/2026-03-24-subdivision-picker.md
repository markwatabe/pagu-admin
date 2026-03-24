# Subdivision Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a subdivision picker to the print layout editor so the letter-size page can be split into 1×1, 2-column, 2-row, or 2×2 cells, with the top-left cell as the edit area and all other cells mirroring its content.

**Architecture:** A new `Subdivision` type drives cell math shared across the hook, canvas, and toolbar. `useNodeHtml` is extracted from `NodeDragHandle` and reused by a new `NodeMirror` component that renders read-only copies of nodes at each non-edit cell offset. The subdivision picker in the toolbar is pure UI state — it does not trigger `onChange`.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest + React Testing Library, liquidjs, @dnd-kit/core

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/components/print-layout/types.ts` | Modify | Add `Subdivision` type, `SUBDIVISION_GRID` const, `subdivisionGrid()` fn; add `subdivision` to `PrintLayoutState` and `UsePrintLayoutReturn` |
| `src/components/print-layout/usePrintLayout.ts` | Modify | Update page size defaults to letter; add `subdivision` to state defaults; add `setSubdivision` action |
| `src/components/print-layout/NodeDragHandle.tsx` | Modify | Extract `useNodeHtml` hook and export it; `NodeDragHandle` calls it instead of inlining the effect |
| `src/components/print-layout/NodeMirror.tsx` | Create | Read-only node renderer; calls `useNodeHtml`, offsets position, `pointer-events: none` |
| `src/components/print-layout/PreviewCanvas.tsx` | Modify | Accept `subdivision` prop; compute cell dimensions; update drag clamping; render dividers and mirror cells |
| `src/components/print-layout/PrintLayoutEditor.tsx` | Modify | Destructure `subdivision`/`setSubdivision`; add 4-button picker to toolbar; pass `subdivision` to `PreviewCanvas` |
| `src/test/usePrintLayout.test.ts` | Modify | Update default page size assertions; add `setSubdivision` tests |
| `src/test/PreviewCanvas.test.tsx` | Modify | Add `subdivision="full"` to all existing renders; add tests for dividers and mirrors |
| `src/test/NodeMirror.test.tsx` | Create | Tests for mirror rendering and offset positioning |

---

## Task 1: Types + Hook — `Subdivision` type and `setSubdivision` action

**Files:**
- Modify: `src/components/print-layout/types.ts`
- Modify: `src/components/print-layout/usePrintLayout.ts`
- Modify: `src/test/usePrintLayout.test.ts`

> These two source files must be edited in the same pass — adding `subdivision` to `PrintLayoutState` immediately causes a TypeScript compile error on `STATE_DEFAULTS: PrintLayoutState` until the default is also added.

- [ ] **Step 1: Update the existing default-state test to expect letter size and add `setSubdivision` tests**

  Open `src/test/usePrintLayout.test.ts`. Replace the "uses default state" test and add new tests at the end of the file:

  ```ts
  // In describe('initial state'):
  it('uses default state when no initialState given', () => {
    const { result } = renderHook(() => usePrintLayout())
    expect(result.current.nodes).toEqual([])
    expect(result.current.selectedNodeId).toBeNull()
    expect(result.current.scale).toBe(0.6)
    expect(result.current.pageWidth).toBe(215.9)   // letter width
    expect(result.current.pageHeight).toBe(279.4)  // letter height
    expect(result.current.subdivision).toBe('full')
  })

  // Add a new describe block at the bottom of the outer describe:
  describe('setSubdivision', () => {
    it('updates subdivision', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.setSubdivision('cols2') })
      expect(result.current.subdivision).toBe('cols2')
    })

    it('does NOT fire onChange', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.setSubdivision('grid4') })
      expect(onChange).not.toHaveBeenCalled()
    })

    it('initialState can override subdivision', () => {
      const { result } = renderHook(() =>
        usePrintLayout({ subdivision: 'rows2' })
      )
      expect(result.current.subdivision).toBe('rows2')
    })
  })
  ```

  Also update the "merges provided initialState" test's `pageHeight` assertion from `297` to `279.4`:

  ```ts
  it('merges provided initialState over defaults', () => {
    const { result } = renderHook(() =>
      usePrintLayout({ scale: 0.8, pageWidth: 148 })
    )
    expect(result.current.scale).toBe(0.8)
    expect(result.current.pageWidth).toBe(148)
    expect(result.current.pageHeight).toBe(279.4) // letter default
  })
  ```

  Also add `query: null` to every inline `LayoutNode` literal in the file that is missing the `query` field. There are 5 such literals — they appear in the `removeNode`, `updateNode`, and `onChange` describe blocks. The fixtures have slightly different shapes; search for any object literal assigned to a node in those blocks and add `query: null` to it. Examples of lines that need updating:

  ```ts
  // Before (removeNode, line 60):
  { id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }
  // After:
  { id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '', query: null }

  // Before (updateNode, line 81 — note different x/y/classes/template values):
  { id: 'x', x: 10, y: 20, width: 100, height: 50, classes: 'font-bold', template: 'hi' }
  // After:
  { id: 'x', x: 10, y: 20, width: 100, height: 50, classes: 'font-bold', template: 'hi', query: null }
  ```

  Apply the same treatment to all remaining fixtures in the `onChange` tests (lines ~133, ~142).

- [ ] **Step 2: Run tests — confirm new tests fail**

  ```bash
  pnpm test -- --reporter=verbose 2>&1 | head -60
  ```

  Expected: failures on the `pageWidth`/`pageHeight` assertions and "setSubdivision is not a function".

- [ ] **Step 3: Update `types.ts`**

  Replace the entire file with:

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
    query: string | null // named query key — template renders once per item when set
  }

  export type Subdivision = 'full' | 'cols2' | 'rows2' | 'grid4'

  // internal — use subdivisionGrid()
  const SUBDIVISION_GRID: Record<Subdivision, { cols: number; rows: number }> = {
    full:  { cols: 1, rows: 1 },
    cols2: { cols: 2, rows: 1 },
    rows2: { cols: 1, rows: 2 },
    grid4: { cols: 2, rows: 2 },
  }

  /** Returns column and row count for a subdivision mode. */
  export function subdivisionGrid(sub: Subdivision): { cols: number; rows: number } {
    return SUBDIVISION_GRID[sub]
  }

  export interface PrintLayoutState {
    nodes: LayoutNode[]
    selectedNodeId: string | null
    scale: number
    dataModel: Record<string, unknown>
    pageWidth: number     // mm — 215.9 for letter
    pageHeight: number    // mm — 279.4 for letter
    subdivision: Subdivision
  }

  export interface UsePrintLayoutReturn extends PrintLayoutState {
    addNode: (node?: Partial<LayoutNode>) => void
    removeNode: (id: string) => void
    updateNode: (id: string, patch: Partial<LayoutNode>) => void
    setSelectedNodeId: (id: string | null) => void
    setScale: (scale: number) => void
    setDataModel: (model: Record<string, unknown>) => void
    setSubdivision: (sub: Subdivision) => void
  }
  ```

- [ ] **Step 4: Update `usePrintLayout.ts`**

  Three changes:

  a. Add `Subdivision` to the import at the top:
  ```ts
  import type { LayoutNode, PrintLayoutState, UsePrintLayoutReturn, Subdivision } from './types'
  ```

  b. Update `STATE_DEFAULTS` (lines 8–15 of current file):
  ```ts
  const STATE_DEFAULTS: PrintLayoutState = {
    nodes: [],
    selectedNodeId: null,
    scale: 0.6,
    dataModel: {},
    pageWidth: 215.9,
    pageHeight: 279.4,
    subdivision: 'full',
  }
  ```

  c. Add `setSubdivision` callback after `setDataModel` and add it to the return object:
  ```ts
  const setSubdivision = useCallback((subdivision: Subdivision) => {
    update(prev => ({ ...prev, subdivision }), false) // no onChange — UI-only state
  }, [update])

  return {
    ...state,
    addNode,
    removeNode,
    updateNode,
    setSelectedNodeId,
    setScale,
    setDataModel,
    setSubdivision,
  }
  ```

- [ ] **Step 5: Run tests — confirm they pass**

  ```bash
  pnpm test -- --reporter=verbose 2>&1 | tail -20
  ```

  Expected: all tests pass. Note: if you are running `tsc --noEmit` in parallel, the `PreviewCanvas` test file will produce a **TypeScript compile error** (not a warning) because the required `subdivision` prop is now missing from its renders. Fix it immediately by adding `subdivision="full"` to those three renders now rather than waiting for Task 4.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/print-layout/types.ts src/components/print-layout/usePrintLayout.ts src/test/usePrintLayout.test.ts
  git commit -m "feat: add Subdivision type and setSubdivision to print layout state"
  ```

---

## Task 2: Extract `useNodeHtml` from `NodeDragHandle`

**Files:**
- Modify: `src/components/print-layout/NodeDragHandle.tsx`
- Verify: `src/test/NodeDragHandle.test.tsx` (no changes, must stay green)

- [ ] **Step 1: Run existing NodeDragHandle tests to confirm baseline**

  ```bash
  pnpm test -- NodeDragHandle --reporter=verbose
  ```

  Expected: all 6 tests pass.

- [ ] **Step 2: Refactor `NodeDragHandle.tsx` — extract `useNodeHtml`**

  Replace the entire file with this refactored version (same external behaviour, `useNodeHtml` is now exported):

  ```tsx
  import { useEffect, useState } from 'react'
  import type { CSSProperties, MouseEvent } from 'react'
  import { useDraggable } from '@dnd-kit/core'
  import { CSS } from '@dnd-kit/utilities'
  import type { Liquid } from 'liquidjs'
  import type { LayoutNode } from './types'

  /**
   * Renders a node's Liquid template against dataModel.
   * `liquid` must be a stable reference (e.g. from useMemo) — it is intentionally
   * excluded from the dependency array because recreating the Liquid instance on
   * every render would cause infinite re-renders. This invariant is enforced at the
   * call site in PrintLayoutEditor via `useMemo(() => new Liquid(), [])`.
   */
  export function useNodeHtml(
    node: LayoutNode,
    liquid: Liquid,
    dataModel: Record<string, unknown>,
  ): { html: string; renderError: string | null } {
    const [html, setHtml] = useState('')
    const [renderError, setRenderError] = useState<string | null>(null)

    useEffect(() => {
      let cancelled = false
      const items = node.query ? dataModel[node.query] : null

      async function render() {
        try {
          let result: string
          if (Array.isArray(items)) {
            const parts = await Promise.all(
              items.map((item: unknown) =>
                liquid.parseAndRender(node.template, { ...dataModel, item })
              )
            )
            result = parts.join('')
          } else {
            result = await liquid.parseAndRender(node.template, dataModel)
          }
          if (!cancelled) {
            setHtml(result)
            setRenderError(null)
          }
        } catch (err: unknown) {
          if (!cancelled) setRenderError(String((err as Error)?.message ?? err))
        }
      }

      render()
      return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // liquid is intentionally excluded — see JSDoc above
    }, [node.template, node.query, dataModel])

    return { html, renderError }
  }

  interface NodeDragHandleProps {
    node: LayoutNode
    liquid: Liquid
    dataModel: Record<string, unknown>
    isSelected: boolean
    onSelect: () => void
  }

  export function NodeDragHandle({ node, liquid, dataModel, isSelected, onSelect }: NodeDragHandleProps) {
    const { html, renderError } = useNodeHtml(node, liquid, dataModel)

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: node.id,
    })

    const style: CSSProperties = {
      position: 'absolute',
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      transform: CSS.Transform.toString(transform),
      zIndex: isDragging ? 1000 : undefined,
    }

    function handleClick(e: MouseEvent) {
      e.stopPropagation()
      onSelect()
    }

    const borderClass = isSelected
      ? `border-2 border-indigo-500 ${isDragging ? 'cursor-grabbing' : 'cursor-move'}`
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
                className={`absolute ${pos} h-2 w-2 bg-indigo-500 pointer-events-none`}
              />
            ))}
          </>
        )}

        {/* Content */}
        <div className={`h-full w-full overflow-hidden ${node.classes}`}>
          {renderError ? (
            <pre role="alert" className="m-1 text-xs text-red-500 whitespace-pre-wrap break-all">
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

- [ ] **Step 3: Run tests — confirm NodeDragHandle tests still pass**

  ```bash
  pnpm test -- NodeDragHandle --reporter=verbose
  ```

  Expected: all 6 tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/print-layout/NodeDragHandle.tsx
  git commit -m "refactor: extract useNodeHtml hook from NodeDragHandle"
  ```

---

## Task 3: Create `NodeMirror` component

**Files:**
- Create: `src/components/print-layout/NodeMirror.tsx`
- Create: `src/test/NodeMirror.test.tsx`

- [ ] **Step 1: Write the failing test**

  Create `src/test/NodeMirror.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest'
  import { render, waitFor, screen } from '@testing-library/react'
  import { Liquid } from 'liquidjs'
  import { NodeMirror } from '../components/print-layout/NodeMirror'
  import type { LayoutNode } from '../components/print-layout/types'

  const liquid = new Liquid()

  const baseNode: LayoutNode = {
    id: 'm1', x: 10, y: 20, width: 150, height: 60,
    classes: 'text-sm', template: '<span>Mirror</span>',
    query: null,
  }

  describe('NodeMirror', () => {
    it('renders Liquid template content', async () => {
      render(
        <NodeMirror
          node={baseNode}
          liquid={liquid}
          dataModel={{}}
          offsetX={0}
          offsetY={0}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('Mirror')).toBeInTheDocument()
      })
    })

    it('positions the node at x + offsetX, y + offsetY', () => {
      const { container } = render(
        <NodeMirror
          node={baseNode}
          liquid={liquid}
          dataModel={{}}
          offsetX={300}
          offsetY={400}
        />
      )
      const el = container.firstChild as HTMLElement
      expect(el.style.left).toBe('310px')  // node.x (10) + offsetX (300)
      expect(el.style.top).toBe('420px')   // node.y (20) + offsetY (400)
    })

    it('has pointer-events: none so it does not intercept clicks', () => {
      const { container } = render(
        <NodeMirror
          node={baseNode}
          liquid={liquid}
          dataModel={{}}
          offsetX={0}
          offsetY={0}
        />
      )
      const el = container.firstChild as HTMLElement
      expect(el.style.pointerEvents).toBe('none')
    })

    it('renders template once per item when query is set', async () => {
      render(
        <NodeMirror
          node={{ ...baseNode, query: 'items', template: '<span>{{ item.name }}</span>' }}
          liquid={liquid}
          dataModel={{ items: [{ name: 'Alpha' }, { name: 'Beta' }] }}
          offsetX={0}
          offsetY={0}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
      })
    })

    it('silently suppresses render errors (no alert role)', async () => {
      render(
        <NodeMirror
          node={{ ...baseNode, template: '{% invalid %}' }}
          liquid={liquid}
          dataModel={{}}
          offsetX={0}
          offsetY={0}
        />
      )
      // Wait a tick for the async render to settle
      await new Promise(r => setTimeout(r, 50))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run test — confirm it fails**

  ```bash
  pnpm test -- NodeMirror --reporter=verbose 2>&1 | head -30
  ```

  Expected: FAIL — "Cannot find module '../components/print-layout/NodeMirror'".

- [ ] **Step 3: Create `NodeMirror.tsx`**

  Create `src/components/print-layout/NodeMirror.tsx`:

  ```tsx
  import type { Liquid } from 'liquidjs'
  import type { LayoutNode } from './types'
  import { useNodeHtml } from './NodeDragHandle'

  interface NodeMirrorProps {
    node: LayoutNode
    liquid: Liquid
    dataModel: Record<string, unknown>
    offsetX: number   // logical px — col * cellWidthPx
    offsetY: number   // logical px — row * cellHeightPx
  }

  export function NodeMirror({ node, liquid, dataModel, offsetX, offsetY }: NodeMirrorProps) {
    const { html } = useNodeHtml(node, liquid, dataModel)
    // Render errors are intentionally suppressed in mirror cells — they are
    // already visible on the edit cell (col=0, row=0).

    return (
      <div
        style={{
          position: 'absolute',
          left: node.x + offsetX,
          top: node.y + offsetY,
          width: node.width,
          height: node.height,
          pointerEvents: 'none',
        }}
      >
        <div className={`h-full w-full overflow-hidden ${node.classes}`}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run tests — confirm they pass**

  ```bash
  pnpm test -- NodeMirror --reporter=verbose
  ```

  Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/print-layout/NodeMirror.tsx src/test/NodeMirror.test.tsx
  git commit -m "feat: add NodeMirror read-only node renderer"
  ```

---

## Task 4: Update `PreviewCanvas` — subdivision support

**Files:**
- Modify: `src/components/print-layout/PreviewCanvas.tsx`
- Modify: `src/test/PreviewCanvas.test.tsx`

- [ ] **Step 1: Replace `src/test/PreviewCanvas.test.tsx` entirely**

  The three existing test cases use A4 dimensions (`pageWidth={210}`, `pageHeight={297}`) and are missing the required `subdivision` prop. Replace the full file with the updated version below, which updates those values to letter size and adds three new subdivision tests:

  ```tsx
  import { describe, it, expect, vi } from 'vitest'
  import { render, screen, fireEvent } from '@testing-library/react'
  import { Liquid } from 'liquidjs'
  import { PreviewCanvas } from '../components/print-layout/PreviewCanvas'
  import type { LayoutNode } from '../components/print-layout/types'

  const liquid = new Liquid()

  const nodes: LayoutNode[] = [
    { id: 'a', x: 10, y: 10, width: 100, height: 50, classes: '', template: '<span>Node A</span>', query: null },
    { id: 'b', x: 50, y: 50, width: 100, height: 50, classes: '', template: '<span>Node B</span>', query: null },
  ]

  describe('PreviewCanvas', () => {
    it('renders a node for each item in nodes array', async () => {
      render(
        <PreviewCanvas
          nodes={nodes}
          scale={0.6}
          pageWidth={215.9}
          pageHeight={279.4}
          subdivision="full"
          selectedNodeId={null}
          liquid={liquid}
          dataModel={{}}
          onSelectNode={vi.fn()}
          onUpdateNode={vi.fn()}
        />
      )
      await screen.findByText('Node A')
      await screen.findByText('Node B')
    })

    it('does not call onSelectNode(null) when a node is clicked', async () => {
      const onSelectNode = vi.fn()
      render(
        <PreviewCanvas
          nodes={nodes}
          scale={0.6}
          pageWidth={215.9}
          pageHeight={279.4}
          subdivision="full"
          selectedNodeId={null}
          liquid={liquid}
          dataModel={{}}
          onSelectNode={onSelectNode}
          onUpdateNode={vi.fn()}
        />
      )
      const nodeContent = await screen.findByText('Node A')
      fireEvent.click(nodeContent)
      expect(onSelectNode).not.toHaveBeenCalledWith(null)
    })

    it('calls onSelectNode(null) when page background is clicked', () => {
      const onSelectNode = vi.fn()
      const { getByTestId } = render(
        <PreviewCanvas
          nodes={[]}
          scale={0.6}
          pageWidth={215.9}
          pageHeight={279.4}
          subdivision="full"
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

    it('renders NodeMirror copies in non-edit cells when subdivision is cols2', async () => {
      render(
        <PreviewCanvas
          nodes={[{ id: 'a', x: 10, y: 10, width: 100, height: 50, classes: '', template: '<span>Cell</span>', query: null }]}
          scale={1}
          pageWidth={215.9}
          pageHeight={279.4}
          subdivision="cols2"
          selectedNodeId={null}
          liquid={liquid}
          dataModel={{}}
          onSelectNode={vi.fn()}
          onUpdateNode={vi.fn()}
        />
      )
      // Content appears twice: once in edit cell, once in mirror
      const cells = await screen.findAllByText('Cell')
      expect(cells).toHaveLength(2)
    })

    it('renders 4 copies when subdivision is grid4', async () => {
      render(
        <PreviewCanvas
          nodes={[{ id: 'a', x: 0, y: 0, width: 50, height: 50, classes: '', template: '<span>Q</span>', query: null }]}
          scale={1}
          pageWidth={215.9}
          pageHeight={279.4}
          subdivision="grid4"
          selectedNodeId={null}
          liquid={liquid}
          dataModel={{}}
          onSelectNode={vi.fn()}
          onUpdateNode={vi.fn()}
        />
      )
      const cells = await screen.findAllByText('Q')
      expect(cells).toHaveLength(4)
    })

    it('renders no mirrors when subdivision is full', async () => {
      render(
        <PreviewCanvas
          nodes={[{ id: 'a', x: 0, y: 0, width: 50, height: 50, classes: '', template: '<span>Solo</span>', query: null }]}
          scale={1}
          pageWidth={215.9}
          pageHeight={279.4}
          subdivision="full"
          selectedNodeId={null}
          liquid={liquid}
          dataModel={{}}
          onSelectNode={vi.fn()}
          onUpdateNode={vi.fn()}
        />
      )
      const cells = await screen.findAllByText('Solo')
      expect(cells).toHaveLength(1)
    })
  })
  ```

- [ ] **Step 2: Run tests — confirm new tests fail**

  ```bash
  pnpm test -- PreviewCanvas --reporter=verbose 2>&1 | head -40
  ```

  Expected: new tests fail (missing `subdivision` prop / wrong count), existing tests may have TypeScript warnings but pass.

- [ ] **Step 3: Update `PreviewCanvas.tsx`**

  Replace the entire file with:

  ```tsx
  import { useRef } from 'react'
  import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
  import type { DragEndEvent } from '@dnd-kit/core'
  import type { Liquid } from 'liquidjs'
  import { MM_TO_PX, subdivisionGrid, type Subdivision } from './types'
  import { NodeDragHandle } from './NodeDragHandle'
  import { NodeMirror } from './NodeMirror'
  import type { LayoutNode } from './types'

  interface PreviewCanvasProps {
    nodes: LayoutNode[]
    scale: number
    pageWidth: number   // mm
    pageHeight: number  // mm
    subdivision: Subdivision
    selectedNodeId: string | null
    liquid: Liquid
    dataModel: Record<string, unknown>
    onSelectNode: (id: string | null) => void
    onUpdateNode: (id: string, patch: Partial<LayoutNode>) => void
  }

  export function PreviewCanvas({
    nodes, scale, pageWidth, pageHeight, subdivision,
    selectedNodeId, liquid, dataModel,
    onSelectNode, onUpdateNode,
  }: PreviewCanvasProps) {
    const { cols, rows } = subdivisionGrid(subdivision)
    // All dimensions are in logical (pre-scale) px — same unit as node.x/y/width/height.
    // The CSS transform: scale(scale) is applied to the container, not to these values.
    const pageWidthPx  = pageWidth  * MM_TO_PX
    const pageHeightPx = pageHeight * MM_TO_PX
    const cellWidthPx  = pageWidthPx  / cols
    const cellHeightPx = pageHeightPx / rows

    // Keep scale in a ref so onDragEnd always has the latest value without re-registering
    const scaleRef = useRef(scale)
    scaleRef.current = scale

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
      // Clamp so the node's full bounding box stays within the edit cell (col=0, row=0).
      const clampedX = Math.max(0, Math.min(newX, cellWidthPx  - node.width))
      const clampedY = Math.max(0, Math.min(newY, cellHeightPx - node.height))

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
              {/* Edit cell nodes — col=0, row=0 */}
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

              {/* Subdivision dividers */}
              {cols > 1 && (
                <div
                  style={{ position: 'absolute', left: cellWidthPx, top: 0, width: 1, height: pageHeightPx }}
                  className="bg-gray-300 pointer-events-none"
                />
              )}
              {rows > 1 && (
                <div
                  style={{ position: 'absolute', top: cellHeightPx, left: 0, height: 1, width: pageWidthPx }}
                  className="bg-gray-300 pointer-events-none"
                />
              )}

              {/* Mirror cells — all (col, row) pairs except (0, 0) */}
              {Array.from({ length: cols }, (_, col) =>
                Array.from({ length: rows }, (_, row) => {
                  if (col === 0 && row === 0) return null  // edit cell — no mirror
                  const offsetX = col * cellWidthPx
                  const offsetY = row * cellHeightPx
                  return nodes.map(node => (
                    <NodeMirror
                      key={`${col}-${row}-${node.id}`}
                      node={node}
                      liquid={liquid}
                      dataModel={dataModel}
                      offsetX={offsetX}
                      offsetY={offsetY}
                    />
                  ))
                })
              )}
            </div>
          </div>
        </DndContext>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run tests — confirm all pass**

  ```bash
  pnpm test -- PreviewCanvas --reporter=verbose
  ```

  Expected: all tests pass (original 3 + new 3).

- [ ] **Step 5: Run full test suite**

  ```bash
  pnpm test
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/print-layout/PreviewCanvas.tsx src/test/PreviewCanvas.test.tsx
  git commit -m "feat: add subdivision support to PreviewCanvas (dividers + mirrors)"
  ```

---

## Task 5: Add subdivision picker to `PrintLayoutEditor` toolbar

**Files:**
- Modify: `src/components/print-layout/PrintLayoutEditor.tsx`

There are no existing toolbar tests; this task is verified by running the app visually and confirming the build passes.

- [ ] **Step 1: Update `PrintLayoutEditor.tsx`**

  Replace the entire file with:

  ```tsx
  import { useMemo } from 'react'
  import type { ReactNode } from 'react'
  import { Liquid } from 'liquidjs'
  import { usePrintLayout } from './usePrintLayout'
  import { PreviewCanvas } from './PreviewCanvas'
  import { ClassEditor } from './ClassEditor'
  import type { PrintLayoutState, Subdivision } from './types'

  interface PrintLayoutEditorProps {
    initialState?: Partial<PrintLayoutState>
    onChange?: (state: PrintLayoutState) => void
  }

  const SUBDIVISION_OPTIONS: { key: Subdivision; label: string; icon: ReactNode }[] = [
    {
      key: 'full',
      label: 'Full page',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="16" height="16" rx="1" />
        </svg>
      ),
    },
    {
      key: 'cols2',
      label: '2 columns',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="7" height="16" rx="1" />
          <rect x="11" y="2" width="7" height="16" rx="1" />
        </svg>
      ),
    },
    {
      key: 'rows2',
      label: '2 rows',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="16" height="7" rx="1" />
          <rect x="2" y="11" width="16" height="7" rx="1" />
        </svg>
      ),
    },
    {
      key: 'grid4',
      label: '4 cells',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="7" height="7" rx="1" />
          <rect x="11" y="2" width="7" height="7" rx="1" />
          <rect x="2" y="11" width="7" height="7" rx="1" />
          <rect x="11" y="11" width="7" height="7" rx="1" />
        </svg>
      ),
    },
  ]

  export function PrintLayoutEditor({ initialState, onChange }: PrintLayoutEditorProps) {
    const liquid = useMemo(() => new Liquid(), [])

    const {
      nodes, selectedNodeId, scale, dataModel, pageWidth, pageHeight, subdivision,
      addNode, removeNode, updateNode, setSelectedNodeId, setScale, setSubdivision,
    } = usePrintLayout(initialState, onChange)

    const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

    return (
      <div className="flex h-full flex-col">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2">
          <span className="text-sm font-semibold text-gray-700">Print Layout Editor</span>

          {/* Subdivision picker */}
          <div className="flex items-center gap-1">
            {SUBDIVISION_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                aria-label={opt.label}
                title={opt.label}
                onClick={() => setSubdivision(opt.key)}
                className={`rounded p-1 transition ${
                  subdivision === opt.key
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>

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
            subdivision={subdivision}
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
              dataModel={dataModel}
              onUpdate={patch => selectedNode && updateNode(selectedNode.id, patch)}
              onRemove={() => selectedNode && removeNode(selectedNode.id)}
            />
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Run full test suite**

  ```bash
  pnpm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Build check**

  ```bash
  pnpm build 2>&1 | tail -20
  ```

  Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/print-layout/PrintLayoutEditor.tsx
  git commit -m "feat: add subdivision picker buttons to PrintLayoutEditor toolbar"
  ```

---

## Final Verification

- [ ] Run the full test suite one last time:

  ```bash
  pnpm test
  ```

  Expected: all tests pass.

- [ ] Start dev server and verify manually:

  ```bash
  pnpm dev
  ```

  Navigate to `/layout-editor`. Confirm:
  - 4 picker buttons appear in the toolbar
  - Selecting "2 columns" shows a vertical divider and a mirrored copy of any placed nodes on the right
  - Selecting "2 rows" shows a horizontal divider and a mirrored copy on the bottom
  - Selecting "4 cells" shows both dividers and 3 mirror copies
  - Selecting "Full page" removes dividers and mirrors
  - Nodes can be dragged and stay within the left/top cell
