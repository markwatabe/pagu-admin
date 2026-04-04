import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

export function DishesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { isLoading, error, data } = db.useQuery({ menuItems: { photo: {} } });

  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;
  if (isLoading) return <Spinner />;

  const dishes = [...(data?.menuItems ?? [])]
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? ''));

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dishes</h1>
        <p className="mt-1 text-gray-500">{dishes.length} dishes</p>
      </div>

      <div className="space-y-3">
        {dishes.map((dish) => (
          <Link
            key={dish.id}
            to={`/${orgId}/dishes/${dish.id}`}
            className="flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            {(() => {
              const img = Array.isArray(dish.photo) ? dish.photo[0] : dish.photo;
              return img?.url ? (
                <img src={img.url} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">{dish.name}</span>
                {dish.price != null && (
                  <span className="ml-3 text-sm text-gray-500">
                    ${((dish.price as number) / 100).toFixed((dish.price as number) % 100 === 0 ? 0 : 2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {dish.section && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                    {dish.section}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    dish.available
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {dish.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>
            {dish.description && (
              <p className="mt-1 text-sm text-gray-500 truncate">{dish.description}</p>
            )}
            </div>
          </Link>
        ))}
        {dishes.length === 0 && (
          <p className="text-sm italic text-gray-400">No dishes yet.</p>
        )}
      </div>
    </section>
  );
}
