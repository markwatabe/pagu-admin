# Print Layout Editor — Subdivision Picker Design Spec

**Date:** 2026-03-24
**Project:** pagu-admin
**Stack:** React 19 + TypeScript + Tailwind v4

---

## Overview

The print layout editor always works with a letter-size page (215.9 mm × 279.4 mm). This spec adds the ability to subdivide that page into a grid, edit one cell, and have all other cells automatically mirror the same content.

> **Note:** `usePrintLayout.ts` `STATE_DEFAULTS` currently uses A4 (210 × 297 mm). This spec updates those defaults to letter size (215.9 × 279.4 mm) because letter is the only supported size going forward.

---

## Subdivision Modes

Four modes are supported:

| Mode | Key | Grid | Dividing lines |
|------|-----|------|----------------|
| Full page | `'full'` | 1×1 | none |
| 2 columns (left / right) | `'cols2'` | 1 row, 2 cols | 1 vertical line |
| 2 rows (top / bottom) | `'rows2'` | 2 rows, 1 col | 1 horizontal line |
| 4 cells | `'grid4'` | 2 rows, 2 cols | 1 vertical + 1 horizontal line |

The active edit cell is always cell (col=0, row=0) — top-left. All other cells are read-only mirrors.

---

## Cell Coordinate Space

When a subdivision is active, nodes are positioned relative to the top-left cell. The cell dimensions in millimetres are:

```
cellWidth  = pageWidth  / cols
cellHeight = pageHeight / rows
```

Nodes already saved under a given subdivision remain at their existing `x`/`y` coordinates when the subdivision changes — no position reset occurs. Clamping is enforced on drag, not on subdivision change.

---

## Changes Required

> **Order note:** `types.ts` and `usePrintLayout.ts` must be updated in the same edit pass. Adding `subdivision` to `PrintLayoutState` (in `types.ts`) will immediately cause a TypeScript compile error on `STATE_DEFAULTS: PrintLayoutState` until `subdivision: 'full'` is also added there.

### `types.ts`

Add:

```ts
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
```

Update `PrintLayoutState`:

```ts
export interface PrintLayoutState {
  nodes: LayoutNode[]
  selectedNodeId: string | null
  scale: number
  dataModel: Record<string, unknown>
  pageWidth: number     // mm — 215.9 for letter
  pageHeight: number    // mm — 279.4 for letter
  subdivision: Subdivision
}
```

Update `UsePrintLayoutReturn`:

```ts
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

### `usePrintLayout.ts`

Must be updated in the same pass as `types.ts` (see order note above).

Changes:

- Change `STATE_DEFAULTS.pageWidth` to `215.9` and `STATE_DEFAULTS.pageHeight` to `279.4`
- Add `subdivision: 'full' as Subdivision` to `STATE_DEFAULTS`
- Add `setSubdivision` action and include it in the return object:

```ts
const setSubdivision = useCallback((subdivision: Subdivision) => {
  update(prev => ({ ...prev, subdivision }), false) // no onChange — UI-only state
}, [update])

// In the return object:
return {
  ...state,
  addNode,
  removeNode,
  updateNode,
  setSelectedNodeId,
  setScale,
  setDataModel,
  setSubdivision,   // new
}
```

### `PrintLayoutEditor.tsx`

Destructure `subdivision` and `setSubdivision` from `usePrintLayout`.

Add a subdivision picker to the toolbar. Four buttons, each with a small SVG icon showing the grid layout:

| Button | Aria-label |
|--------|------------|
| Single rectangle | "Full page" |
| Two side-by-side rectangles | "2 columns" |
| Two stacked rectangles | "2 rows" |
| 2×2 grid | "4 cells" |

The active button has an indigo highlight. The picker sits between the "Print Layout Editor" label and the scale slider.

Pass `subdivision` to `PreviewCanvas`:

```tsx
<PreviewCanvas
  nodes={nodes}
  scale={scale}
  pageWidth={pageWidth}
  pageHeight={pageHeight}
  subdivision={subdivision}      // new
  selectedNodeId={selectedNodeId}
  liquid={liquid}
  dataModel={dataModel}
  onSelectNode={setSelectedNodeId}
  onUpdateNode={(id, patch) => updateNode(id, patch)}
/>
```

### `PreviewCanvas.tsx`

Add imports at the top:

```ts
import { subdivisionGrid, type Subdivision } from './types'
import { NodeMirror } from './NodeMirror'
```

Add `subdivision: Subdivision` to `PreviewCanvasProps`:

```ts
interface PreviewCanvasProps {
  nodes: LayoutNode[]
  scale: number
  pageWidth: number
  pageHeight: number
  subdivision: Subdivision      // new
  selectedNodeId: string | null
  liquid: Liquid
  dataModel: Record<string, unknown>
  onSelectNode: (id: string | null) => void
  onUpdateNode: (id: string, patch: Partial<LayoutNode>) => void
}
```

**Cell dimensions** — replace the existing `pageWidthPx`/`pageHeightPx` declarations (currently lines 26–27 of `PreviewCanvas.tsx`) with this expanded block at the top of the component:

```ts
const { cols, rows } = subdivisionGrid(subdivision)
// pageWidthPx / pageHeightPx replace the existing declarations of the same name
const pageWidthPx  = pageWidth  * MM_TO_PX
const pageHeightPx = pageHeight * MM_TO_PX
const cellWidthPx  = pageWidthPx  / cols   // logical px, same unit as node.x / node.width
const cellHeightPx = pageHeightPx / rows
```

**Drag clamping** — update `handleDragEnd` to use cell dimensions. All values are in logical (pre-scale) px; `delta` is already divided by `scaleRef.current` before reaching this line:

```ts
// Clamp so the node's full bounding box stays within the edit cell (col=0, row=0).
// cellWidthPx and node.width are both in logical px (pre-scale).
const clampedX = Math.max(0, Math.min(newX, cellWidthPx  - node.width))
const clampedY = Math.max(0, Math.min(newY, cellHeightPx - node.height))
```

**Divider lines** — render inside the page div, after the existing `NodeDragHandle` nodes, before mirrors:

```tsx
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
```

**Mirror cells** — render after the dividers. Loop over all (col, row) pairs; skip (0, 0) which is the edit cell:

```tsx
{Array.from({ length: cols }, (_, col) =>
  Array.from({ length: rows }, (_, row) => {
    if (col === 0 && row === 0) return null  // edit cell — no mirror needed
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
```

### `NodeDragHandle.tsx` — extract `useNodeHtml`

Extract the existing Liquid rendering `useEffect` into a named hook in the same file and export it:

```ts
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
        if (!cancelled) { setHtml(result); setRenderError(null) }
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
```

`NodeDragHandle` then calls `const { html, renderError } = useNodeHtml(node, liquid, dataModel)` instead of the inline state + effect.

### `NodeMirror.tsx` (new file)

Full file skeleton:

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

---

## Behaviour Details

- Switching subdivision does **not** reset or move nodes.
- When `subdivision === 'full'`, no divider lines are drawn and no mirrors are shown.
- The edit cell (col=0, row=0) is visually identical to the current full-page canvas — no tint, no extra border — to keep the editing experience unchanged.
- Mirror cells have `pointer-events: none` on the root element, so clicks fall through to the page background and deselect the current node.
- `setSubdivision` uses `notify = false` (same as `setScale`), so subdivision changes do not fire `onChange` directly. `subdivision` is included in `PrintLayoutState` for type consistency with `scale`, but callers who persist `onChange` payloads and want to exclude subdivision should strip the field before storage.

---

## Non-Goals

- Persisting the subdivision choice to the database (UI-only state; resets on page reload).
- Allowing different subdivision per saved layout preset.
- Editing in any cell other than (col=0, row=0).
