import { useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Liquid } from 'liquidjs'
import { MM_TO_PX, subdivisionGrid, type Subdivision } from './types'
import { NodeDragHandle } from './NodeDragHandle'
import { NodeMirror } from './NodeMirror'
import type { LayoutNode } from './types'

interface PreviewCanvasProps {
  nodes: LayoutNode[]
  scale: number
  pageWidth: number   // mm
  pageHeight: number  // mm
  subdivision: Subdivision
  selectedNodeId: string | null
  liquid: Liquid
  dataModel: Record<string, unknown>
  onSelectNode: (id: string | null) => void
  onUpdateNode: (id: string, patch: Partial<LayoutNode>) => void
}

export function PreviewCanvas({
  nodes, scale, pageWidth, pageHeight, subdivision,
  selectedNodeId, liquid, dataModel,
  onSelectNode, onUpdateNode,
}: PreviewCanvasProps) {
  const { cols, rows } = subdivisionGrid(subdivision)
  // All dimensions are in logical (pre-scale) px — same unit as node.x/y/width/height.
  // The CSS transform: scale(scale) is applied to the container, not to these values.
  const pageWidthPx  = pageWidth  * MM_TO_PX
  const pageHeightPx = pageHeight * MM_TO_PX
  const cellWidthPx  = pageWidthPx  / cols
  const cellHeightPx = pageHeightPx / rows

  // Keep scale in a ref so onDragEnd always has the latest value without re-registering
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event
    const nodeId = active.id as string
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const newX = node.x + delta.x / scaleRef.current
    const newY = node.y + delta.y / scaleRef.current
    // Clamp so the node's full bounding box stays within the edit cell (col=0, row=0).
    const clampedX = Math.max(0, Math.min(newX, cellWidthPx  - node.width))
    const clampedY = Math.max(0, Math.min(newY, cellHeightPx - node.height))

    onUpdateNode(nodeId, { x: clampedX, y: clampedY })
  }

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-200 p-8">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: pageWidthPx,
            height: pageHeightPx,
            flexShrink: 0,
          }}
        >
          <div
            data-testid="page-canvas"
            style={{ width: pageWidthPx, height: pageHeightPx, position: 'relative' }}
            className="bg-white shadow-lg"
            onClick={() => onSelectNode(null)}
          >
            {/* Edit cell nodes — col=0, row=0 */}
            {nodes.map(node => (
              <NodeDragHandle
                key={node.id}
                node={node}
                liquid={liquid}
                dataModel={dataModel}
                isSelected={node.id === selectedNodeId}
                onSelect={() => onSelectNode(node.id)}
              />
            ))}

            {/* Subdivision dividers */}
            {cols > 1 && (
              <div
                style={{ position: 'absolute', left: cellWidthPx, top: 0, width: 1, height: pageHeightPx }}
                className="bg-gray-300 pointer-events-none"
              />
            )}
            {rows > 1 && (
              <div
                style={{ position: 'absolute', top: cellHeightPx, left: 0, height: 1, width: pageWidthPx }}
                className="bg-gray-300 pointer-events-none"
              />
            )}

            {/* Mirror cells — all (col, row) pairs except (0, 0) */}
            {Array.from({ length: cols }, (_, col) =>
              Array.from({ length: rows }, (_, row) => {
                if (col === 0 && row === 0) return null  // edit cell — no mirror
                const offsetX = col * cellWidthPx
                const offsetY = row * cellHeightPx
                return nodes.map(node => (
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
          </div>
        </div>
      </DndContext>
    </div>
  )
}
