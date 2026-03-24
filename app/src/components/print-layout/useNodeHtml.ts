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
  }, [node.template, node.query, dataModel])

  return { html, renderError }
}
