import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Liquid } from 'liquidjs'
import type { LayoutNode } from './types'

interface NodeDragHandleProps {
  node: LayoutNode
  liquid: Liquid
  dataModel: Record<string, unknown>
  isSelected: boolean
  onSelect: () => void
}

export function NodeDragHandle({ node, liquid, dataModel, isSelected, onSelect }: NodeDragHandleProps) {
  const [html, setHtml] = useState('')
  const [renderError, setRenderError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
  })

  // Re-render Liquid template when template, query, or dataModel changes.
  // If node.query is set, render the template once per item in dataModel[query].
  useEffect(() => {
    let cancelled = false
    const items = node.query ? dataModel[node.query] : null

    async function render() {
      try {
        let result: string
        if (Array.isArray(items)) {
          const parts = await Promise.all(
            items.map((item: unknown) =>
              liquid.parseAndRender(node.template, { ...dataModel, item })
            )
          )
          result = parts.join('')
        } else {
          result = await liquid.parseAndRender(node.template, dataModel)
        }
        if (!cancelled) {
          setHtml(result)
          setRenderError(null)
        }
      } catch (err: unknown) {
        if (!cancelled) setRenderError(String((err as Error)?.message ?? err))
      }
    }

    render()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.template, node.query, dataModel])

  const style: React.CSSProperties = {
    position: 'absolute',
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
  }

  function handleClick(e: React.MouseEvent) {
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
      className={`${borderClass} ${dragOverlay} overflow-hidden`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      {/* Corner handles (decorative, pointer-events-none) */}
      {isSelected && (
        <>
          {['top-[-4px] left-[-4px]', 'top-[-4px] right-[-4px]', 'bottom-[-4px] left-[-4px]', 'bottom-[-4px] right-[-4px]'].map(pos => (
            <div
              key={pos}
              className={`absolute ${pos} h-2 w-2 bg-indigo-500 pointer-events-none`}
            />
          ))}
        </>
      )}

      {/* Content */}
      <div className={`h-full w-full overflow-hidden ${node.classes}`}>
        {renderError ? (
          <pre role="alert" className="m-1 text-xs text-red-500 whitespace-pre-wrap break-all">
            {renderError}
          </pre>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  )
}
