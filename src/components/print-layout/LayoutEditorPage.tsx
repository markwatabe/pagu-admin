import { PrintLayoutEditor } from './PrintLayoutEditor'

interface LayoutEditorPageProps {
  dataModel: Record<string, unknown>
}

export function LayoutEditorPage({ dataModel }: LayoutEditorPageProps) {
  return (
    <div className="h-screen">
      <PrintLayoutEditor
        initialState={{ dataModel }}
      />
    </div>
  )
}
