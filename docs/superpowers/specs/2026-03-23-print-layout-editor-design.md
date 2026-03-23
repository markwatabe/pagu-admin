# Print Layout Editor — Design Spec

**Date:** 2026-03-23
**Project:** pagu-admin
**Stack:** Astro + React 19 + Tailwind v4

---

## Overview

A React component (`PrintLayoutEditor`) for visually designing the layout of a printed page (e.g. a restaurant menu). The editor is split into two panels:

- **Left:** a live, scalable preview of the page with draggable top-level nodes
- **Right:** a class editor that appears when a node is selected; a placeholder is shown when nothing is selected

Top-level nodes are absolutely positioned on the page canvas and hold Liquid templates rendered live against a configurable data model.

---

## Coordinate Space

All node positions and dimensions (`x`, `y`, `width`, `height`) are stored and computed in **logical CSS pixels in the pre-scale coordinate space** (i.e. as if `scale = 1.0`).

Page dimensions are stored in millimetres (`pageWidth`, `pageHeight`). The conversion to logical pixels uses the standard screen resolution formula:

```
px = mm × (96 / 25.4)   // ≈ 3.7795 px/mm
```

This constant is defined once in `types.ts` as `MM_TO_PX = 96 / 25.4`. All components import and use this constant — never inline the number.

The visual CSS `transform: scale(scale)` is applied to the page element only for display. Drag deltas, bounds clamping, and size inputs all operate in logical px.

---

## Architecture

### Component Tree

```
PrintLayoutEditor  (owns: Liquid instance via useMemo)
├── PreviewCanvas
│   ├── scaled page container (CSS transform: scale(scale), transform-origin: top center)
│   ├── page bounds outline (derived from pageWidth × MM_TO_PX, pageHeight × MM_TO_PX)
│   ├── page onClick → setSelectedNodeId(null)
│   └── NodeDragHandle (one per node)
│       ├── @dnd-kit drag wrapper (scale-aware delta correction)
│       ├── renders Liquid template live via liquidjs
│       └── click (stopPropagation) → setSelectedNodeId(node.id)
└── ClassEditor (right panel)
    ├── shown when selectedNodeId is non-null
    ├── placeholder ("Select a node to edit") when selectedNodeId is null
    ├── visual pickers (typography, alignment)
    ├── position & size inputs (x, y, width, height in px)
    ├── raw CSS class string input (synced with pickers)
    └── Liquid template textarea
```

### State Hook: `usePrintLayout`

All state is owned by `usePrintLayout`. `PrintLayoutEditor` accepts optional `initialState` and exposes the full state + mutations for external persistence (DB, file).

```ts
interface LayoutNode {
  id: string
  x: number        // logical px, pre-scale, absolute on page
  y: number        // logical px, pre-scale
  width: number    // logical px, pre-scale
  height: number   // logical px, pre-scale
  classes: string  // Tailwind / CSS class string
  template: string // Liquid template source
}

interface PrintLayoutState {
  nodes: LayoutNode[]
  selectedNodeId: string | null
  scale: number                       // e.g. 0.6 — display only, does not affect stored coords
  dataModel: Record<string, unknown>  // exposed to all Liquid templates; must be referentially stable
  pageWidth: number                   // mm (default: 210 — A4 portrait)
  pageHeight: number                  // mm (default: 297 — A4 portrait)
}
```

Page size is **immutable after mount**. The hook exposes no `setPageSize` — callers must set `initialState.pageWidth`/`pageHeight` before mounting. This simplifies coordinate math and drag bounds. If page size switching is needed in the future it can be added as a new hook mutation.

The hook exposes:

```ts
interface UsePrintLayoutReturn extends PrintLayoutState {
  addNode: (node?: Partial<LayoutNode>) => void
  removeNode: (id: string) => void
  updateNode: (id: string, patch: Partial<LayoutNode>) => void
  setSelectedNodeId: (id: string | null) => void
  setScale: (scale: number) => void
  setDataModel: (model: Record<string, unknown>) => void
}
```

**`addNode` defaults:** When called with no arguments (or a partial), missing fields fill in as:

| Field | Default |
|-------|---------|
| `id` | `crypto.randomUUID()` |
| `x` | `20` (logical px) |
| `y` | `20` (logical px) |
| `width` | `200` (logical px) |
| `height` | `80` (logical px) |
| `classes` | `""` |
| `template` | `""` |

New nodes are appended to the end of `nodes[]`, so they render on top of existing nodes (see Stacking Order below).

**`dataModel` ownership:** `dataModel` is internal editor state, seeded from `initialState.dataModel` (default: `{}`). The `setDataModel` mutation allows the editor to expose a UI for editing the data model (future). Callers who need to drive the data model from outside (e.g. live DB data) should pass it in `initialState` and re-mount, or manage state externally and use the `onChange` callback to sync out.

**`onChange` firing:**
- `setScale` — does **not** trigger `onChange`. Scale is display-only state and must not be persisted.
- `setDataModel` — **does** trigger `onChange` immediately (data model is layout data).
- `updateNode` / `addNode` / `removeNode` — trigger `onChange` immediately, except when the update originates from a drag. Drag end triggers `onChange` once (`onDragEnd` event), not on every intermediate drag position.
- `setSelectedNodeId` — does **not** trigger `onChange`. Selection is ephemeral UI state.

The caller is responsible for debouncing `onChange` if persistence writes are expensive.

---

## Components

### `PrintLayoutEditor`

Top-level wrapper. Toolbar at top contains the scale slider and "Add Node" button.

```tsx
interface PrintLayoutEditorProps {
  initialState?: Partial<PrintLayoutState>
  onChange?: (state: PrintLayoutState) => void
}
```

### `PreviewCanvas`

Renders a grey background (`bg-gray-200`) with the page as a white box. Page logical dimensions: `pageWidth × MM_TO_PX` by `pageHeight × MM_TO_PX` px. Applies `transform: scale(scale)` with `transform-origin: top center`. Wraps nodes in a `@dnd-kit` `DndContext` with a custom scale-aware `PointerSensor`.

The page container `div` has an `onClick` handler that calls `setSelectedNodeId(null)`. Node click handlers call `e.stopPropagation()` so a node click selects the node without bubbling up to the background handler.

### `NodeDragHandle`

**Scale-aware dragging:** @dnd-kit's `PointerSensor` is configured with `activationConstraint: { distance: 5 }` (5 screen px as reported by browser pointer events — not logical px) so small clicks don't trigger accidental drags. Scale compensation is applied in the `onDragEnd` handler — **not** via sensor subclassing. The delta reported by `onDragEnd` (`delta.x`, `delta.y`) is in screen pixels (post-scale), so it is divided by `scale` before being added to the node's logical `x`/`y`:

```ts
const newX = node.x + event.delta.x / scale
const newY = node.y + event.delta.y / scale
```

`scale` is read from a `ref` that is kept in sync with the current scale state, so the `onDragEnd` handler always has the latest value without needing to re-register.

**Bounds clamping:** After computing `newX`/`newY`, clamp so the **full bounding box** stays within the page:

```ts
clampedX = clamp(newX, 0, pageWidthPx - node.width)
clampedY = clamp(newY, 0, pageHeightPx - node.height)
```

If a node is wider/taller than the page, it is pinned to `x = 0` / `y = 0`. Clamping applies only on drag end. Direct edits via the position inputs are not clamped (allowing intentional overflow for advanced use).

**Selection:** A click without a drag (pointer moved < 5 screen px) calls `setSelectedNodeId(node.id)`. Node click handlers call `e.stopPropagation()` to prevent bubbling.

**Stacking order:** Nodes are rendered in `nodes[]` array order. Last element = highest z-index. When added via `addNode`, new nodes appear on top. No z-index UI is in scope.

**Liquid rendering:** Calls `liquid.parseAndRender(template, dataModel)` inside a `useEffect` with `[template, dataModel]` as deps. Stores rendered HTML in local state and applies via `dangerouslySetInnerHTML`. Errors are caught and shown inline as a small red `<pre>` within the node bounds. The `Liquid` instance is passed down as a prop — callers do not create it themselves.

**Trust model:** Liquid output is rendered via `dangerouslySetInnerHTML` without sanitization. This editor is intended for use by trusted operators in a private admin UI. If the editor is ever exposed to untrusted input, DOMPurify sanitization should be added before the `dangerouslySetInnerHTML` call.

**Visual states:**
- **Selected:** blue 2px solid border (`border-indigo-500`), corner handles (8×8px filled squares), `cursor-move`
- **Unselected:** dashed grey border (`border-dashed border-slate-300`), `cursor-pointer`
- **Drag active:** blue border, semi-transparent overlay, `cursor-grabbing`

### `ClassEditor`

Shown in the right panel. Four sections:

1. **Visual pickers — Typography**

   | Picker | Tokens |
   |--------|--------|
   | Font size | `text-xs` `text-sm` `text-base` `text-lg` `text-xl` `text-2xl` `text-3xl` `text-4xl` |
   | Font weight | `font-normal` `font-semibold` `font-bold` |
   | Text align | `text-left` `text-center` `text-right` |
   | Text color | Fixed palette: `text-black` `text-white` `text-gray-500` `text-gray-700` `text-indigo-600` `text-red-600` |

   **Picker ↔ class string sync:** Each category owns a mutually exclusive set of tokens. The sync algorithm:
   - To detect which token from a category is active, scan the class string for tokens that belong to that category. First match wins.
   - To apply a new token, remove all tokens belonging to that category from the class string, then append the new token.
   - `text-{color}-{shade}` tokens are identified by matching against the fixed palette list — not by prefix heuristic — to avoid conflating `text-sm` (size) with `text-slate-500` (color).
   - Unknown tokens in the class string pass through untouched.

2. **Position & size inputs** — four numeric inputs (x, y, width, height) in logical px. Updates call `updateNode` directly. Not clamped (see Bounds Clamping note above).

3. **Raw CSS class string** — text input showing the full class string. On change: re-parse token categories and update picker selections for known tokens. Unknown tokens preserved.

4. **Liquid template textarea** — monospace, full-width, resizable. Changes call `updateNode(id, { template })`.

**Empty state:** When `selectedNodeId` is null, the right panel shows a centered placeholder: _"Select a node to edit its classes and template."_

---

## Liquid Template Rendering

One `Liquid` instance is created with `useMemo(() => new Liquid(), [])` inside `PrintLayoutEditor` and passed via props: `PrintLayoutEditor` → `PreviewCanvas` → `NodeDragHandle`.

`dataModel` must be **referentially stable** — callers using `setDataModel` should pass a `useMemo`-wrapped object. If `dataModel` is passed as an inline object literal on every render, `NodeDragHandle` effects will re-run on every render. The hook does not enforce this internally.

---

## Tailwind v4 Dynamic Classes Note

Node class strings are applied dynamically at runtime (`className={node.classes}`). Because these are arbitrary user-typed strings, they cannot be statically scanned by Tailwind v4's CSS scanner.

The implementation must handle this with an `@source inline(...)` block in the global CSS that enumerates the supported picker tokens (the fixed token sets from `ClassEditor`). Any class outside that set will silently have no effect. This is an acceptable constraint given the picker-based editing model — users are guided toward the supported tokens. The implementation step will define the complete `@source inline(...)` block.

---

## Data Flow

```
usePrintLayout (state owner)
    │
    ├── nodes[], scale, selectedNodeId, dataModel
    │       ↓
    ├── PreviewCanvas (receives Liquid instance as prop)
    │   └── NodeDragHandle × N
    │       ├── renders template live (useEffect on [template, dataModel])
    │       ├── drag end → updateNode(id, {x: clampedX, y: clampedY})
    │       └── click → setSelectedNodeId(id)
    │
    └── ClassEditor (selectedNode | null)
        ├── picker change → updateNode(id, {classes})
        ├── raw class edit → updateNode(id, {classes})
        ├── position input → updateNode(id, {x|y|width|height})
        └── template edit → updateNode(id, {template})
```

---

## Files to Create

```
src/components/print-layout/
  types.ts                    — LayoutNode, PrintLayoutState, UsePrintLayoutReturn, MM_TO_PX
  usePrintLayout.ts           — state hook
  PrintLayoutEditor.tsx       — top-level component + toolbar
  PreviewCanvas.tsx           — scaled canvas, DndContext (receives Liquid instance as prop)
  NodeDragHandle.tsx          — per-node drag + selection + liquid render
  ClassEditor.tsx             — right panel: pickers + class string + template
```

All components import types from `./types`.

---

## Dependencies to Add

```
@dnd-kit/core
@dnd-kit/utilities
liquidjs
```

Note: `@dnd-kit/modifiers` is **not** used. Bounds clamping is handled manually in the `onDragEnd` handler (see NodeDragHandle section). The `restrictToParentElement` modifier operates in screen-pixel space and is incompatible with the scale-aware logical coordinate approach used here.

---

## Out of Scope

- Saving state to DB or file (the `onChange` prop enables this externally)
- Undo/redo
- Node z-index ordering UI (stacking = array order)
- Resize handles on nodes (size edited via position inputs)
- Multi-select
- Page size switching after mount
