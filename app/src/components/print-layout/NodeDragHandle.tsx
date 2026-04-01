import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { useRef, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { Liquid } from 'liquidjs'
import type { LayoutNode } from './types'
import { useNodeHtml } from './useNodeHtml'

export { useNodeHtml } from './useNodeHtml'

const MIN_SIZE = 20

function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid
}

interface NodeDragHandleProps {
  node: LayoutNode
  scale: number
  liquid: Liquid
  dataModel: Record<string, unknown>
  isSelected: boolean
  snapGrid?: number
  zIndex?: number
  onSelect: () => void
  onUpdate: (patch: Partial<LayoutNode>) => void
}

export function NodeDragHandle({ node, scale, liquid, dataModel, isSelected, snapGrid, zIndex, onSelect, onUpdate }: NodeDragHandleProps) {
  const { html, renderError } = useNodeHtml(node, liquid, dataModel)
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)

  // Counter-scale handle sizes so they stay constant on screen
  const handleSize = 8 / scale
  const handleOffset = handleSize / 2
  const resizeSize = 16 / scale
  const resizeOffset = resizeSize / 2

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
  })

  const handleResizePointerDown = useCallback((e: PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: node.width, startH: node.height }
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
  }, [node.width, node.height])

  const handleResizePointerMove = useCallback((e: PointerEvent) => {
    if (!resizeRef.current) return
    const { startX, startY, startW, startH } = resizeRef.current
    const dx = (e.clientX - startX) / scale
    const dy = (e.clientY - startY) / scale
    let newW = Math.max(MIN_SIZE, startW + dx)
    let newH = Math.max(MIN_SIZE, startH + dy)
    if (snapGrid) {
      newW = Math.max(MIN_SIZE, snap(newW, snapGrid))
      newH = Math.max(MIN_SIZE, snap(newH, snapGrid))
    }
    onUpdate({ width: newW, height: newH })
  }, [scale, snapGrid, onUpdate])

  const handleResizePointerUp = useCallback(() => {
    resizeRef.current = null
  }, [])

  const style: CSSProperties = {
    position: 'absolute',
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    transform: transform
      ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`
      : undefined,
    zIndex: isDragging ? 1000 : zIndex,
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation()
    onSelect()
  }

  const borderClass = isSelected
    ? `border-2 border-indigo-500 ${isDragging ? 'cursor-grabbing' : 'cursor-move'}`
    : 'border border-dashed border-slate-300 cursor-pointer'

  const dragOverlay = isDragging ? 'opacity-70' : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${borderClass} ${dragOverlay}`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      {/* Corner handles — counter-scaled so they stay a fixed screen size */}
      {isSelected && (
        <>
          {([
            { top: -handleOffset, left: -handleOffset },
            { top: -handleOffset, right: -handleOffset },
            { bottom: -handleOffset, left: -handleOffset },
          ] as const).map((pos, i) => (
            <div
              key={i}
              className="absolute bg-indigo-500 pointer-events-none"
              style={{ ...pos, width: handleSize, height: handleSize }}
            />
          ))}
          {/* Bottom-right resize handle — larger hit area */}
          <div
            className="absolute cursor-nwse-resize"
            style={{
              bottom: -resizeOffset,
              right: -resizeOffset,
              width: resizeSize,
              height: resizeSize,
            }}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          >
            {/* Visual triangle indicator */}
            <svg
              width={resizeSize} height={resizeSize}
              viewBox="0 0 16 16"
              className="text-indigo-500"
            >
              <path d="M14 2 L14 14 L2 14 Z" fill="currentColor" />
            </svg>
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ height: '100%', width: '100%', overflow: 'hidden', pointerEvents: 'none', ...node.style }}>
        {renderError ? (
          <pre role="alert" className="m-1 text-xs text-red-500 whitespace-pre-wrap break-all">
            {renderError}
          </pre>
        ) : (
          <div style={{ height: '100%', width: '100%' }} dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  )
}
