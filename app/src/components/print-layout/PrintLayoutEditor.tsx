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
