import { useMemo } from 'react'
import { Liquid } from 'liquidjs'
import { usePrintLayout } from './usePrintLayout'
import { PreviewCanvas } from './PreviewCanvas'
import { ClassEditor } from './ClassEditor'
import type { PrintLayoutState } from './types'

interface PrintLayoutEditorProps {
  initialState?: Partial<PrintLayoutState>
  onChange?: (state: PrintLayoutState) => void
}

export function PrintLayoutEditor({ initialState, onChange }: PrintLayoutEditorProps) {
  const liquid = useMemo(() => new Liquid(), [])

  const {
    nodes, selectedNodeId, scale, dataModel, pageWidth, pageHeight,
    addNode, removeNode, updateNode, setSelectedNodeId, setScale,
  } = usePrintLayout(initialState, onChange)

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-sm font-semibold text-gray-700">Print Layout Editor</span>

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
