import { useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Liquid } from 'liquidjs'
import { MM_TO_PX } from './types'
import { NodeDragHandle } from './NodeDragHandle'
import type { LayoutNode } from './types'

interface PreviewCanvasProps {
  nodes: LayoutNode[]
  scale: number
  pageWidth: number   // mm
  pageHeight: number  // mm
  selectedNodeId: string | null
  liquid: Liquid
  dataModel: Record<string, unknown>
  onSelectNode: (id: string | null) => void
  onUpdateNode: (id: string, patch: Partial<LayoutNode>) => void
}

export function PreviewCanvas({
  nodes, scale, pageWidth, pageHeight,
  selectedNodeId, liquid, dataModel,
  onSelectNode, onUpdateNode,
}: PreviewCanvasProps) {
  const pageWidthPx = pageWidth * MM_TO_PX
  const pageHeightPx = pageHeight * MM_TO_PX

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
    const clampedX = Math.max(0, Math.min(newX, pageWidthPx - node.width))
    const clampedY = Math.max(0, Math.min(newY, pageHeightPx - node.height))

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
          </div>
        </div>
      </DndContext>
    </div>
  )
}
