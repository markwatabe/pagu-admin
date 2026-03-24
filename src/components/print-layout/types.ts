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

export type Subdivision = 'full' | 'cols2' | 'rows2' | 'grid4'

// internal — use subdivisionGrid()
const SUBDIVISION_GRID: Record<Subdivision, { cols: number; rows: number }> = {
  full:  { cols: 1, rows: 1 },
  cols2: { cols: 2, rows: 1 },
  rows2: { cols: 1, rows: 2 },
  grid4: { cols: 2, rows: 2 },
}

/** Returns column and row count for a subdivision mode. */
export function subdivisionGrid(sub: Subdivision): { cols: number; rows: number } {
  return SUBDIVISION_GRID[sub]
}

export interface PrintLayoutState {
  nodes: LayoutNode[]
  selectedNodeId: string | null
  scale: number
  dataModel: Record<string, unknown>
  pageWidth: number     // mm — 215.9 for letter
  pageHeight: number    // mm — 279.4 for letter
  subdivision: Subdivision
}

export interface UsePrintLayoutReturn extends PrintLayoutState {
  addNode: (node?: Partial<LayoutNode>) => void
  removeNode: (id: string) => void
  updateNode: (id: string, patch: Partial<LayoutNode>) => void
  setSelectedNodeId: (id: string | null) => void
  setScale: (scale: number) => void
  setDataModel: (model: Record<string, unknown>) => void
  setSubdivision: (sub: Subdivision) => void
}
