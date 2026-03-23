import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClassEditor } from '../components/print-layout/ClassEditor'
import type { LayoutNode } from '../components/print-layout/types'

const baseNode: LayoutNode = {
  id: 'n1', x: 20, y: 30, width: 200, height: 80,
  classes: 'text-sm font-bold text-left',
  template: '<p>{{ name }}</p>',
}

describe('ClassEditor', () => {
  describe('empty state', () => {
    it('shows placeholder when no node selected', () => {
      render(<ClassEditor node={null} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect(screen.getByText(/select a node/i)).toBeInTheDocument()
    })
  })

  describe('typography pickers', () => {
    it('renders font size picker with current value', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      const select = screen.getByLabelText(/font size/i) as HTMLSelectElement
      expect(select.value).toBe('text-sm')
    })

    it('calls onUpdate with updated classes when size changes', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/font size/i), { target: { value: 'text-xl' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ classes: expect.stringContaining('text-xl') })
      )
      expect(onUpdate.mock.calls[0][0].classes).not.toContain('text-sm')
    })
  })

  describe('raw class string', () => {
    it('shows the full class string', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      const input = screen.getByLabelText(/css classes/i) as HTMLInputElement
      expect(input.value).toBe('text-sm font-bold text-left')
    })

    it('calls onUpdate when class string is edited', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/css classes/i), { target: { value: 'text-xl' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ classes: 'text-xl' }))
    })
  })

  describe('position inputs', () => {
    it('shows current x, y, width, height', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/^x$/i) as HTMLInputElement).value).toBe('20')
      expect((screen.getByLabelText(/^y$/i) as HTMLInputElement).value).toBe('30')
      expect((screen.getByLabelText(/^w$/i) as HTMLInputElement).value).toBe('200')
      expect((screen.getByLabelText(/^h$/i) as HTMLInputElement).value).toBe('80')
    })

    it('calls onUpdate when x changes', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/^x$/i), { target: { value: '50' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ x: 50 }))
    })
  })

  describe('template textarea', () => {
    it('shows current template', () => {
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/liquid template/i) as HTMLTextAreaElement).value).toBe('<p>{{ name }}</p>')
    })

    it('calls onUpdate when template changes', () => {
      const onUpdate = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/liquid template/i), { target: { value: '<h1>{{ title }}</h1>' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ template: '<h1>{{ title }}</h1>' }))
    })
  })

  describe('remove button', () => {
    it('calls onRemove when Remove button clicked', () => {
      const onRemove = vi.fn()
      render(<ClassEditor node={baseNode} onUpdate={vi.fn()} onRemove={onRemove} />)
      fireEvent.click(screen.getByRole('button', { name: /remove/i }))
      expect(onRemove).toHaveBeenCalledOnce()
    })
  })
})
