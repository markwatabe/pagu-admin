import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Liquid } from 'liquidjs'
import { PreviewCanvas } from '../components/print-layout/PreviewCanvas'
import type { LayoutNode } from '../components/print-layout/types'

const liquid = new Liquid()

const nodes: LayoutNode[] = [
  { id: 'a', x: 10, y: 10, width: 100, height: 50, style: {}, template: '<span>Node A</span>', query: null },
  { id: 'b', x: 50, y: 50, width: 100, height: 50, style: {}, template: '<span>Node B</span>', query: null },
]

describe('PreviewCanvas', () => {
  it('renders a node for each item in nodes array', async () => {
    render(
      <PreviewCanvas
        nodes={nodes}
        scale={0.6}
        pageWidth={215.9}
        pageHeight={279.4}
        subdivision="full"
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={vi.fn()}
        onUpdateNode={vi.fn()}
      />
    )
    await screen.findByText('Node A')
    await screen.findByText('Node B')
  })

  it('does not call onSelectNode(null) when a node is clicked', async () => {
    const onSelectNode = vi.fn()
    render(
      <PreviewCanvas
        nodes={nodes}
        scale={0.6}
        pageWidth={215.9}
        pageHeight={279.4}
        subdivision="full"
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
        pageWidth={215.9}
        pageHeight={279.4}
        subdivision="full"
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

  it('renders NodeMirror copies in non-edit cells when subdivision is cols2', async () => {
    render(
      <PreviewCanvas
        nodes={[{ id: 'a', x: 10, y: 10, width: 100, height: 50, style: {}, template: '<span>Cell</span>', query: null }]}
        scale={1}
        pageWidth={215.9}
        pageHeight={279.4}
        subdivision="cols2"
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={vi.fn()}
        onUpdateNode={vi.fn()}
      />
    )
    // Content appears twice: once in edit cell, once in mirror
    const cells = await screen.findAllByText('Cell')
    expect(cells).toHaveLength(2)
  })

  it('renders 4 copies when subdivision is grid4', async () => {
    render(
      <PreviewCanvas
        nodes={[{ id: 'a', x: 0, y: 0, width: 50, height: 50, style: {}, template: '<span>Q</span>', query: null }]}
        scale={1}
        pageWidth={215.9}
        pageHeight={279.4}
        subdivision="grid4"
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={vi.fn()}
        onUpdateNode={vi.fn()}
      />
    )
    const cells = await screen.findAllByText('Q')
    expect(cells).toHaveLength(4)
  })

  it('renders no mirrors when subdivision is full', async () => {
    render(
      <PreviewCanvas
        nodes={[{ id: 'a', x: 0, y: 0, width: 50, height: 50, style: {}, template: '<span>Solo</span>', query: null }]}
        scale={1}
        pageWidth={215.9}
        pageHeight={279.4}
        subdivision="full"
        selectedNodeId={null}
        liquid={liquid}
        dataModel={{}}
        onSelectNode={vi.fn()}
        onUpdateNode={vi.fn()}
      />
    )
    const cells = await screen.findAllByText('Solo')
    expect(cells).toHaveLength(1)
  })
})
