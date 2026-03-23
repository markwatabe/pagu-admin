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
