export const MM_TO_PX = 96 / 25.4

export interface LayoutNode {
  id: string
  x: number        // logical px, pre-scale
  y: number
  width: number
  height: number
  classes: string  // Tailwind class string
  template: string // Liquid template source
  query: string | null // named query key — template renders once per item when set
}

export interface PrintLayoutState {
  nodes: LayoutNode[]
  selectedNodeId: string | null
  scale: number
  dataModel: Record<string, unknown>
  pageWidth: number   // mm
  pageHeight: number  // mm
}

export interface UsePrintLayoutReturn extends PrintLayoutState {
  addNode: (node?: Partial<LayoutNode>) => void
  removeNode: (id: string) => void
  updateNode: (id: string, patch: Partial<LayoutNode>) => void
  setSelectedNodeId: (id: string | null) => void
  setScale: (scale: number) => void
  setDataModel: (model: Record<string, unknown>) => void
}
