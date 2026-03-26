import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { Liquid } from 'liquidjs'
import { NodeDragHandle } from '../components/print-layout/NodeDragHandle'
import type { LayoutNode } from '../components/print-layout/types'

const liquid = new Liquid()

const baseNode: LayoutNode = {
  id: 'n1', x: 40, y: 60, width: 200, height: 80,
  style: { fontWeight: '700' }, template: '<p>{{ name }}</p>',
  query: null,
}

function wrap(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>)
}

describe('NodeDragHandle', () => {
  it('renders Liquid template with dataModel', async () => {
    wrap(
      <NodeDragHandle
        node={baseNode}
        liquid={liquid}
        dataModel={{ name: 'Pagu' }}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Pagu')).toBeInTheDocument()
    })
  })

  it('shows error message when template is invalid Liquid', async () => {
    wrap(
      <NodeDragHandle
        node={{ ...baseNode, template: '{% invalid %}' }}
        liquid={liquid}
        dataModel={{}}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument() // error <pre>
    })
  })

  it('applies selected styles when isSelected=true', () => {
    const { container } = wrap(
      <NodeDragHandle
        node={baseNode}
        liquid={liquid}
        dataModel={{}}
        isSelected={true}
        onSelect={vi.fn()}
      />
    )
    expect(container.firstChild).toHaveClass('border-indigo-500')
  })

  it('applies unselected styles when isSelected=false', () => {
    const { container } = wrap(
      <NodeDragHandle
        node={baseNode}
        liquid={liquid}
        dataModel={{}}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    expect(container.firstChild).toHaveClass('border-slate-300')
  })

  it('renders template once per item when query is set', async () => {
    wrap(
      <NodeDragHandle
        node={{ ...baseNode, query: 'desserts', template: '<div>{{ item.name }}</div>' }}
        liquid={liquid}
        dataModel={{ desserts: [{ name: 'Cake' }, { name: 'Pie' }] }}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Cake')).toBeInTheDocument()
      expect(screen.getByText('Pie')).toBeInTheDocument()
    })
  })

  it('renders template once with full dataModel when query is null', async () => {
    wrap(
      <NodeDragHandle
        node={{ ...baseNode, query: null, template: '<div>{{ title }}</div>' }}
        liquid={liquid}
        dataModel={{ title: 'Hello' }}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
  })

  it('stops click propagation so parent handler is not triggered', () => {
    const parentClick = vi.fn()
    const onSelect = vi.fn()
    const { getByRole } = render(
      <div onClick={parentClick}>
        <DndContext>
          <NodeDragHandle
            node={baseNode}
            liquid={liquid}
            dataModel={{}}
            isSelected={false}
            onSelect={onSelect}
          />
        </DndContext>
      </div>
    )
    // dnd-kit renders the node as role="button"
    fireEvent.click(getByRole('button'))
    expect(onSelect).toHaveBeenCalled()
    expect(parentClick).not.toHaveBeenCalled()
  })
})
