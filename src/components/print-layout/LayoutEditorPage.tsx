import { PrintLayoutEditor } from './PrintLayoutEditor'

export function LayoutEditorPage() {
  return (
    <div className="h-screen">
      <PrintLayoutEditor
        initialState={{
          dataModel: {
            restaurant: { name: 'Pagu', subtitle: 'Restaurant Menu' },
            sections: [
              { name: 'Starters', items: [{ name: 'Spring Rolls', price: '$12' }] },
            ],
          },
        }}
      />
    </div>
  )
}
