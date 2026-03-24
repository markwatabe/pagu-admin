import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';
import { LayoutEditorPage as Editor } from '../components/print-layout/LayoutEditorPage';

const SECTION_TO_KEY: Record<string, string> = {
  'Chilled':          'chilled',
  'Tapas':            'tapas',
  'Baos':             'baos',
  'Land & Sea':       'land_and_sea',
  'Noodles & Rice':   'noodles_and_rice',
  'Sweet':            'sweet',
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function LayoutEditorPage() {
  const { isLoading, error, data } = db.useQuery({ menuItems: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? ''))
    .map((i) => ({
      name: i.name,
      description: i.description,
      section: i.section,
      price: formatPrice(i.price ?? 0),
      price_cents: i.price ?? 0,
      available: i.available,
    }));

  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const key = SECTION_TO_KEY[item.section] ?? (item.section ?? '').toLowerCase();
    (grouped[key] ??= []).push(item);
  }

  const dataModel = {
    restaurant: { name: 'Pagu', subtitle: 'Japanese-Spanish Tapas' },
    all_menu_items: items,
    ...grouped,
  };

  return <Editor dataModel={dataModel} />;
}
