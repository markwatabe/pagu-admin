import { useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Liquid } from 'liquidjs'
import { MM_TO_PX, subdivisionGrid } from './types'
import { NodeDragHandle } from './NodeDragHandle'
import { NodeMirror } from './NodeMirror'
import type { LayoutNode, PageLayout } from './types'

interface PreviewCanvasProps {
  pages: PageLayout[]
  currentPageIndex: number
  scale: number
  pageWidth: number   // mm
  pageHeight: number  // mm
  selectedNodeId: string | null
  liquid: Liquid
  dataModel: Record<string, unknown>
  tokenStyle?: Record<string, string>
  onSelectNode: (id: string | null) => void
  onUpdateNode: (id: string, patch: Partial<LayoutNode>) => void
  onSelectPage: (index: number) => void
  onAddPage: () => void
  onRemovePage: (index: number) => void
}

export function PreviewCanvas({
  pages, currentPageIndex, scale, pageWidth, pageHeight,
  selectedNodeId, liquid, dataModel, tokenStyle,
  onSelectNode, onUpdateNode, onSelectPage, onAddPage, onRemovePage,
}: PreviewCanvasProps) {
  const pageWidthPx  = pageWidth  * MM_TO_PX
  const pageHeightPx = pageHeight * MM_TO_PX

  // Keep scale in a ref so onDragEnd always has the latest value without re-registering
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  // Keep current page nodes in a ref for drag lookup
  const currentNodes = pages[currentPageIndex]?.nodes ?? []
  const currentNodesRef = useRef(currentNodes)
  currentNodesRef.current = currentNodes

  const currentSubdivision = pages[currentPageIndex]?.subdivision ?? 'full'
  const { cols, rows } = subdivisionGrid(currentSubdivision)
  const cellWidthPx  = pageWidthPx / cols
  const cellHeightPx = pageHeightPx / rows

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event
    const nodeId = active.id as string
    const node = currentNodesRef.current.find(n => n.id === nodeId)
    if (!node) return

    const newX = node.x + delta.x / scaleRef.current
    const newY = node.y + delta.y / scaleRef.current
    const clampedX = Math.max(0, Math.min(newX, cellWidthPx  - node.width))
    const clampedY = Math.max(0, Math.min(newY, cellHeightPx - node.height))

    onUpdateNode(nodeId, { x: clampedX, y: clampedY })
  }

  const gap = 24

  return (
    <div className="flex-1 overflow-auto bg-gray-200 p-8">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'grid',
            gridTemplateColumns: `repeat(2, ${pageWidthPx}px)`,
            gap,
            width: pageWidthPx * 2 + gap,
          }}
        >
          {pages.map((page, pageIndex) => {
            const isActive = pageIndex === currentPageIndex
            const { cols: pCols, rows: pRows } = subdivisionGrid(page.subdivision)
            const pCellW = pageWidthPx / pCols
            const pCellH = pageHeightPx / pRows

            return (
              <div key={pageIndex} className="relative" style={{ width: pageWidthPx, height: pageHeightPx }}>
                {/* Page label + remove */}
                <div
                  className="absolute flex items-center gap-2"
                  style={{ top: -20, left: 0, zIndex: 10 }}
                >
                  <span className={`text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                    Page {pageIndex + 1}
                  </span>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemovePage(pageIndex); }}
                      className="rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
                      title={`Remove page ${pageIndex + 1}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 3l6 6M9 3l-6 6" />
                      </svg>
                    </button>
                  )}
                </div>

                <div
                  data-testid={`page-canvas-${pageIndex}`}
                  style={{
                    ...tokenStyle,
                    width: pageWidthPx,
                    height: pageHeightPx,
                    position: 'relative',
                    outline: isActive ? '2px solid #6366f1' : '1px solid #d1d5db',
                    outlineOffset: isActive ? -1 : 0,
                  }}
                  className="bg-white shadow-lg cursor-pointer"
                  onClick={() => {
                    if (!isActive) {
                      onSelectPage(pageIndex)
                    } else {
                      onSelectNode(null)
                    }
                  }}
                >
                  {isActive ? (
                    <>
                      {/* Editable nodes on the active page */}
                      {page.nodes.map(node => (
                        <NodeDragHandle
                          key={node.id}
                          node={node}
                          scale={scale}
                          liquid={liquid}
                          dataModel={dataModel}
                          isSelected={node.id === selectedNodeId}
                          onSelect={() => onSelectNode(node.id)}
                          onUpdate={(patch) => onUpdateNode(node.id, patch)}
                        />
                      ))}

                      {/* Subdivision dividers */}
                      {pCols > 1 && (
                        <div
                          style={{ position: 'absolute', left: pCellW, top: 0, width: 1, height: pageHeightPx }}
                          className="bg-gray-300 pointer-events-none"
                        />
                      )}
                      {pRows > 1 && (
                        <div
                          style={{ position: 'absolute', top: pCellH, left: 0, height: 1, width: pageWidthPx }}
                          className="bg-gray-300 pointer-events-none"
                        />
                      )}

                      {/* Mirror cells */}
                      {Array.from({ length: pCols }, (_, col) =>
                        Array.from({ length: pRows }, (_, row) => {
                          if (col === 0 && row === 0) return null
                          const offsetX = col * pCellW
                          const offsetY = row * pCellH
                          return page.nodes.map(node => (
                            <NodeMirror
                              key={`${col}-${row}-${node.id}`}
                              node={node}
                              liquid={liquid}
                              dataModel={dataModel}
                              offsetX={offsetX}
                              offsetY={offsetY}
                            />
                          ))
                        })
                      )}
                    </>
                  ) : (
                    <>
                      {/* Read-only preview for non-active pages */}
                      {Array.from({ length: pCols }, (_, col) =>
                        Array.from({ length: pRows }, (_, row) => {
                          const offsetX = col * pCellW
                          const offsetY = row * pCellH
                          return page.nodes.map(node => (
                            <NodeMirror
                              key={`${col}-${row}-${node.id}`}
                              node={node}
                              liquid={liquid}
                              dataModel={dataModel}
                              offsetX={offsetX}
                              offsetY={offsetY}
                            />
                          ))
                        })
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add page card */}
          <button
            type="button"
            onClick={onAddPage}
            style={{ width: pageWidthPx, height: pageHeightPx }}
            className="flex items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-100 text-gray-400 transition hover:border-indigo-300 hover:text-indigo-500"
          >
            <div className="text-center">
              <span className="block text-3xl leading-none">+</span>
              <span className="mt-1 block text-xs">Add Page</span>
            </div>
          </button>
        </div>
      </DndContext>
    </div>
  )
}
