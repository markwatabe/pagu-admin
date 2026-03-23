import {
  FONT_SIZE_TOKENS, FONT_WEIGHT_TOKENS, TEXT_ALIGN_TOKENS, TEXT_COLOR_TOKENS,
  TEXT_TRANSFORM_TOKENS, LETTER_SPACING_TOKENS, LINE_HEIGHT_TOKENS,
  BG_COLOR_TOKENS, PADDING_TOKENS, BORDER_BOTTOM_TOKENS, BORDER_COLOR_TOKENS,
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

function SelectPicker({ id, label, tokens, classes, onChange }: {
  id: string
  label: string
  tokens: readonly string[]
  classes: string
  onChange: (category: readonly string[], token: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-14 shrink-0 text-xs text-gray-500">{label}</label>
      <select
        id={id}
        aria-label={label}
        className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-xs"
        value={getActiveToken(classes, tokens) ?? ''}
        onChange={e => onChange(tokens, e.target.value)}
      >
        <option value="">—</option>
        {tokens.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}

function ButtonPicker({ tokens, classes, onChange, renderLabel }: {
  tokens: readonly string[]
  classes: string
  onChange: (category: readonly string[], token: string) => void
  renderLabel: (token: string) => string
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {tokens.map(t => (
        <button
          key={t}
          onClick={() => onChange(tokens, t)}
          className={`rounded px-1.5 py-0.5 text-xs border ${
            getActiveToken(classes, tokens) === t
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-400'
          }`}
          aria-label={t}
        >
          {renderLabel(t)}
        </button>
      ))}
    </div>
  )
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

      {/* Typography */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</p>
        <SelectPicker id="font-size" label="Font size" tokens={FONT_SIZE_TOKENS} classes={node.classes} onChange={updateClasses} />
        <SelectPicker id="font-weight" label="Weight" tokens={FONT_WEIGHT_TOKENS} classes={node.classes} onChange={updateClasses} />

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Align</span>
          <ButtonPicker tokens={TEXT_ALIGN_TOKENS} classes={node.classes} onChange={updateClasses} renderLabel={t => ALIGN_ICONS[t]} />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Color</span>
          <ButtonPicker tokens={TEXT_COLOR_TOKENS} classes={node.classes} onChange={updateClasses} renderLabel={t => t.replace('text-', '')} />
        </div>

        <SelectPicker id="text-transform" label="Case" tokens={TEXT_TRANSFORM_TOKENS} classes={node.classes} onChange={updateClasses} />
        <SelectPicker id="letter-spacing" label="Spacing" tokens={LETTER_SPACING_TOKENS} classes={node.classes} onChange={updateClasses} />
        <SelectPicker id="line-height" label="Leading" tokens={LINE_HEIGHT_TOKENS} classes={node.classes} onChange={updateClasses} />
      </section>

      {/* Background & Spacing */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Background &amp; Spacing</p>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-gray-500">Bg</span>
          <ButtonPicker tokens={BG_COLOR_TOKENS} classes={node.classes} onChange={updateClasses} renderLabel={t => t.replace('bg-', '')} />
        </div>

        <SelectPicker id="padding" label="Padding" tokens={PADDING_TOKENS} classes={node.classes} onChange={updateClasses} />
      </section>

      {/* Borders */}
      <section className="border-b border-gray-100 px-3 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Borders</p>
        <SelectPicker id="border-bottom" label="Bottom" tokens={BORDER_BOTTOM_TOKENS} classes={node.classes} onChange={updateClasses} />
        <SelectPicker id="border-color" label="Color" tokens={BORDER_COLOR_TOKENS} classes={node.classes} onChange={updateClasses} />
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
