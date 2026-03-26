# Style-Based Nodes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Tailwind class-based node styling with inline CSS styles and design token variables in the menu output and right-side editor panel.

**Architecture:** `LayoutNode.classes: string` becomes `LayoutNode.style: Record<string, string>`. The right panel writes CSS property/value pairs instead of toggling Tailwind classes. Rendering applies `node.style` as inline styles. Design token `var()` references are first-class values in style options.

**Tech Stack:** React, CSS custom properties, LiquidJS, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-style-based-nodes-design.md`

---

### Task 1: Create `styleTokens.ts` with tests

Replace `classTokens.ts` with a style-property-based system.

**Files:**
- Create: `app/src/components/print-layout/styleTokens.ts`
- Create: `app/src/test/styleTokens.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// app/src/test/styleTokens.test.ts
import { describe, it, expect } from 'vitest'
import { getStyleValue, applyStyle, FONT_SIZE_OPTIONS, TEXT_ALIGN_OPTIONS } from '../components/print-layout/styleTokens'

describe('getStyleValue', () => {
  it('returns value for existing property', () => {
    expect(getStyleValue({ fontSize: '15px' }, 'fontSize')).toBe('15px')
  })

  it('returns undefined for missing property', () => {
    expect(getStyleValue({}, 'fontSize')).toBeUndefined()
  })
})

describe('applyStyle', () => {
  it('sets a property on empty style', () => {
    expect(applyStyle({}, 'fontSize', '15px')).toEqual({ fontSize: '15px' })
  })

  it('overwrites an existing property', () => {
    expect(applyStyle({ fontSize: '15px' }, 'fontSize', '24px')).toEqual({ fontSize: '24px' })
  })

  it('removes a property when value is empty string', () => {
    expect(applyStyle({ fontSize: '15px', color: 'red' }, 'fontSize', '')).toEqual({ color: 'red' })
  })

  it('preserves other properties', () => {
    expect(applyStyle({ fontSize: '15px', fontWeight: '700' }, 'fontSize', '24px'))
      .toEqual({ fontSize: '24px', fontWeight: '700' })
  })
})

describe('option arrays', () => {
  it('FONT_SIZE_OPTIONS includes design token vars', () => {
    const labels = FONT_SIZE_OPTIONS.map(o => o.value)
    expect(labels).toContain('var(--menu-header-size)')
    expect(labels).toContain('var(--menu-item-size)')
  })

  it('TEXT_ALIGN_OPTIONS has left, center, right', () => {
    expect(TEXT_ALIGN_OPTIONS.map(o => o.value)).toEqual(['left', 'center', 'right'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter app exec vitest run src/test/styleTokens.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `styleTokens.ts`**

```typescript
// app/src/components/print-layout/styleTokens.ts

export interface StyleOption {
  label: string
  value: string
}

// ── Typography ──────────────────────────────────────────────

export const FONT_SIZE_OPTIONS: StyleOption[] = [
  { label: '--menu-header-size', value: 'var(--menu-header-size)' },
  { label: '--menu-section-title-size', value: 'var(--menu-section-title-size)' },
  { label: '--menu-item-size', value: 'var(--menu-item-size)' },
  { label: '--menu-price-size', value: 'var(--menu-price-size)' },
  { label: '--menu-desc-size', value: 'var(--menu-desc-size)' },
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '32px', value: '32px' },
  { label: '48px', value: '48px' },
]

export const FONT_WEIGHT_OPTIONS: StyleOption[] = [
  { label: 'Normal', value: '400' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
]

export const TEXT_ALIGN_OPTIONS: StyleOption[] = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

export const TEXT_COLOR_OPTIONS: StyleOption[] = [
  { label: '--menu-fg', value: 'var(--menu-fg)' },
  { label: '--menu-muted', value: 'var(--menu-muted)' },
  { label: '--menu-accent', value: 'var(--menu-accent)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
]

export const TEXT_TRANSFORM_OPTIONS: StyleOption[] = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Lowercase', value: 'lowercase' },
  { label: 'Capitalize', value: 'capitalize' },
]

export const LETTER_SPACING_OPTIONS: StyleOption[] = [
  { label: 'Tight', value: '-0.025em' },
  { label: 'Normal', value: 'normal' },
  { label: 'Wide', value: '0.05em' },
  { label: 'Wider', value: '0.1em' },
  { label: 'Widest', value: '0.2em' },
]

export const LINE_HEIGHT_OPTIONS: StyleOption[] = [
  { label: '1', value: '1' },
  { label: '1.25', value: '1.25' },
  { label: '1.375', value: '1.375' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2', value: '2' },
]

// ── Backgrounds ─────────────────────────────────────────────

export const BG_COLOR_OPTIONS: StyleOption[] = [
  { label: 'Transparent', value: 'transparent' },
  { label: '--menu-bg', value: 'var(--menu-bg)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
]

// ── Spacing ─────────────────────────────────────────────────

export const PADDING_OPTIONS: StyleOption[] = [
  { label: '0', value: '0' },
  { label: '4px', value: '4px' },
  { label: '8px', value: '8px' },
  { label: '12px', value: '12px' },
  { label: '16px', value: '16px' },
  { label: '24px', value: '24px' },
  { label: '32px', value: '32px' },
]

// ── Borders ─────────────────────────────────────────────────

export const BORDER_BOTTOM_OPTIONS: StyleOption[] = [
  { label: 'None', value: 'none' },
  { label: '1px solid', value: '1px solid var(--menu-border)' },
  { label: '2px solid', value: '2px solid currentColor' },
]

// ── Helpers ─────────────────────────────────────────────────

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter app exec vitest run src/test/styleTokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/print-layout/styleTokens.ts app/src/test/styleTokens.test.ts
git commit -m "feat: add styleTokens replacing classTokens for CSS property-based node styling"
```

---

### Task 2: Update `LayoutNode` type and `usePrintLayout` defaults

**Files:**
- Modify: `app/src/components/print-layout/types.ts:4-12`
- Modify: `app/src/components/print-layout/usePrintLayout.ts:4-6`

- [ ] **Step 1: Update `LayoutNode` in `types.ts`**

Change line 9 from `classes: string` to `style: Record<string, string>`. Update the comment accordingly.

```typescript
export interface LayoutNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  style: Record<string, string>  // CSS properties — values can use var(--token)
  template: string
  query: string | null
}
```

- [ ] **Step 2: Update `NODE_DEFAULTS` in `usePrintLayout.ts`**

Change `classes: ''` to `style: {}` in the `NODE_DEFAULTS` constant.

- [ ] **Step 3: Verify TypeScript catches all downstream references**

Run: `pnpm --filter app exec vite build 2>&1 | head -50`
Expected: Build errors in files that still reference `node.classes` — this confirms the type change propagates correctly. These will be fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/print-layout/types.ts app/src/components/print-layout/usePrintLayout.ts
git commit -m "feat: change LayoutNode from classes:string to style:Record<string,string>"
```

---

### Task 3: Update rendering paths (`NodeDragHandle`, `NodeMirror`, `MenuRenderPrintPage`)

Apply `node.style` as inline styles instead of `className={node.classes}`.

**Files:**
- Modify: `app/src/components/print-layout/NodeDragHandle.tsx:131`
- Modify: `app/src/components/print-layout/NodeMirror.tsx:29`
- Modify: `app/src/pages/MenuRenderPrintPage.tsx:77`

- [ ] **Step 1: Update `NodeDragHandle.tsx`**

Line 131 — change:
```tsx
<div className={`h-full w-full overflow-hidden ${node.classes}`} style={{ pointerEvents: 'none' }}>
```
to:
```tsx
<div style={{ height: '100%', width: '100%', overflow: 'hidden', pointerEvents: 'none', ...node.style }}>
```

- [ ] **Step 2: Update `NodeMirror.tsx`**

Line 29 — change:
```tsx
<div className={`h-full w-full overflow-hidden ${node.classes}`}>
```
to:
```tsx
<div style={{ height: '100%', width: '100%', overflow: 'hidden', ...node.style }}>
```

- [ ] **Step 3: Update `MenuRenderPrintPage.tsx`**

Line 77 — change:
```tsx
<div className={`h-full w-full overflow-hidden ${node.classes}`}>
```
to:
```tsx
<div style={{ height: '100%', width: '100%', overflow: 'hidden', ...(node.style ?? {}) }}>
```

Note the `?? {}` guard for backward compatibility with old menu data.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/print-layout/NodeDragHandle.tsx app/src/components/print-layout/NodeMirror.tsx app/src/pages/MenuRenderPrintPage.tsx
git commit -m "feat: render node.style as inline CSS instead of Tailwind classes"
```

---

### Task 4: Rewrite `ClassEditor` as `StyleEditor`

Replace class-based pickers with CSS property pickers.

**Files:**
- Modify: `app/src/components/print-layout/ClassEditor.tsx` (rename to `StyleEditor.tsx`)
- Modify: `app/src/components/print-layout/PrintLayoutEditor.tsx` (update import)

- [ ] **Step 1: Rename file**

```bash
mv app/src/components/print-layout/ClassEditor.tsx app/src/components/print-layout/StyleEditor.tsx
```

- [ ] **Step 2: Rewrite `StyleEditor.tsx`**

Replace the entire file contents. Key changes:
- Import from `./styleTokens` instead of `./classTokens`
- `SelectPicker` takes `prop: string`, `options: StyleOption[]`, reads from `node.style[prop]`, writes via `applyStyle(node.style, prop, value)`
- `ButtonPicker` same pattern
- Remove "CSS Classes" section (raw class string input)
- Keep "Liquid Template" textarea unchanged
- Keep `DesignTokensEditor` unchanged
- The component export name changes from `ClassEditor` to `StyleEditor`

The `onUpdate` callback now passes `{ style: applyStyle(node.style, prop, value) }` instead of `{ classes: applyToken(...) }`.

Full replacement for `StyleEditor.tsx`:

```tsx
import { useState } from 'react'
import { NAMED_QUERIES } from './queries'
import {
  FONT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS, TEXT_ALIGN_OPTIONS, TEXT_COLOR_OPTIONS,
  TEXT_TRANSFORM_OPTIONS, LETTER_SPACING_OPTIONS, LINE_HEIGHT_OPTIONS,
  BG_COLOR_OPTIONS, PADDING_OPTIONS, BORDER_BOTTOM_OPTIONS,
  getStyleValue, applyStyle,
} from './styleTokens'
import type { StyleOption } from './styleTokens'
import type { LayoutNode } from './types'
import type { DesignTokens } from './useDesignTokens'

interface StyleEditorProps {
  node: LayoutNode | null
  dataModel: Record<string, unknown>
  onUpdate: (patch: Partial<LayoutNode>) => void
  onRemove: () => void
  designTokens?: DesignTokens | null
  onTokenUpdate?: (key: string, value: string) => void
  onTokenRemove?: (key: string) => void
  onTokenAdd?: (key: string, value: string) => void
  onTokensSave?: () => void
  tokensDirty?: boolean
  tokensSaving?: boolean
}

function schemaKeys(obj: unknown, prefix: string): string[] {
  if (obj === null || obj === undefined || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.keys(obj as Record<string, unknown>).map(k => `${prefix}.${k}`)
}

function SchemaHint({ queryKey, dataModel }: { queryKey: string | null; dataModel: Record<string, unknown> }) {
  if (queryKey) {
    const arr = dataModel[queryKey]
    const sample = Array.isArray(arr) && arr.length > 0 ? arr[0] : null
    const fields = sample ? schemaKeys(sample, 'item') : []
    return (
      <div className="space-y-1">
        <p className="text-xs text-gray-400 italic">Renders once per item.</p>
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {fields.map(f => (
              <code key={f} className="bg-gray-100 text-gray-500 px-1 py-0.5 rounded text-[10px] font-mono">
                {'{{ '}{f}{' }}'}
              </code>
            ))}
          </div>
        )}
      </div>
    )
  }

  const topKeys = Object.entries(dataModel)
    .filter(([, v]) => !Array.isArray(v))
    .flatMap(([k, v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) return schemaKeys(v, k)
      return [`${k}`]
    })

  if (topKeys.length === 0) return null

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 italic">Available variables:</p>
      <div className="flex flex-wrap gap-1">
        {topKeys.map(f => (
          <code key={f} className="bg-gray-100 text-gray-500 px-1 py-0.5 rounded text-[10px] font-mono">
            {'{{ '}{f}{' }}'}
          </code>
        ))}
      </div>
    </div>
  )
}

const ALIGN_ICONS: Record<string, string> = {
  'left': '⟵',
  'center': '≡',
  'right': '⟶',
}

function SelectPicker({ id, label, options, value, onChange }: {
  id: string
  label: string
  options: readonly StyleOption[]
  value: string | undefined
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-14 shrink-0 text-xs text-gray-500">{label}</label>
      <select
        id={id}
        aria-label={label}
        className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-xs"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ButtonPicker({ options, value, onChange, renderLabel }: {
  options: readonly StyleOption[]
  value: string | undefined
  onChange: (value: string) => void
  renderLabel: (option: StyleOption) => string
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(value === o.value ? '' : o.value)}
          className={`rounded px-1.5 py-0.5 text-xs border ${
            value === o.value
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-400'
          }`}
          aria-label={o.label}
        >
          {renderLabel(o)}
        </button>
      ))}
    </div>
  )
}

function DesignTokensEditor({
  tokens, onUpdate, onRemove, onAdd, onSave, dirty, saving,
}: {
  tokens: DesignTokens
  onUpdate: (key: string, value: string) => void
  onRemove: (key: string) => void
  onAdd: (key: string, value: string) => void
  onSave: () => void
  dirty: boolean
  saving: boolean
}) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const entries = Object.entries(tokens).sort(([a], [b]) => a.localeCompare(b))

  function handleAdd() {
    const key = newKey.trim()
    const value = newValue.trim()
    if (!key || !value) return
    onAdd(key, value)
    setNewKey('')
    setNewValue('')
  }

  return (
    <div className="flex flex-col overflow-y-auto text-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Design Tokens
        </span>
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-1 px-3 py-1.5">
            <code className="shrink-0 text-[10px] font-mono text-gray-500 w-28 truncate" title={key}>
              {key}
            </code>
            <input
              type="text"
              className="flex-1 min-w-0 rounded border border-gray-200 px-1 py-0.5 text-xs font-mono"
              value={value}
              onChange={e => onUpdate(key, e.target.value)}
            />
            {value.match(/^#[0-9a-fA-F]{3,8}$/) && (
              <input
                type="color"
                className="h-5 w-5 shrink-0 cursor-pointer rounded border border-gray-200 p-0"
                value={value}
                onChange={e => onUpdate(key, e.target.value)}
              />
            )}
            <button
              onClick={() => onRemove(key)}
              className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="Remove"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 px-3 py-2 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Add Variable</p>
        <div className="flex gap-1">
          <input
            type="text"
            className="w-28 shrink-0 rounded border border-gray-200 px-1 py-0.5 text-xs font-mono"
            placeholder="--name"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="text"
            className="flex-1 min-w-0 rounded border border-gray-200 px-1 py-0.5 text-xs font-mono"
            placeholder="value"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newKey.trim() || !newValue.trim()}
            className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>

      <div className="px-3 py-2 text-[10px] text-gray-400">
        Use in templates: <code className="bg-gray-100 px-1 rounded">var(--name)</code>
      </div>
    </div>
  )
}

export function StyleEditor({
  node, dataModel, onUpdate, onRemove,
  designTokens, onTokenUpdate, onTokenRemove, onTokenAdd, onTokensSave,
  tokensDirty, tokensSaving,
}: StyleEditorProps) {
  if (!node) {
    if (designTokens && onTokenUpdate && onTokenRemove && onTokenAdd && onTokensSave) {
      return (
        <DesignTokensEditor
          tokens={designTokens}
          onUpdate={onTokenUpdate}
          onRemove={onTokenRemove}
          onAdd={onTokenAdd}
          onSave={onTokensSave}
          dirty={tokensDirty ?? false}
          saving={tokensSaving ?? false}
        />
      )
    }
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
        Select a node to edit its styles and template.
      </div>
    )
  }

  const nodeStyle = node.style ?? {}

  function updateStyle(prop: string, value: string) {
    onUpdate({ style: applyStyle(nodeStyle, prop, value) })
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

      {/* Data query */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Query</p>
        <div className="flex items-center gap-2">
          <label htmlFor="query" className="w-14 shrink-0 text-xs text-gray-500">Query</label>
          <select
            id="query"
            aria-label="Query"
            className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-xs"
            value={node.query ?? ''}
            onChange={e => onUpdate({ query: e.target.value || null })}
          >
            <option value="">None (static)</option>
            {NAMED_QUERIES.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}
          </select>
        </div>
        <SchemaHint queryKey={node.query} dataModel={dataModel} />
      </section>

      {/* Typography */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</p>
        <SelectPicker id="font-size" label="Size" options={FONT_SIZE_OPTIONS} value={getStyleValue(nodeStyle, 'fontSize')} onChange={v => updateStyle('fontSize', v)} />
        <SelectPicker id="font-weight" label="Weight" options={FONT_WEIGHT_OPTIONS} value={getStyleValue(nodeStyle, 'fontWeight')} onChange={v => updateStyle('fontWeight', v)} />

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Align</span>
          <ButtonPicker options={TEXT_ALIGN_OPTIONS} value={getStyleValue(nodeStyle, 'textAlign')} onChange={v => updateStyle('textAlign', v)} renderLabel={o => ALIGN_ICONS[o.value] ?? o.label} />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Color</span>
          <ButtonPicker options={TEXT_COLOR_OPTIONS} value={getStyleValue(nodeStyle, 'color')} onChange={v => updateStyle('color', v)} renderLabel={o => o.label} />
        </div>

        <SelectPicker id="text-transform" label="Case" options={TEXT_TRANSFORM_OPTIONS} value={getStyleValue(nodeStyle, 'textTransform')} onChange={v => updateStyle('textTransform', v)} />
        <SelectPicker id="letter-spacing" label="Spacing" options={LETTER_SPACING_OPTIONS} value={getStyleValue(nodeStyle, 'letterSpacing')} onChange={v => updateStyle('letterSpacing', v)} />
        <SelectPicker id="line-height" label="Leading" options={LINE_HEIGHT_OPTIONS} value={getStyleValue(nodeStyle, 'lineHeight')} onChange={v => updateStyle('lineHeight', v)} />
      </section>

      {/* Background & Spacing */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Background &amp; Spacing</p>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Bg</span>
          <ButtonPicker options={BG_COLOR_OPTIONS} value={getStyleValue(nodeStyle, 'backgroundColor')} onChange={v => updateStyle('backgroundColor', v)} renderLabel={o => o.label} />
        </div>

        <SelectPicker id="padding" label="Padding" options={PADDING_OPTIONS} value={getStyleValue(nodeStyle, 'padding')} onChange={v => updateStyle('padding', v)} />
      </section>

      {/* Borders */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Borders</p>
        <SelectPicker id="border-bottom" label="Bottom" options={BORDER_BOTTOM_OPTIONS} value={getStyleValue(nodeStyle, 'borderBottom')} onChange={v => updateStyle('borderBottom', v)} />
      </section>

      {/* Position & size */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position &amp; Size</p>
        <div className="grid grid-cols-2 gap-2">
          {([ ['x', 'x', node.x], ['y', 'y', node.y], ['w', 'width', node.width], ['h', 'height', node.height] ] as [string, keyof typeof node, number][]).map(([label, key, value]) => (
            <label key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase">{label}</span>
              <input
                aria-label={label}
                type="number"
                className="rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                value={value}
                onChange={e => onUpdate({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
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

- [ ] **Step 3: Update `PrintLayoutEditor.tsx` import**

Change:
```typescript
import { ClassEditor } from './ClassEditor'
```
to:
```typescript
import { StyleEditor } from './StyleEditor'
```

And update the JSX from `<ClassEditor` to `<StyleEditor`.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/print-layout/StyleEditor.tsx app/src/components/print-layout/PrintLayoutEditor.tsx
git rm app/src/components/print-layout/ClassEditor.tsx
git commit -m "feat: replace ClassEditor with StyleEditor using CSS properties"
```

---

### Task 5: Update `LayoutEditorPage.tsx` save logic

**Files:**
- Modify: `app/src/pages/LayoutEditorPage.tsx:21-29,147-156`

- [ ] **Step 1: Update `MenuNodeJson` interface**

Change line 27 from `classes: string;` to `style: Record<string, string>;`.

- [ ] **Step 2: Update save payload serialization**

In `handleSave`, change line 153 from `classes: n.classes,` to `style: n.style ?? {},`.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/LayoutEditorPage.tsx
git commit -m "feat: serialize node.style instead of node.classes in menu save"
```

---

### Task 6: Migrate menu JSON files

**Files:**
- Modify: `REPO/menus/DINNER.json`
- Modify: `REPO/menus/BRUNCH.json`

- [ ] **Step 1: Migrate `DINNER.json`**

Replace each node's `"classes"` field with equivalent `"style"` object:

| Old classes | New style |
|---|---|
| `"text-center text-3xl font-bold tracking-widest uppercase"` | `{ "textAlign": "center", "fontSize": "var(--menu-header-size)", "fontWeight": "700", "letterSpacing": "0.2em", "textTransform": "uppercase" }` |
| `"text-center text-sm tracking-wider text-gray-500"` | `{ "textAlign": "center", "fontSize": "var(--menu-desc-size)", "letterSpacing": "0.1em", "color": "var(--menu-muted)" }` |
| `"text-sm"` | `{ "fontSize": "var(--menu-item-size)" }` |
| `"text-center text-xl font-bold uppercase tracking-widest"` | `{ "textAlign": "center", "fontSize": "20px", "fontWeight": "700", "textTransform": "uppercase", "letterSpacing": "0.2em" }` |

- [ ] **Step 2: Migrate `BRUNCH.json`**

Same mapping as above for matching class strings.

- [ ] **Step 3: Commit**

```bash
git add REPO/menus/DINNER.json REPO/menus/BRUNCH.json
git commit -m "feat: migrate menu JSON from Tailwind classes to inline style objects"
```

---

### Task 7: Update `menu-print.css` to use design token vars

**Files:**
- Modify: `app/src/styles/menu-print.css`

- [ ] **Step 1: Replace hardcoded values with `var()` references**

```css
.page-header h1 { font-size: var(--menu-header-size); font-weight: 700; letter-spacing: -0.02em; margin: 0; line-height: 1; }
.page-header p  { margin: 8px 0 0; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--menu-muted); }

.menu-section + .menu-section { margin-top: var(--menu-section-gap); padding-top: 32px; border-top: 1px solid var(--menu-border); }
.menu-section h2 { font-size: var(--menu-section-title-size); font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: var(--menu-muted); margin: 0 0 var(--menu-item-gap); }
.menu-section ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--menu-item-gap); }

.menu-item-name  { font-size: var(--menu-item-size); font-weight: 600; line-height: 1.375; white-space: nowrap; }
.menu-item-desc  { font-size: var(--menu-desc-size); color: var(--menu-muted); margin: 2px 0 0; line-height: 1.4; }
.menu-item-price { font-size: var(--menu-price-size); font-weight: 600; white-space: nowrap; flex-shrink: 0; font-variant-numeric: tabular-nums; }

.page-footer { margin-top: 48px; border-top: 1px solid var(--menu-border); padding-top: 20px; text-align: center; font-size: 11px; color: var(--menu-muted); }
```

Keep `@font-face` declarations, `.menu-item`, `.menu-item-left`, `.menu-item-name-row`, `.leader` unchanged (they have no token equivalents).

- [ ] **Step 2: Commit**

```bash
git add app/src/styles/menu-print.css
git commit -m "feat: replace hardcoded values in menu-print.css with design token vars"
```

---

### Task 8: Update test files

**Files:**
- Rewrite: `app/src/test/ClassEditor.test.tsx` -> `app/src/test/StyleEditor.test.tsx`
- Modify: `app/src/test/NodeDragHandle.test.tsx:12`
- Modify: `app/src/test/NodeMirror.test.tsx:11`
- Modify: `app/src/test/PreviewCanvas.test.tsx:10-11,78,98,117`
- Modify: `app/src/test/usePrintLayout.test.ts:37,61,70,82,88,134,143`
- Delete: `app/src/test/classTokens.test.ts`

- [ ] **Step 1: Rewrite `ClassEditor.test.tsx` as `StyleEditor.test.tsx`**

Delete `app/src/test/ClassEditor.test.tsx` and create `app/src/test/StyleEditor.test.tsx`:

```typescript
// app/src/test/StyleEditor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StyleEditor } from '../components/print-layout/StyleEditor'
import type { LayoutNode } from '../components/print-layout/types'

const baseNode: LayoutNode = {
  id: 'n1', x: 20, y: 30, width: 200, height: 80,
  style: { fontSize: 'var(--menu-item-size)', fontWeight: '700', textAlign: 'left' },
  template: '<p>{{ name }}</p>',
  query: null,
}

describe('StyleEditor', () => {
  describe('empty state', () => {
    it('shows placeholder when no node selected', () => {
      render(<StyleEditor node={null} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect(screen.getByText(/select a node/i)).toBeInTheDocument()
    })
  })

  describe('typography pickers', () => {
    it('renders font size picker with current value', () => {
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      const select = screen.getByLabelText(/size/i) as HTMLSelectElement
      expect(select.value).toBe('var(--menu-item-size)')
    })

    it('calls onUpdate with updated style when size changes', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/size/i), { target: { value: '24px' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ style: expect.objectContaining({ fontSize: '24px' }) })
      )
    })

    it('removes the property when blank option is selected', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/size/i), { target: { value: '' } })
      const style = onUpdate.mock.calls[0][0].style
      expect(style).not.toHaveProperty('fontSize')
    })
  })

  describe('position inputs', () => {
    it('shows current x, y, width, height', () => {
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/^x$/i) as HTMLInputElement).value).toBe('20')
      expect((screen.getByLabelText(/^y$/i) as HTMLInputElement).value).toBe('30')
      expect((screen.getByLabelText(/^w$/i) as HTMLInputElement).value).toBe('200')
      expect((screen.getByLabelText(/^h$/i) as HTMLInputElement).value).toBe('80')
    })

    it('calls onUpdate when x changes', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/^x$/i), { target: { value: '50' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ x: 50 }))
    })
  })

  describe('template textarea', () => {
    it('shows current template', () => {
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/liquid template/i) as HTMLTextAreaElement).value).toBe('<p>{{ name }}</p>')
    })

    it('calls onUpdate when template changes', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/liquid template/i), { target: { value: '<h1>{{ title }}</h1>' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ template: '<h1>{{ title }}</h1>' }))
    })
  })

  describe('remove button', () => {
    it('calls onRemove when Remove button clicked', () => {
      const onRemove = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={onRemove} />)
      fireEvent.click(screen.getByRole('button', { name: /remove/i }))
      expect(onRemove).toHaveBeenCalledOnce()
    })
  })
})
```

```bash
git rm app/src/test/ClassEditor.test.tsx
```

- [ ] **Step 2: Update `NodeDragHandle.test.tsx`**

Line 12: change `classes: 'font-bold'` to `style: { fontWeight: '700' }`

- [ ] **Step 2: Update `NodeMirror.test.tsx`**

Line 11: change `classes: 'text-sm'` to `style: { fontSize: '14px' }`

- [ ] **Step 3: Update `PreviewCanvas.test.tsx`**

Replace all `classes: ''` with `style: {}` (lines 10, 11, 78, 98, 117).

- [ ] **Step 4: Update `usePrintLayout.test.ts`**

- Lines 37, 61, 70, 134, 143: change `classes: ''` to `style: {}`
- Line 82: change `classes: 'font-bold'` to `style: { fontWeight: '700' }`
- Line 88: change assertion `expect(node.classes).toBe('font-bold')` to `expect(node.style).toEqual({ fontWeight: '700' })`
- Line 37: change assertion `expect(node.classes).toBe('')` to `expect(node.style).toEqual({})`

- [ ] **Step 5: Delete `classTokens.test.ts`**

```bash
git rm app/src/test/classTokens.test.ts
```

- [ ] **Step 6: Run all tests**

Run: `pnpm --filter app exec vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add app/src/test/StyleEditor.test.tsx app/src/test/NodeDragHandle.test.tsx app/src/test/NodeMirror.test.tsx app/src/test/PreviewCanvas.test.tsx app/src/test/usePrintLayout.test.ts
git commit -m "test: update all tests from classes to style"
```

---

### Task 9: Delete `classTokens.ts` and verify build

**Files:**
- Delete: `app/src/components/print-layout/classTokens.ts`

- [ ] **Step 1: Delete the file**

```bash
git rm app/src/components/print-layout/classTokens.ts
```

- [ ] **Step 2: Verify build succeeds**

Run: `pnpm --filter app exec vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run full test suite**

Run: `pnpm --filter app exec vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove classTokens.ts — fully replaced by styleTokens.ts"
```
