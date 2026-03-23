import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { Liquid } from 'liquidjs'
import { NodeDragHandle } from '../components/print-layout/NodeDragHandle'
import type { LayoutNode } from '../components/print-layout/types'

const liquid = new Liquid()

const baseNode: LayoutNode = {
  id: 'n1', x: 40, y: 60, width: 200, height: 80,
  classes: 'font-bold', template: '<p>{{ name }}</p>',
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
      expect(screen.getByRole('figure')).toBeInTheDocument() // error <pre>
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
