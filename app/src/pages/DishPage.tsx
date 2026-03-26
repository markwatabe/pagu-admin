import { useParams, Link } from 'react-router-dom';
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

export function DishPage() {
  const { id } = useParams<{ id: string }>();
  const [dish, setDish] = useState<Dish | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/dishes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Dish not found' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setDish)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!dish) return <Spinner />;

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link to="/dishes" className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; All Dishes
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{dish.name}</h1>
        <p className="mt-1 text-gray-500">{dish.description}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-6 py-3 font-medium text-gray-500">Price</td>
              <td className="px-6 py-3 text-gray-900">${dish.price}</td>
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium text-gray-500">Status</td>
              <td className="px-6 py-3">
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    dish.available
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {dish.available ? 'Available' : 'Unavailable'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Components</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <ul className="divide-y divide-gray-50">
            {dish.components.map((comp) => (
              <li key={comp} className="px-6 py-3 text-sm text-gray-900">
                {comp.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
