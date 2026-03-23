/** Named queries available in the layout editor.
 *  Each key corresponds to a top-level key in the dataModel (an array of items).
 *  The node's Liquid template is rendered once per item in that array. */
export const NAMED_QUERIES = [
  { key: 'chilled',          label: 'Chilled' },
  { key: 'tapas',            label: 'Tapas' },
  { key: 'baos',             label: 'Baos' },
  { key: 'land_and_sea',     label: 'Land & Sea' },
  { key: 'noodles_and_rice', label: 'Noodles & Rice' },
  { key: 'sweet',            label: 'Sweet' },
  { key: 'all_menu_items',   label: 'All Menu Items' },
] as const

export type QueryKey = (typeof NAMED_QUERIES)[number]['key']
