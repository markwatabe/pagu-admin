import { useState, useCallback, useRef, useEffect } from 'react'
import type { LayoutNode, PrintLayoutState, UsePrintLayoutReturn } from './types'

const NODE_DEFAULTS: Omit<LayoutNode, 'id'> = {
  x: 20, y: 20, width: 200, height: 80, classes: '', template: '', query: null,
}

const STATE_DEFAULTS: PrintLayoutState = {
  nodes: [],
  selectedNodeId: null,
  scale: 0.6,
  dataModel: {},
  pageWidth: 210,
  pageHeight: 297,
}

export function usePrintLayout(
  initialState?: Partial<PrintLayoutState>,
  onChange?: (state: PrintLayoutState) => void,
): UsePrintLayoutReturn {
  const [state, setState] = useState<PrintLayoutState>({
    ...STATE_DEFAULTS,
    ...initialState,
  })

  // Stable ref so callbacks always see latest onChange without re-binding
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Pending notification: set inside updater (ref write is fine), fired after commit
  const pendingNotifyRef = useRef<PrintLayoutState | null>(null)

  useEffect(() => {
    if (pendingNotifyRef.current !== null) {
      const toNotify = pendingNotifyRef.current
      pendingNotifyRef.current = null
      onChangeRef.current?.(toNotify)
    }
  })

  // Helper: update state and optionally fire onChange
  const update = useCallback(
    (updater: (prev: PrintLayoutState) => PrintLayoutState, notify = true) => {
      setState(prev => {
        const next = updater(prev)
        // Only notify if state actually changed AND notification is requested
        if (notify && next !== prev) pendingNotifyRef.current = next
        return next
      })
    },
    [],
  )

  const addNode = useCallback((partial?: Partial<LayoutNode>) => {
    update(prev => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { ...NODE_DEFAULTS, id: crypto.randomUUID(), ...partial },
      ],
    }))
  }, [update])

  const removeNode = useCallback((id: string) => {
    update(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      selectedNodeId: prev.selectedNodeId === id ? null : prev.selectedNodeId,
    }))
  }, [update])

  const updateNode = useCallback((id: string, patch: Partial<LayoutNode>) => {
    update(prev => {
      if (!prev.nodes.some(n => n.id === id)) return prev  // no-op, no onChange
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === id ? { ...n, ...patch } : n),
      }
    })
  }, [update])

  const setSelectedNodeId = useCallback((id: string | null) => {
    update(prev => ({ ...prev, selectedNodeId: id }), false) // no onChange
  }, [update])

  const setScale = useCallback((scale: number) => {
    update(prev => ({ ...prev, scale }), false) // no onChange
  }, [update])

  const setDataModel = useCallback((dataModel: Record<string, unknown>) => {
    update(prev => ({ ...prev, dataModel }))
  }, [update])

  return {
    ...state,
    addNode,
    removeNode,
    updateNode,
    setSelectedNodeId,
    setScale,
    setDataModel,
  }
}
