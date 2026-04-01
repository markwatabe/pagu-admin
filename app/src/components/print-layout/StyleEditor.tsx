import { useState, type ReactNode } from 'react'
import { db } from '../../lib/db'
import { NAMED_QUERIES } from './queries'
import {
  FONT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS, TEXT_ALIGN_OPTIONS, TEXT_COLOR_OPTIONS,
  TEXT_TRANSFORM_OPTIONS, LETTER_SPACING_OPTIONS, LINE_HEIGHT_OPTIONS,
  BG_COLOR_OPTIONS, GRADIENT_DIRECTION_OPTIONS, GRADIENT_COLOR_OPTIONS,
  PADDING_OPTIONS, BORDER_BOTTOM_OPTIONS,
  getStyleValue, applyStyle,
} from './styleTokens'
import type { StyleOption } from './styleTokens'
import type { LayoutNode } from './types'
import type { DesignTokens } from './useDesignTokens'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../ui/select'

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

/** Inline color swatch — CSS resolves var() tokens at render time via inherited custom properties. */
function ColorSwatch({ color }: { color: string }) {
  if (!color || color === 'transparent' || color === '__custom__') return null
  return (
    <span
      className="inline-block size-3 shrink-0 rounded-full border border-gray-300"
      style={{ backgroundColor: color }}
    />
  )
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
  renderLabel: (option: StyleOption) => ReactNode
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(value === o.value ? '' : o.value)}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs border ${
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

// ── Gradient helpers ────────────────────────────────────────

/** Parse a `linear-gradient(direction, color1, color2)` string into parts. */
function parseGradient(bg: string | undefined): { direction: string; from: string; to: string } | null {
  if (!bg) return null
  const m = bg.match(/^linear-gradient\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)$/)
  if (!m) return null
  return { direction: m[1], from: m[2], to: m[3] }
}

function buildGradient(direction: string, from: string, to: string): string {
  return `linear-gradient(${direction}, ${from}, ${to})`
}

/** Reusable gradient color stop picker with Select dropdown + custom hex input. */
/** Parse a CSS color into { hex, opacity } where hex is 6-digit and opacity is 0–1. */
function parseColor(color: string): { hex: string; opacity: number } {
  // rgba(r, g, b, a)
  const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/)
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1])
    const g = Number(rgbaMatch[2])
    const b = Number(rgbaMatch[3])
    const a = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1
    const hex = `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`
    return { hex, opacity: a }
  }
  // 8-digit hex: #rrggbbaa
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    return { hex: color.slice(0, 7), opacity: parseInt(color.slice(7), 16) / 255 }
  }
  // 6-digit hex or fallback
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { hex: color, opacity: 1 }
  }
  return { hex: color, opacity: 1 }
}

function buildRgba(hex: string, opacity: number): string {
  if (opacity >= 1 && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${parseFloat(opacity.toFixed(2))})`
}

function GradientColorPicker({ label, value, customValue, onSelect, onCustomChange }: {
  label: string
  value: string
  customValue: string
  onSelect: (value: string) => void
  onCustomChange: (color: string) => void
}) {
  const isCustom = value === '__custom__' || !GRADIENT_COLOR_OPTIONS.some(o => o.value !== '__custom__' && o.value === value)
  const displayValue = isCustom ? '__custom__' : value
  const { hex: parsedHex, opacity: parsedOpacity } = parseColor(customValue)
  const displayLabel = isCustom
    ? customValue
    : GRADIENT_COLOR_OPTIONS.find(o => o.value === value)?.label ?? value

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-gray-500">{label}</span>
        <Select
          value={displayValue}
          onValueChange={v => {
            if (v === '__custom__') onSelect('__custom__')
            else onSelect(v)
          }}
        >
          <SelectTrigger size="sm" className="flex-1 text-xs">
            <SelectValue>
              <ColorSwatch color={isCustom ? customValue : value} />
              {displayLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GRADIENT_COLOR_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                <ColorSwatch color={o.value === '__custom__' ? customValue : o.value} />
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isCustom && (
        <div className="space-y-1.5 pl-12">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={parsedHex}
              onChange={e => onCustomChange(buildRgba(e.target.value, parsedOpacity))}
              className="h-6 w-6 cursor-pointer rounded border border-gray-200 p-0"
            />
            <input
              type="text"
              value={customValue}
              onChange={e => onCustomChange(e.target.value)}
              className="flex-1 rounded border border-gray-200 px-1.5 py-0.5 text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-8">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={parsedOpacity}
              onChange={e => onCustomChange(buildRgba(parsedHex, Number(e.target.value)))}
              className="flex-1"
            />
            <span className="text-[10px] text-gray-500 w-8 text-right">{Math.round(parsedOpacity * 100)}%</span>
          </div>
        </div>
      )}
    </>
  )
}

function BackgroundSection({ nodeStyle, onUpdateStyle }: {
  nodeStyle: Record<string, string>
  onUpdateStyle: (style: Record<string, string>) => void
}) {
  function updateStyle(prop: string, value: string) {
    onUpdateStyle(applyStyle(nodeStyle, prop, value))
  }
  /** Set multiple style props atomically. */
  function updateStyles(changes: Record<string, string>) {
    let s = { ...nodeStyle }
    for (const [prop, value] of Object.entries(changes)) {
      s = applyStyle(s, prop, value)
    }
    onUpdateStyle(s)
  }
  const bgValue = getStyleValue(nodeStyle, 'background') ?? ''
  const gradient = parseGradient(bgValue)
  const [useGradient, setUseGradient] = useState(!!gradient)
  const [gradDir, setGradDir] = useState(gradient?.direction ?? 'to bottom')
  const [gradFrom, setGradFrom] = useState(gradient?.from ?? '#ffffff')
  const [gradTo, setGradTo] = useState(gradient?.to ?? '#000000')
  const [customFrom, setCustomFrom] = useState(
    gradient && !GRADIENT_COLOR_OPTIONS.some(o => o.value === gradient.from) ? gradient.from : '#888888'
  )
  const [customTo, setCustomTo] = useState(
    gradient && !GRADIENT_COLOR_OPTIONS.some(o => o.value === gradient.to) ? gradient.to : '#888888'
  )

  function applyGradient(dir: string, from: string, to: string) {
    const resolvedFrom = from === '__custom__' ? customFrom : from
    const resolvedTo = to === '__custom__' ? customTo : to
    updateStyles({ background: buildGradient(dir, resolvedFrom, resolvedTo), backgroundColor: '' })
  }

  function handleToggleGradient(on: boolean) {
    setUseGradient(on)
    if (on) {
      applyGradient(gradDir, gradFrom, gradTo)
    } else {
      updateStyles({ background: '' })
    }
  }

  return (
    <section className="border-b border-gray-100 px-3 py-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Background</p>

      {/* Solid color */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-gray-500">Color</span>
        <ButtonPicker
          options={BG_COLOR_OPTIONS}
          value={useGradient ? undefined : getStyleValue(nodeStyle, 'backgroundColor')}
          onChange={v => {
            setUseGradient(false)
            updateStyles({ background: '', backgroundColor: v })
          }}
          renderLabel={o => <><ColorSwatch color={o.value} /> {o.label}</>}
        />
      </div>

      {/* Gradient toggle */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-gray-500">Gradient</span>
        <button
          type="button"
          onClick={() => handleToggleGradient(!useGradient)}
          className={`rounded px-2 py-0.5 text-xs border ${
            useGradient
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-400'
          }`}
        >
          {useGradient ? 'On' : 'Off'}
        </button>
      </div>

      {/* Gradient controls */}
      {useGradient && (
        <div className="space-y-2 pl-2 border-l-2 border-indigo-100">
          {/* Direction */}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-gray-500">Dir</span>
            <Select value={gradDir} onValueChange={v => { setGradDir(v); applyGradient(v, gradFrom, gradTo) }}>
              <SelectTrigger size="sm" className="flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADIENT_DIRECTION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label} <span className="text-gray-400 ml-1">{o.value}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From color */}
          <GradientColorPicker
            label="From"
            value={gradFrom}
            customValue={customFrom}
            onSelect={v => { setGradFrom(v); applyGradient(gradDir, v, gradTo) }}
            onCustomChange={hex => { setCustomFrom(hex); setGradFrom('__custom__'); applyGradient(gradDir, hex, gradTo) }}
          />

          {/* To color */}
          <GradientColorPicker
            label="To"
            value={gradTo}
            customValue={customTo}
            onSelect={v => { setGradTo(v); applyGradient(gradDir, gradFrom, v) }}
            onCustomChange={hex => { setCustomTo(hex); setGradTo('__custom__'); applyGradient(gradDir, gradFrom, hex) }}
          />
        </div>
      )}
    </section>
  )
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'])

function isImageFile(path: string | undefined): boolean {
  if (!path) return false
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTS.has(ext)
}

function ImageNodeEditor({ node, onUpdate, onRemove }: {
  node: LayoutNode
  onUpdate: (patch: Partial<LayoutNode>) => void
  onRemove: () => void
}) {
  const { data } = db.useQuery({ $files: {} })
  const [search, setSearch] = useState('')

  const imageFiles = (data?.$files ?? []).filter(f => isImageFile(f.path))
  const filtered = search
    ? imageFiles.filter(f =>
        (f.name ?? f.path ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : imageFiles

  return (
    <div className="flex flex-col overflow-y-auto text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Image Node
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700"
          aria-label="Remove node"
        >
          Remove
        </button>
      </div>

      {/* Current image preview */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</p>
        {node.src ? (
          <div className="space-y-2">
            <img
              src={node.src}
              alt=""
              className="max-h-32 w-full rounded border border-gray-200 object-contain bg-gray-50"
            />
            <button
              onClick={() => onUpdate({ src: undefined })}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear image
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No image selected</p>
        )}
      </section>

      {/* File picker */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select from Files</p>
        <input
          type="text"
          placeholder="Search images..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded border border-gray-200 px-2 py-1 text-xs placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 italic">No images found</p>
          )}
          {filtered.map(f => {
            const isSelected = node.src === f.url
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onUpdate({ src: f.url })}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition ${
                  isSelected
                    ? 'bg-indigo-50 ring-1 ring-indigo-300'
                    : 'hover:bg-gray-50'
                }`}
              >
                <img
                  src={f.url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded border border-gray-200 object-contain bg-gray-50"
                />
                <span className="truncate text-xs text-gray-700">
                  {f.name || f.path?.split('/').pop() || 'Untitled'}
                </span>
              </button>
            )
          })}
        </div>
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
    </div>
  )
}

export function StyleEditor({
  node, dataModel, onUpdate, onRemove,
  designTokens, onTokenUpdate, onTokenRemove, onTokenAdd, onTokensSave,
  tokensDirty, tokensSaving,
}: StyleEditorProps) {
  if (node?.nodeType === 'image') {
    return <ImageNodeEditor node={node} onUpdate={onUpdate} onRemove={onRemove} />
  }

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
          <ButtonPicker options={TEXT_COLOR_OPTIONS} value={getStyleValue(nodeStyle, 'color')} onChange={v => updateStyle('color', v)} renderLabel={o => <><ColorSwatch color={o.value} /> {o.label}</>} />
        </div>

        <SelectPicker id="text-transform" label="Case" options={TEXT_TRANSFORM_OPTIONS} value={getStyleValue(nodeStyle, 'textTransform')} onChange={v => updateStyle('textTransform', v)} />
        <SelectPicker id="letter-spacing" label="Spacing" options={LETTER_SPACING_OPTIONS} value={getStyleValue(nodeStyle, 'letterSpacing')} onChange={v => updateStyle('letterSpacing', v)} />
        <SelectPicker id="line-height" label="Leading" options={LINE_HEIGHT_OPTIONS} value={getStyleValue(nodeStyle, 'lineHeight')} onChange={v => updateStyle('lineHeight', v)} />
      </section>

      {/* Background */}
      <BackgroundSection nodeStyle={nodeStyle} onUpdateStyle={style => onUpdate({ style })} />

      {/* Spacing */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Spacing</p>
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
