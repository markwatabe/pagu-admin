import type { Liquid } from 'liquidjs'
import type { LayoutNode } from './types'
import { useNodeHtml } from './useNodeHtml'

interface NodeMirrorProps {
  node: LayoutNode
  liquid: Liquid
  dataModel: Record<string, unknown>
  offsetX: number   // logical px — col * cellWidthPx
  offsetY: number   // logical px — row * cellHeightPx
}

export function NodeMirror({ node, liquid, dataModel, offsetX, offsetY }: NodeMirrorProps) {
  const { html } = useNodeHtml(node, liquid, dataModel)
  // Render errors are intentionally suppressed in mirror cells — they are
  // already visible on the edit cell (col=0, row=0).

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x + offsetX,
        top: node.y + offsetY,
        width: node.width,
        height: node.height,
        pointerEvents: 'none',
      }}
    >
      <div className={`h-full w-full overflow-hidden ${node.classes}`}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}
