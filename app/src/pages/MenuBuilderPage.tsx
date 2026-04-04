import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuBuilderPage() {
  const { isLoading, error, data } = db.useQuery({ dishes: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const items = [...(data?.dishes ?? [])].sort((a, b) =>
    (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? '')
  );
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Menu Builder</h1>
          <p className="mt-1 text-gray-500">
            {items.length} items across {sections.length} sections
          </p>
        </div>
        <button className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          + Add item
        </button>
      </div>

      <div className="space-y-10">
        {sections.map((section) => {
          const sectionItems = items.filter((i) => i.section === section);
          return (
            <div key={section}>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">{section}</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sectionItems.map((item) => (
                      <tr key={item.id} className="transition hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-gray-500">{item.description}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{formatPrice(item.price)}</td>
                        <td className="px-6 py-4">
                          <span className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
                          ].join(' ')}>
                            <span className={[
                              'h-1.5 w-1.5 rounded-full',
                              item.available ? 'bg-green-500' : 'bg-gray-400',
                            ].join(' ')} />
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
