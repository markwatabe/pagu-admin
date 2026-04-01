import { useEffect, useState } from 'react'
import type { Liquid } from 'liquidjs'
import type { LayoutNode } from './types'

/**
 * Renders a node's Liquid template against dataModel.
 * `liquid` must be a stable reference (e.g. from useMemo) — it is intentionally
 * excluded from the dependency array because recreating the Liquid instance on
 * every render would cause infinite re-renders. This invariant is enforced at the
 * call site in PrintLayoutEditor via `useMemo(() => new Liquid(), [])`.
 */
export function useNodeHtml(
  node: LayoutNode,
  liquid: Liquid,
  dataModel: Record<string, unknown>,
): { html: string; renderError: string | null } {
  const [html, setHtml] = useState('')
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    // Image nodes render as a simple <img> tag — no Liquid needed
    if (node.nodeType === 'image') {
      const imgHtml = node.src
        ? `<img src="${node.src}" style="width:100%;height:100%;object-fit:contain;" />`
        : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#f3f4f6;border:2px dashed #d1d5db;border-radius:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style="margin-top:8px;font-size:11px;font-weight:600;letter-spacing:0.05em;color:#9ca3af;">CHOOSE IMAGE</span>
          </div>`
      setHtml(imgHtml)
      setRenderError(null)
      return
    }

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
        if (!cancelled) setRenderError(String(err instanceof Error ? err.message : err))
      }
    }

    render()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // liquid is intentionally excluded — see JSDoc above
  }, [node.template, node.query, node.nodeType, node.src, dataModel])

  return { html, renderError }
}
