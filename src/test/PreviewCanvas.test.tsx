import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Liquid } from 'liquidjs'
import { PreviewCanvas } from '../components/print-layout/PreviewCanvas'
import type { LayoutNode } from '../components/print-layout/types'

const liquid = new Liquid()

const nodes: LayoutNode[] = [
  { id: 'a', x: 10, y: 10, width: 100, height: 50, classes: '', template: '<span>Node A</span>', query: null },
  { id: 'b', x: 50, y: 50, width: 100, height: 50, classes: '', template: '<span>Node B</span>', query: null },
]

describe('PreviewCanvas', () => {
  it('renders a node for each item in nodes array', async () => {
    render(
      <PreviewCanvas
        nodes={nodes}
        scale={0.6}
        pageWidth={210}
        pageHeight={297}
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={vi.fn()}
        onUpdateNode={vi.fn()}
      />
    )
    // Wait for liquid render
    await screen.findByText('Node A')
    await screen.findByText('Node B')
  })

  it('does not call onSelectNode(null) when a node is clicked', async () => {
    const onSelectNode = vi.fn()
    render(
      <PreviewCanvas
        nodes={nodes}
        scale={0.6}
        pageWidth={210}
        pageHeight={297}
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={onSelectNode}
        onUpdateNode={vi.fn()}
      />
    )
    const nodeContent = await screen.findByText('Node A')
    fireEvent.click(nodeContent)
    expect(onSelectNode).not.toHaveBeenCalledWith(null)
  })

  it('calls onSelectNode(null) when page background is clicked', () => {
    const onSelectNode = vi.fn()
    const { getByTestId } = render(
      <PreviewCanvas
        nodes={[]}
        scale={0.6}
        pageWidth={210}
        pageHeight={297}
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={onSelectNode}
        onUpdateNode={vi.fn()}
      />
    )
    fireEvent.click(getByTestId('page-canvas'))
    expect(onSelectNode).toHaveBeenCalledWith(null)
  })
})
