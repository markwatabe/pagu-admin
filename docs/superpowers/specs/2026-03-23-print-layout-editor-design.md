# Print Layout Editor — Design Spec

**Date:** 2026-03-23
**Project:** pagu-admin
**Stack:** Astro + React 19 + Tailwind v4

---

## Overview

A React component (`PrintLayoutEditor`) for visually designing the layout of a printed page (e.g. a restaurant menu). The editor is split into two panels:

- **Left:** a live, scalable preview of the page with draggable top-level nodes
- **Right:** a class editor that appears when a node is selected

Top-level nodes are absolutely positioned on the page canvas and hold Liquid templates rendered live against a configurable data model.

---

## Architecture

### Component Tree

```
PrintLayoutEditor
├── PreviewCanvas
│   ├── scaled page container (CSS transform)
│   ├── page bounds outline (A4 or custom size in mm)
│   └── NodeDragHandle (one per node)
│       ├── @dnd-kit drag wrapper (scale-aware)
│       ├── renders Liquid template live via liquidjs
│       └── click → select node
└── ClassEditor (shown only when a node is selected)
    ├── visual pickers (typography, spacing, alignment)
    ├── position & size inputs (x, y, width, height)
    ├── raw CSS class string input (synced with pickers)
    └── Liquid template textarea
```

### State Hook: `usePrintLayout`

All state is owned by `usePrintLayout`. `PrintLayoutEditor` accepts optional initial state and exposes the full state + mutations for external persistence (DB, file).

```ts
interface LayoutNode {
  id: string
  x: number        // px, absolute on page
  y: number        // px
  width: number    // px
  height: number   // px
  classes: string  // Tailwind / CSS class string
  template: string // Liquid template source
}

interface PrintLayoutState {
  nodes: LayoutNode[]
  selectedNodeId: string | null
  scale: number                       // e.g. 0.6
  dataModel: Record<string, unknown>  // exposed to all Liquid templates
  pageWidth: number                   // mm (default: 210 — A4)
  pageHeight: number                  // mm (default: 297 — A4)
}
```

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

---

## Components

### `PrintLayoutEditor`

Top-level wrapper. Accepts optional `initialState` prop and renders the two-panel layout. A toolbar at the top contains the scale slider and an "Add Node" button.

```tsx
interface PrintLayoutEditorProps {
  initialState?: Partial<PrintLayoutState>
  onChange?: (state: PrintLayoutState) => void  // called on any state change
}
```

### `PreviewCanvas`

Receives nodes, scale, selectedNodeId, and callbacks. Renders a grey background with the page as a white rectangle (dimensions derived from `pageWidth`/`pageHeight` converted from mm to px at 96 dpi). Applies `transform: scale(scale)` with `transform-origin: top center` to the page element. Wraps page content in a `@dnd-kit` `DndContext`.

### `NodeDragHandle`

Wraps each node. Uses `@dnd-kit`'s `useDraggable` with a custom pointer sensor that divides drag deltas by `scale` to compensate for the CSS transform, preventing nodes from overshooting under the cursor. On drag end, calls `updateNode` with new `x`/`y`. Click (without drag) calls `setSelectedNodeId`. Shows a blue selection outline and corner handles when selected; a dashed grey outline otherwise.

### `ClassEditor`

Shown in the right panel when `selectedNodeId` is non-null. Contains three sections:

1. **Visual pickers** — dropdowns and toggle buttons for a curated set of Tailwind tokens:
   - Font size: `text-xs` → `text-sm` → `text-base` → `text-lg` → `text-xl` → `text-2xl` → `text-3xl` → `text-4xl`
   - Font weight: `font-normal` / `font-semibold` / `font-bold`
   - Text alignment: `text-left` / `text-center` / `text-right`
   - Text color: a small palette of Tailwind color tokens

2. **Position & size inputs** — four numeric inputs (x, y, width, height in px) that directly update the node's position/size values. These are kept separate from the class string.

3. **Raw class string** — a text input showing the full class string. Editing it re-parses tokens; known tokens update the visual pickers. Unknown tokens pass through untouched.

4. **Liquid template textarea** — monospace textarea for the node's template source. Changes re-trigger live rendering in the preview.

Pickers and raw class string stay in sync: picking a value replaces the corresponding token in the class string; editing the raw string updates picker selections for known tokens.

---

## Liquid Template Rendering

One shared `liquidjs` `Liquid` instance is created at the editor level and passed down via props. Each `NodeDragHandle` calls `liquid.parseAndRender(template, dataModel)` inside a `useEffect` that depends on `[template, dataModel]`. The rendered HTML is applied via `dangerouslySetInnerHTML`. Render errors are caught and displayed inline as a small red error message within the node bounds.

---

## Drag-and-Drop

Library: `@dnd-kit/core` + `@dnd-kit/utilities`.

Scale compensation: a custom `PointerSensor` subclass divides the raw pointer delta by the current `scale` value before reporting it, so a node moves exactly as far as the cursor regardless of zoom level. Nodes are constrained to stay within the page bounds.

---

## Data Flow

```
usePrintLayout (state owner)
    │
    ├── nodes[], scale, selectedNodeId, dataModel
    │       ↓
    ├── PreviewCanvas
    │       └── NodeDragHandle × N
    │               ├── renders Liquid template live
    │               ├── drag end → updateNode(id, {x, y})
    │               └── click → setSelectedNodeId(id)
    │
    └── ClassEditor (selectedNode)
            ├── picker change → updateNode(id, {classes})
            ├── raw class edit → updateNode(id, {classes})
            └── template edit → updateNode(id, {template})
```

---

## Files to Create

```
src/components/print-layout/
  PrintLayoutEditor.tsx       — top-level component + toolbar
  PreviewCanvas.tsx           — scaled canvas, DndContext
  NodeDragHandle.tsx          — per-node drag + selection + liquid render
  ClassEditor.tsx             — right panel: pickers + class string + template
  usePrintLayout.ts           — state hook
  types.ts                    — LayoutNode, PrintLayoutState, UsePrintLayoutReturn
```

---

## Dependencies to Add

```
@dnd-kit/core
@dnd-kit/utilities
liquidjs
```

---

## Out of Scope

- Saving state to DB or file (the `onChange` prop enables this externally)
- Undo/redo
- Node z-index ordering UI
- Resize handles on nodes (size is edited via the position/size inputs)
- Multi-select
