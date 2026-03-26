import { useState, useCallback, useRef, useEffect } from 'react'
import type { LayoutNode, PageLayout, PrintLayoutState, UsePrintLayoutReturn, Subdivision } from './types'

const NODE_DEFAULTS: Omit<LayoutNode, 'id'> = {
  x: 20, y: 20, width: 200, height: 80, style: {}, template: '', query: null,
}

const DEFAULT_PAGE: PageLayout = {
  nodes: [],
  subdivision: 'full',
}

const STATE_DEFAULTS: PrintLayoutState = {
  pages: [{ ...DEFAULT_PAGE }],
  currentPageIndex: 0,
  selectedNodeId: null,
  scale: 0.6,
  dataModel: {},
  pageWidth: 215.9,
  pageHeight: 279.4,
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
        if (notify && next !== prev) pendingNotifyRef.current = next
        return next
      })
    },
    [],
  )

  // Helper: update the current page
  const updateCurrentPage = useCallback(
    (updater: (page: PageLayout) => PageLayout, notify = true) => {
      update(prev => {
        const page = prev.pages[prev.currentPageIndex]
        if (!page) return prev
        const newPage = updater(page)
        if (newPage === page) return prev
        const newPages = [...prev.pages]
        newPages[prev.currentPageIndex] = newPage
        return { ...prev, pages: newPages }
      }, notify)
    },
    [update],
  )

  const addNode = useCallback((partial?: Partial<LayoutNode>) => {
    updateCurrentPage(page => ({
      ...page,
      nodes: [
        ...page.nodes,
        { ...NODE_DEFAULTS, id: crypto.randomUUID(), ...partial },
      ],
    }))
  }, [updateCurrentPage])

  const removeNode = useCallback((id: string) => {
    update(prev => {
      const page = prev.pages[prev.currentPageIndex]
      if (!page || !page.nodes.some(n => n.id === id)) return prev
      const newPage = {
        ...page,
        nodes: page.nodes.filter(n => n.id !== id),
      }
      const newPages = [...prev.pages]
      newPages[prev.currentPageIndex] = newPage
      return {
        ...prev,
        pages: newPages,
        selectedNodeId: prev.selectedNodeId === id ? null : prev.selectedNodeId,
      }
    })
  }, [update])

  const updateNode = useCallback((id: string, patch: Partial<LayoutNode>) => {
    updateCurrentPage(page => {
      if (!page.nodes.some(n => n.id === id)) return page
      return {
        ...page,
        nodes: page.nodes.map(n => n.id === id ? { ...n, ...patch } : n),
      }
    })
  }, [updateCurrentPage])

  const setSelectedNodeId = useCallback((id: string | null) => {
    update(prev => ({ ...prev, selectedNodeId: id }), false)
  }, [update])

  const setScale = useCallback((scale: number) => {
    update(prev => ({ ...prev, scale }), false)
  }, [update])

  const setDataModel = useCallback((dataModel: Record<string, unknown>) => {
    update(prev => ({ ...prev, dataModel }))
  }, [update])

  const setSubdivision = useCallback((subdivision: Subdivision) => {
    updateCurrentPage(page => ({ ...page, subdivision }))
  }, [updateCurrentPage])

  const setCurrentPageIndex = useCallback((index: number) => {
    update(prev => ({
      ...prev,
      currentPageIndex: Math.max(0, Math.min(index, prev.pages.length - 1)),
      selectedNodeId: null,
    }), false)
  }, [update])

  const addPage = useCallback(() => {
    update(prev => ({
      ...prev,
      pages: [...prev.pages, { ...DEFAULT_PAGE, nodes: [] }],
      currentPageIndex: prev.pages.length,
      selectedNodeId: null,
    }))
  }, [update])

  const removePage = useCallback((index: number) => {
    update(prev => {
      if (prev.pages.length <= 1) return prev // keep at least one page
      const newPages = prev.pages.filter((_, i) => i !== index)
      const newIndex = prev.currentPageIndex >= newPages.length
        ? newPages.length - 1
        : prev.currentPageIndex > index
          ? prev.currentPageIndex - 1
          : prev.currentPageIndex
      return {
        ...prev,
        pages: newPages,
        currentPageIndex: newIndex,
        selectedNodeId: null,
      }
    })
  }, [update])

  return {
    ...state,
    addNode,
    removeNode,
    updateNode,
    setSelectedNodeId,
    setScale,
    setDataModel,
    setSubdivision,
    setCurrentPageIndex,
    addPage,
    removePage,
  }
}
