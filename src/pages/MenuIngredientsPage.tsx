import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuIngredientsPage() {
  const { isLoading, error, data } = db.useQuery({
    menuItems: { measuredIngredients: { ingredient: {} } },
  });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])].sort((a, b) =>
    (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? '')
  );
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Menu Ingredients</h1>
        <p className="mt-1 text-gray-500">
          {items.length} items across {sections.length} sections
        </p>
      </div>

      <div className="space-y-10">
        {sections.map((section) => {
          const sectionItems = items.filter((i) => i.section === section);
          return (
            <div key={section}>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">{section}</h2>
              <div className="space-y-3">
                {sectionItems.map((item) => {
                  const measuredIngredients = item.measuredIngredients ?? [];
                  return (
                    <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <div className="flex items-baseline justify-between border-b border-gray-50 px-6 py-4">
                        <div>
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          {item.description && (
                            <span className="ml-2 text-sm text-gray-400">{item.description}</span>
                          )}
                        </div>
                        <span className="ml-4 shrink-0 text-sm font-medium text-gray-700">
                          {formatPrice(item.price ?? 0)}
                        </span>
                      </div>
                      <div className="px-6 py-3">
                        {measuredIngredients.length === 0 ? (
                          <p className="text-sm italic text-gray-400">No ingredients listed</p>
                        ) : (
                          <ul className="flex flex-wrap gap-2">
                            {measuredIngredients.map((mi) => (
                              <li
                                key={mi.id}
                                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                              >
                                {mi.ingredient?.[0]?.name ?? '—'}
                                {(mi.amount || mi.unit) && (
                                  <span className="text-gray-400">
                                    {mi.amount}{mi.unit ? ` ${mi.unit}` : ''}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
