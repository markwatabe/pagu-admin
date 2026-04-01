import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Liquid } from 'liquidjs'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePrintLayout } from './usePrintLayout'
import { useDesignTokens } from './useDesignTokens'
import { PreviewCanvas } from './PreviewCanvas'
import { StyleEditor } from './StyleEditor'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable'
import type { PrintLayoutState, Subdivision, LayoutNode } from './types'

interface PrintLayoutEditorProps {
  initialState?: Partial<PrintLayoutState>
  onChange?: (state: PrintLayoutState) => void
  toolbar?: ReactNode
  title?: ReactNode
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

function SortableNodeItem({ node, isSelected, onClick }: {
  node: LayoutNode
  isSelected: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  const label = node.nodeType === 'image'
    ? '🖼 Image'
    : node.query
      ? `[${node.query}]`
      : node.template.replace(/<[^>]*>/g, '').slice(0, 24) || '(empty)'

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 truncate px-2 py-1 text-left transition ${
        isSelected
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle icon */}
      <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="shrink-0 opacity-30 cursor-grab">
        <circle cx="2" cy="2" r="1" /><circle cx="6" cy="2" r="1" />
        <circle cx="2" cy="5" r="1" /><circle cx="6" cy="5" r="1" />
        <circle cx="2" cy="8" r="1" /><circle cx="6" cy="8" r="1" />
      </svg>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-40">
        <rect x="1" y="1" width="14" height="14" rx="2" />
      </svg>
      <span className="truncate">{label}</span>
    </button>
  )
}

export function PrintLayoutEditor({ initialState, onChange, toolbar, title }: PrintLayoutEditorProps) {
  const liquid = useMemo(() => new Liquid(), [])
  const [showGrid, setShowGrid] = useState(false)

  const {
    pages, currentPageIndex, selectedNodeId, scale, dataModel, pageWidth, pageHeight,
    addNode, removeNode, updateNode, setSelectedNodeId, setScale, setSubdivision,
    setCurrentPageIndex, reorderNodes, addPage, removePage,
  } = usePrintLayout(initialState, onChange)

  const {
    tokens: designTokens, dirty: tokensDirty, saving: tokensSaving,
    updateToken, removeToken, addToken, save: saveTokens,
  } = useDesignTokens()

  // Convert tokens to a CSS style object for injection
  const tokenStyle = useMemo(() => {
    if (!designTokens) return {}
    const style: Record<string, string> = {}
    for (const [k, v] of Object.entries(designTokens)) {
      style[k] = v
    }
    return style
  }, [designTokens])

  const currentPage = pages[currentPageIndex]
  const nodes = currentPage?.nodes ?? []
  const subdivision = currentPage?.subdivision ?? 'full'

  const sidebarSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleSortEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = nodes.findIndex(n => n.id === active.id)
    const toIndex = nodes.findIndex(n => n.id === over.id)
    if (fromIndex !== -1 && toIndex !== -1) reorderNodes(fromIndex, toIndex)
  }
  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2">
        {title ?? <span className="text-sm font-semibold text-gray-700">Print Layout Editor</span>}

        <span className="text-xs text-gray-400">Page {currentPageIndex + 1} of {pages.length}</span>

        {/* Subdivision picker — applies to current page */}
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

        <button
          type="button"
          title="Toggle grid"
          onClick={() => setShowGrid(g => !g)}
          className={`rounded p-1 transition ${
            showGrid
              ? 'bg-indigo-100 text-indigo-600'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="16" height="16" rx="1" />
            <line x1="2" y1="7" x2="18" y2="7" />
            <line x1="2" y1="13" x2="18" y2="13" />
            <line x1="7" y1="2" x2="7" y2="18" />
            <line x1="13" y1="2" x2="13" y2="18" />
          </svg>
        </button>

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

        <button
          onClick={() => addNode({ nodeType: 'image', width: 200, height: 200, template: '' })}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          + Add Image
        </button>

        {toolbar}
      </div>

      {/* Main panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Left: page tree */}
        <ResizablePanel defaultSize={15} minSize={10}>
          <div className="h-full overflow-y-auto bg-gray-50 text-xs">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Pages
            </div>
            {pages.map((page, pageIndex) => {
              const isActivePage = pageIndex === currentPageIndex
              return (
                <div key={pageIndex}>
                  <button
                    type="button"
                    onClick={() => setCurrentPageIndex(pageIndex)}
                    className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left transition ${
                      isActivePage
                        ? 'bg-indigo-50 font-semibold text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-50">
                      <path d="M3 1h7l4 4v10a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" />
                    </svg>
                    Page {pageIndex + 1}
                    <span className="ml-auto text-[10px] text-gray-400">{page.subdivision}</span>
                  </button>
                  {/* Node list for this page — sortable on active page */}
                  <div className="pl-5">
                    {isActivePage ? (
                      <DndContext sensors={sidebarSensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
                        <SortableContext items={page.nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                          {page.nodes.map(node => (
                            <SortableNodeItem
                              key={node.id}
                              node={node}
                              isSelected={node.id === selectedNodeId}
                              onClick={() => setSelectedNodeId(node.id)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    ) : (
                      page.nodes.map(node => {
                        const label = node.nodeType === 'image'
                          ? '🖼 Image'
                          : node.query
                            ? `[${node.query}]`
                            : node.template.replace(/<[^>]*>/g, '').slice(0, 24) || '(empty)'
                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => { setCurrentPageIndex(pageIndex); setSelectedNodeId(node.id) }}
                            className="flex w-full items-center gap-1.5 truncate px-2 py-1 text-left text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                          >
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-40">
                              <rect x="1" y="1" width="14" height="14" rx="2" />
                            </svg>
                            <span className="truncate">{label}</span>
                          </button>
                        )
                      })
                    )}
                    {page.nodes.length === 0 && (
                      <div className="px-2 py-1 italic text-gray-400">(no nodes)</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center: canvas */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <PreviewCanvas
            pages={pages}
            currentPageIndex={currentPageIndex}
            scale={scale}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            selectedNodeId={selectedNodeId}
            liquid={liquid}
            dataModel={dataModel}
            tokenStyle={tokenStyle}
            showGrid={showGrid}
            onSelectNode={setSelectedNodeId}
            onUpdateNode={(id, patch) => updateNode(id, patch)}
            onSelectPage={setCurrentPageIndex}
            onAddPage={addPage}
            onRemovePage={removePage}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: node editor */}
        <ResizablePanel defaultSize={25} minSize={15}>
          <div className="h-full overflow-y-auto bg-white">
            <StyleEditor
              node={selectedNode}
              dataModel={dataModel}
              onUpdate={patch => selectedNode && updateNode(selectedNode.id, patch)}
              onRemove={() => selectedNode && removeNode(selectedNode.id)}
              designTokens={designTokens}
              onTokenUpdate={updateToken}
              onTokenRemove={removeToken}
              onTokenAdd={addToken}
              onTokensSave={saveTokens}
              tokensDirty={tokensDirty}
              tokensSaving={tokensSaving}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
