import { Link, useParams } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useEffect, useState } from 'react';

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  components: string[];
}

export function DishesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dishes')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setDishes)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!dishes) return <Spinner />;

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
            className="block overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">{dish.name}</span>
                <span className="ml-3 text-sm text-gray-500">${dish.price}</span>
              </div>
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
            <p className="mt-1 text-sm text-gray-500">{dish.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dish.components.map((comp) => (
                <span
                  key={comp}
                  className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {comp.replace(/_/g, ' ')}
                </span>
              ))}
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
