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
