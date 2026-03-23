import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrintLayout } from '../components/print-layout/usePrintLayout'

describe('usePrintLayout', () => {
  describe('initial state', () => {
    it('uses default state when no initialState given', () => {
      const { result } = renderHook(() => usePrintLayout())
      expect(result.current.nodes).toEqual([])
      expect(result.current.selectedNodeId).toBeNull()
      expect(result.current.scale).toBe(0.6)
      expect(result.current.pageWidth).toBe(210)
      expect(result.current.pageHeight).toBe(297)
    })

    it('merges provided initialState over defaults', () => {
      const { result } = renderHook(() =>
        usePrintLayout({ scale: 0.8, pageWidth: 148 })
      )
      expect(result.current.scale).toBe(0.8)
      expect(result.current.pageWidth).toBe(148)
      expect(result.current.pageHeight).toBe(297) // default
    })
  })

  describe('addNode', () => {
    it('adds a node with default fields when called with no args', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.addNode() })
      expect(result.current.nodes).toHaveLength(1)
      const node = result.current.nodes[0]
      expect(node.x).toBe(20)
      expect(node.y).toBe(20)
      expect(node.width).toBe(200)
      expect(node.height).toBe(80)
      expect(node.classes).toBe('')
      expect(node.template).toBe('')
      expect(node.id).toBeTruthy()
    })

    it('merges provided partial over defaults', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.addNode({ x: 100, template: 'hello' }) })
      expect(result.current.nodes[0].x).toBe(100)
      expect(result.current.nodes[0].template).toBe('hello')
      expect(result.current.nodes[0].y).toBe(20)
    })

    it('appends to end of nodes array (last = on top)', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.addNode({ id: 'a' }) })
      act(() => { result.current.addNode({ id: 'b' }) })
      expect(result.current.nodes[1].id).toBe('b')
    })
  })

  describe('removeNode', () => {
    it('removes a node by id', () => {
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }] })
      )
      act(() => { result.current.removeNode('x') })
      expect(result.current.nodes).toHaveLength(0)
    })

    it('clears selectedNodeId if removed node was selected', () => {
      const { result } = renderHook(() =>
        usePrintLayout({
          nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }],
          selectedNodeId: 'x',
        })
      )
      act(() => { result.current.removeNode('x') })
      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('updateNode', () => {
    it('patches only specified fields', () => {
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 10, y: 20, width: 100, height: 50, classes: 'font-bold', template: 'hi' }] })
      )
      act(() => { result.current.updateNode('x', { x: 99 }) })
      const node = result.current.nodes[0]
      expect(node.x).toBe(99)
      expect(node.y).toBe(20)
      expect(node.classes).toBe('font-bold')
    })
  })

  describe('setSelectedNodeId', () => {
    it('sets selection', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.setSelectedNodeId('abc') })
      expect(result.current.selectedNodeId).toBe('abc')
    })

    it('clears selection with null', () => {
      const { result } = renderHook(() => usePrintLayout({ selectedNodeId: 'abc' }))
      act(() => { result.current.setSelectedNodeId(null) })
      expect(result.current.selectedNodeId).toBeNull()
    })
  })

  describe('setScale', () => {
    it('updates scale', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.setScale(1.0) })
      expect(result.current.scale).toBe(1.0)
    })
  })

  describe('setDataModel', () => {
    it('updates dataModel', () => {
      const { result } = renderHook(() => usePrintLayout())
      act(() => { result.current.setDataModel({ name: 'Pagu' }) })
      expect(result.current.dataModel).toEqual({ name: 'Pagu' })
    })
  })

  describe('onChange callback', () => {
    it('fires on addNode', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.addNode() })
      expect(onChange).toHaveBeenCalledOnce()
      expect(onChange.mock.calls[0][0].nodes).toHaveLength(1)
    })

    it('fires on removeNode', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }] }, onChange)
      )
      act(() => { result.current.removeNode('x') })
      expect(onChange).toHaveBeenCalledOnce()
    })

    it('fires on updateNode', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        usePrintLayout({ nodes: [{ id: 'x', x: 0, y: 0, width: 100, height: 50, classes: '', template: '' }] }, onChange)
      )
      act(() => { result.current.updateNode('x', { x: 50 }) })
      expect(onChange).toHaveBeenCalledOnce()
    })

    it('fires on setDataModel', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.setDataModel({ x: 1 }) })
      expect(onChange).toHaveBeenCalledOnce()
    })

    it('does NOT fire on setScale', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.setScale(0.5) })
      expect(onChange).not.toHaveBeenCalled()
    })

    it('does NOT fire on setSelectedNodeId', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() => usePrintLayout({}, onChange))
      act(() => { result.current.setSelectedNodeId('abc') })
      expect(onChange).not.toHaveBeenCalled()
    })
  })
})
