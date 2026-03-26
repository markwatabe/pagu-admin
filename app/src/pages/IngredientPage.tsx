import { useParams, Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useEffect, useState } from 'react';

const BATCH_SIZES = [0.5, 1, 2, 3, 4] as const;

interface ResolvedIngredient {
  amount: number;
  unit: string;
  ingredientId: string;
  name: string;
}

interface IngredientDetail {
  id: string;
  name: string;
  production_type: string;
  ingredient_type?: string;
  type?: string;
  allergen?: boolean;
  sub_ingredients?: string[];
  ingredients?: ResolvedIngredient[];
  instructions?: string[];
  directions?: string[];
  equipment?: string[];
}

export function IngredientPage() {
  const { orgId, id } = useParams<{ orgId: string; id: string }>();
  const [data, setData] = useState<IngredientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(1);

  useEffect(() => {
    fetch(`/api/ingredients/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Ingredient not found' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return <Spinner />;

  const recipe = (data.ingredients ?? []).sort((a, b) => b.amount - a.amount);
  const totalWeight = recipe.reduce((sum, r) => sum + r.amount, 0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link to={`/${orgId}/ingredients`} className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; All Ingredients
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {data.name}
          </h1>
          {data.allergen && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
              Common Allergen
            </span>
          )}
        </div>
        {recipe.length > 0 && (
          <p className="mt-1 text-gray-500">
            {recipe.length} ingredients &middot; {parseFloat((totalWeight * batchSize).toFixed(2))}g total
          </p>
        )}
      </div>

      {recipe.length === 0 && data.sub_ingredients && data.sub_ingredients.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Sub-ingredients</h2>
          <ul className="space-y-1">
            {data.sub_ingredients.map((s) => (
              <li key={s}>
                <Link
                  to={`/${orgId}/ingredient/${s}`}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.length === 0 && (!data.sub_ingredients || data.sub_ingredients.length === 0) && (
        <p className="text-sm italic text-gray-400">
          This ingredient has no recipe — it is a base ingredient.
        </p>
      )}

      {recipe.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-6 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Make Batch</span>
            <div className="flex gap-1">
              {BATCH_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setBatchSize(size)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    batchSize === size
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {size}x
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Ingredient</th>
                <th className="px-6 py-3 text-right">Batch Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recipe.map((r) => (
                <tr key={r.ingredientId} className="transition hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <Link
                      to={`/${orgId}/ingredient/${r.ingredientId}`}
                      className="hover:text-indigo-600"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {parseFloat((r.amount * batchSize).toFixed(2))} {r.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.instructions && data.instructions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Instructions</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
            {data.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {data.directions && data.directions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Directions</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {data.directions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {data.equipment && data.equipment.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Equipment</h2>
          <ul className="flex flex-wrap gap-2">
            {data.equipment.map((e) => (
              <li
                key={e}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
