import { describe, it, expect } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'
import { Liquid } from 'liquidjs'
import { NodeMirror } from '../components/print-layout/NodeMirror'
import type { LayoutNode } from '../components/print-layout/types'

const liquid = new Liquid()

const baseNode: LayoutNode = {
  id: 'm1', x: 10, y: 20, width: 150, height: 60,
  style: { fontSize: '14px' }, template: '<span>Mirror</span>',
  query: null,
}

describe('NodeMirror', () => {
  it('renders Liquid template content', async () => {
    render(
      <NodeMirror
        node={baseNode}
        liquid={liquid}
        dataModel={{}}
        offsetX={0}
        offsetY={0}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Mirror')).toBeInTheDocument()
    })
  })

  it('positions the node at x + offsetX, y + offsetY', () => {
    const { container } = render(
      <NodeMirror
        node={baseNode}
        liquid={liquid}
        dataModel={{}}
        offsetX={300}
        offsetY={400}
      />
    )
    const el = container.firstChild as HTMLElement
    expect(el.style.left).toBe('310px')  // node.x (10) + offsetX (300)
    expect(el.style.top).toBe('420px')   // node.y (20) + offsetY (400)
  })

  it('has pointer-events: none so it does not intercept clicks', () => {
    const { container } = render(
      <NodeMirror
        node={baseNode}
        liquid={liquid}
        dataModel={{}}
        offsetX={0}
        offsetY={0}
      />
    )
    const el = container.firstChild as HTMLElement
    expect(el.style.pointerEvents).toBe('none')
  })

  it('renders template once per item when query is set', async () => {
    render(
      <NodeMirror
        node={{ ...baseNode, query: 'items', template: '<span>{{ item.name }}</span>' }}
        liquid={liquid}
        dataModel={{ items: [{ name: 'Alpha' }, { name: 'Beta' }] }}
        offsetX={0}
        offsetY={0}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })
  })

  it('silently suppresses render errors (no alert role)', async () => {
    render(
      <NodeMirror
        node={{ ...baseNode, template: '{% invalid %}' }}
        liquid={liquid}
        dataModel={{}}
        offsetX={0}
        offsetY={0}
      />
    )
    // Wait a tick for the async render to settle
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
