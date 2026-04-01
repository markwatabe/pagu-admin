import { useRef, useMemo } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, Modifier } from '@dnd-kit/core'
import type { Liquid } from 'liquidjs'
import { MM_TO_PX, subdivisionGrid } from './types'
import { NodeDragHandle } from './NodeDragHandle'
import { NodeMirror } from './NodeMirror'
import type { LayoutNode, PageLayout } from './types'

// 1 inch = 96px at 96 DPI
const GRID_MAJOR = 96  // 1 inch
const GRID_MINOR = 12  // 1/8 inch

/** Round a value to the nearest grid increment. */
function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid
}

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
  showGrid?: boolean
  onSelectNode: (id: string | null) => void
  onUpdateNode: (id: string, patch: Partial<LayoutNode>) => void
  onSelectPage: (index: number) => void
  onAddPage: () => void
  onRemovePage: (index: number) => void
}

export function PreviewCanvas({
  pages, currentPageIndex, scale, pageWidth, pageHeight,
  selectedNodeId, liquid, dataModel, tokenStyle, showGrid,
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

  // Snap modifier: snaps the visual drag transform in real-time so the node
  // jumps between grid lines while being dragged.
  // The transform is in screen-space pixels, so we account for the current scale.
  const snapModifier: Modifier = useMemo(() => {
    if (!showGrid) return ({ transform }) => transform
    const step = GRID_MINOR * scale
    return ({ transform }) => ({
      ...transform,
      x: Math.round(transform.x / step) * step,
      y: Math.round(transform.y / step) * step,
    })
  }, [showGrid, scale])

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event
    const nodeId = active.id as string
    const node = currentNodesRef.current.find(n => n.id === nodeId)
    if (!node) return

    let newX = node.x + delta.x / scaleRef.current
    let newY = node.y + delta.y / scaleRef.current

    if (showGrid) {
      newX = snap(newX, GRID_MINOR)
      newY = snap(newY, GRID_MINOR)
    }

    const clampedX = Math.max(0, Math.min(newX, cellWidthPx  - node.width))
    const clampedY = Math.max(0, Math.min(newY, cellHeightPx - node.height))

    onUpdateNode(nodeId, { x: clampedX, y: clampedY })
  }

  const gap = 24

  return (
    <div className="flex-1 overflow-auto bg-gray-200 p-8">
      <DndContext sensors={sensors} modifiers={[snapModifier]} onDragEnd={handleDragEnd}>
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
                    fontFamily: "'Bryant Pro', sans-serif",
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
                  {/* Grid overlay */}
                  {showGrid && isActive && (
                    <svg
                      width={pageWidthPx}
                      height={pageHeightPx}
                      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
                    >
                      <defs>
                        <pattern id="grid-minor" width={GRID_MINOR} height={GRID_MINOR} patternUnits="userSpaceOnUse">
                          <path d={`M ${GRID_MINOR} 0 L 0 0 0 ${GRID_MINOR}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                        </pattern>
                        <pattern id="grid-major" width={GRID_MAJOR} height={GRID_MAJOR} patternUnits="userSpaceOnUse">
                          <rect width={GRID_MAJOR} height={GRID_MAJOR} fill="url(#grid-minor)" />
                          <path d={`M ${GRID_MAJOR} 0 L 0 0 0 ${GRID_MAJOR}`} fill="none" stroke="#d1d5db" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid-major)" />
                    </svg>
                  )}

                  {isActive ? (
                    <>
                      {/* Editable nodes on the active page — first in array draws on top */}
                      {page.nodes.map((node, nodeIndex) => (
                        <NodeDragHandle
                          key={node.id}
                          node={node}
                          scale={scale}
                          liquid={liquid}
                          dataModel={dataModel}
                          isSelected={node.id === selectedNodeId}
                          snapGrid={showGrid ? GRID_MINOR : undefined}
                          zIndex={page.nodes.length - nodeIndex}
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
                          return page.nodes.map((node, nodeIndex) => (
                            <NodeMirror
                              key={`${col}-${row}-${node.id}`}
                              node={node}
                              liquid={liquid}
                              dataModel={dataModel}
                              offsetX={offsetX}
                              offsetY={offsetY}
                              zIndex={page.nodes.length - nodeIndex}
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
                          return page.nodes.map((node, nodeIndex) => (
                            <NodeMirror
                              key={`${col}-${row}-${node.id}`}
                              node={node}
                              liquid={liquid}
                              dataModel={dataModel}
                              offsetX={offsetX}
                              offsetY={offsetY}
                              zIndex={page.nodes.length - nodeIndex}
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
