import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StyleEditor } from '../components/print-layout/StyleEditor'
import type { LayoutNode } from '../components/print-layout/types'

const baseNode: LayoutNode = {
  id: 'n1', x: 20, y: 30, width: 200, height: 80,
  style: { fontSize: 'var(--menu-item-size)', fontWeight: '700', textAlign: 'left' },
  template: '<p>{{ name }}</p>',
  query: null,
}

describe('StyleEditor', () => {
  describe('empty state', () => {
    it('shows placeholder when no node selected', () => {
      render(<StyleEditor node={null} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect(screen.getByText(/select a node/i)).toBeInTheDocument()
    })
  })

  describe('typography pickers', () => {
    it('renders font size picker with current value', () => {
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      const select = screen.getByLabelText(/^size$/i) as HTMLSelectElement
      expect(select.value).toBe('var(--menu-item-size)')
    })

    it('calls onUpdate with updated style when size changes', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/^size$/i), { target: { value: '24px' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ style: expect.objectContaining({ fontSize: '24px' }) })
      )
    })

    it('removes the property when blank option is selected', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/^size$/i), { target: { value: '' } })
      const style = onUpdate.mock.calls[0][0].style
      expect(style).not.toHaveProperty('fontSize')
    })
  })

  describe('position inputs', () => {
    it('shows current x, y, width, height', () => {
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/^x$/i) as HTMLInputElement).value).toBe('20')
      expect((screen.getByLabelText(/^y$/i) as HTMLInputElement).value).toBe('30')
      expect((screen.getByLabelText(/^w$/i) as HTMLInputElement).value).toBe('200')
      expect((screen.getByLabelText(/^h$/i) as HTMLInputElement).value).toBe('80')
    })

    it('calls onUpdate when x changes', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/^x$/i), { target: { value: '50' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ x: 50 }))
    })
  })

  describe('template textarea', () => {
    it('shows current template', () => {
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={vi.fn()} />)
      expect((screen.getByLabelText(/liquid template/i) as HTMLTextAreaElement).value).toBe('<p>{{ name }}</p>')
    })

    it('calls onUpdate when template changes', () => {
      const onUpdate = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={onUpdate} onRemove={vi.fn()} />)
      fireEvent.change(screen.getByLabelText(/liquid template/i), { target: { value: '<h1>{{ title }}</h1>' } })
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ template: '<h1>{{ title }}</h1>' }))
    })
  })

  describe('remove button', () => {
    it('calls onRemove when Remove button clicked', () => {
      const onRemove = vi.fn()
      render(<StyleEditor node={baseNode} dataModel={{}} onUpdate={vi.fn()} onRemove={onRemove} />)
      fireEvent.click(screen.getByRole('button', { name: /remove/i }))
      expect(onRemove).toHaveBeenCalledOnce()
    })
  })
})
