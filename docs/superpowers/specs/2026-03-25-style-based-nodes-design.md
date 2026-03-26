# Replace Tailwind Classes with Inline Styles and CSS Variables in Menu Output

**Date:** 2026-03-25
**Scope:** Menu output rendering (print page, node content) and right-side node editor panel. Editor admin chrome (toolbar, page tree, left panel) is unchanged.

## Problem

Node styling is currently driven by Tailwind class strings (`node.classes: string`). This creates a hard dependency on Tailwind for the menu output, prevents design tokens (CSS variables) from driving the visual output, and makes the styling opaque — values are encoded as class names rather than explicit CSS properties.

## Design

### Data Model Change

Replace `classes: string` on `LayoutNode` with `style: Record<string, string>`.

```typescript
// Before
export interface LayoutNode {
  id: string
  x: number; y: number; width: number; height: number
  classes: string          // "text-center text-3xl font-bold"
  template: string
  query: string | null
}

// After
export interface LayoutNode {
  id: string
  x: number; y: number; width: number; height: number
  style: Record<string, string>  // { textAlign: 'center', fontSize: 'var(--menu-header-size)', fontWeight: '700' }
  template: string
  query: string | null
}
```

Values in the `style` object can be:
- Direct CSS values: `'15px'`, `'#000000'`, `'center'`
- Design token references: `'var(--menu-header-size)'`, `'var(--menu-fg)'`

### Style Tokens (replaces classTokens.ts)

Replace `classTokens.ts` with `styleTokens.ts`. Instead of arrays of Tailwind class names, define arrays of CSS property options with labels and values.

```typescript
export interface StyleOption {
  label: string
  value: string
}

export const FONT_SIZE_OPTIONS: StyleOption[] = [
  { label: 'var(--menu-header-size)', value: 'var(--menu-header-size)' },
  { label: 'var(--menu-section-title-size)', value: 'var(--menu-section-title-size)' },
  { label: 'var(--menu-item-size)', value: 'var(--menu-item-size)' },
  { label: 'var(--menu-desc-size)', value: 'var(--menu-desc-size)' },
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '32px', value: '32px' },
  { label: '48px', value: '48px' },
]

export const TEXT_ALIGN_OPTIONS: StyleOption[] = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

// ... similar for fontWeight, color, backgroundColor, padding, letterSpacing, etc.
```

Color options reference design tokens: `'var(--menu-fg)'`, `'var(--menu-muted)'`, `'var(--menu-accent)'`.

Helpers change from class-string manipulation to object manipulation:

```typescript
export function getStyleValue(style: Record<string, string>, prop: string): string | undefined {
  return style[prop]
}

export function applyStyle(style: Record<string, string>, prop: string, value: string): Record<string, string> {
  if (!value) {
    const next = { ...style }
    delete next[prop]
    return next
  }
  return { ...style, [prop]: value }
}
```

### Right Panel (ClassEditor -> StyleEditor)

Rename `ClassEditor` to `StyleEditor`. The panel structure stays the same (sections for typography, background, borders, etc.) but each picker writes a CSS property + value instead of toggling a Tailwind class.

- **Font size** dropdown: options are design token vars and direct px values; writes `style.fontSize`
- **Weight** dropdown: `'400'`, `'600'`, `'700'`; writes `style.fontWeight`
- **Align** buttons: `'left'`, `'center'`, `'right'`; writes `style.textAlign`
- **Color** buttons: `'var(--menu-fg)'`, `'var(--menu-muted)'`, `'var(--menu-accent)'`, `'#ffffff'`; writes `style.color`
- **Case** dropdown: `'none'`, `'uppercase'`, `'lowercase'`, `'capitalize'`; writes `style.textTransform`
- **Letter spacing** dropdown: direct values like `'0.2em'`, `'0.1em'`, `'normal'`; writes `style.letterSpacing`
- **Line height** dropdown: `'1'`, `'1.25'`, `'1.375'`, `'1.5'`, `'1.75'`; writes `style.lineHeight`
- **Background** buttons: `'transparent'`, `'var(--menu-bg)'`, `'#ffffff'`, `'#000000'`; writes `style.backgroundColor`
- **Padding** dropdown: `'0'`, `'4px'`, `'8px'`, `'12px'`, `'16px'`, `'24px'`, `'32px'`; writes `style.padding`
- **Border bottom** dropdown: `'none'`, `'1px solid var(--menu-border)'`, `'2px solid currentColor'`; writes `style.borderBottom`

The "CSS Classes" raw text input is removed. Replaced with a read-only JSON preview of the style object for debugging, or removed entirely.

The "Liquid Template" textarea stays unchanged.

### Rendering Changes

All rendering paths apply `node.style` as an inline `style` prop instead of `className={node.classes}`:

**NodeDragHandle.tsx** (editor preview):
```tsx
// Before
<div className={`h-full w-full overflow-hidden ${node.classes}`}>

// After
<div style={{ height: '100%', width: '100%', overflow: 'hidden', ...node.style }}>
```

**NodeMirror.tsx** (mirror cells):
```tsx
// Before
<div className={`h-full w-full overflow-hidden ${node.classes}`}>

// After
<div style={{ height: '100%', width: '100%', overflow: 'hidden', ...node.style }}>
```

**PrintNode in MenuRenderPrintPage.tsx** (print output):
```tsx
// Before
<div className={`h-full w-full overflow-hidden ${node.classes}`}>

// After
<div style={{ height: '100%', width: '100%', overflow: 'hidden', ...node.style }}>
```

### menu-print.css

Replace hardcoded values with `var()` references so the design tokens drive the printed output:

```css
.page-header h1 { font-size: var(--menu-header-size); ... }
.menu-section h2 { font-size: var(--menu-section-title-size); color: var(--menu-muted); ... }
.menu-item-name  { font-size: var(--menu-item-size); ... }
.menu-item-desc  { font-size: var(--menu-desc-size); color: var(--menu-muted); ... }
.menu-item-price { font-size: var(--menu-price-size); ... }
/* etc. */
```

### Menu JSON Migration

Migrate existing `DINNER.json` and `BRUNCH.json` from `classes` to `style`:

```json
// Before
{ "classes": "text-center text-3xl font-bold tracking-widest uppercase" }

// After
{ "style": { "textAlign": "center", "fontSize": "var(--menu-header-size)", "fontWeight": "700", "letterSpacing": "0.2em", "textTransform": "uppercase" } }
```

### Default Node

In `usePrintLayout.ts`, change `NODE_DEFAULTS`:

```typescript
// Before
const NODE_DEFAULTS = { x: 20, y: 20, width: 200, height: 80, classes: '', template: '', query: null }

// After
const NODE_DEFAULTS = { x: 20, y: 20, width: 200, height: 80, style: {}, template: '', query: null }
```

### Deleted Files

- `classTokens.ts` — replaced by `styleTokens.ts`
- `classTokens.test.ts` — replaced by `styleTokens.test.ts`

### Backward Compatibility

All rendering paths should guard against old data: `node.style ?? {}`. This ensures menus saved before the migration (or restored from backup) degrade gracefully to unstyled nodes rather than crashing.

The server has no schema validation for menu JSON — it reads/writes the file as-is — so no backend changes are needed.

## Files Changed

| File | Change |
|------|--------|
| `types.ts` | `classes: string` -> `style: Record<string, string>` |
| `classTokens.ts` | Delete, replace with `styleTokens.ts` |
| `ClassEditor.tsx` | Rename to `StyleEditor.tsx`, rewrite pickers to write CSS properties |
| `NodeDragHandle.tsx` | `className={node.classes}` -> `style={node.style}` |
| `NodeMirror.tsx` | Same |
| `MenuRenderPrintPage.tsx` | Same |
| `usePrintLayout.ts` | `classes: ''` -> `style: {}` in defaults |
| `PrintLayoutEditor.tsx` | Update import from ClassEditor to StyleEditor |
| `LayoutEditorPage.tsx` | Update `MenuNodeJson` interface and save logic from `classes` to `style` |
| `menu-print.css` | Hardcoded values -> `var(--menu-*)` |
| `REPO/menus/DINNER.json` | Migrate nodes from `classes` to `style` |
| `REPO/menus/BRUNCH.json` | Migrate nodes from `classes` to `style` |
| `classTokens.test.ts` | Delete, replace with `styleTokens.test.ts` |
| `PreviewCanvas.test.tsx` | Update node literals from `classes` to `style` |
| `NodeDragHandle.test.tsx` | Same |
| `NodeMirror.test.tsx` | Same |
| `usePrintLayout.test.ts` | Same |

## Out of Scope

- Editor admin chrome (toolbar, page tree, left panel, canvas background) stays Tailwind
- DesignTokensEditor component stays as-is
- No changes to the Liquid template system
