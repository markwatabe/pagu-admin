import { useParams, Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useEffect, useState } from 'react';

const BATCH_SIZES = [0.5, 1, 2, 3, 4] as const;

interface RecipeIngredient {
  qty: number;
  unit: string;
  componentId: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients?: RecipeIngredient[];
  instructions?: string[];
  equipment?: string[];
}

interface ComponentDetail {
  id: string;
  name: string;
  type?: string;
  allergen?: boolean;
  recipes: Recipe[];
  skus: any[];
}

// TODO: Add ingredient editing when recipe PATCH endpoint is available

export function RecipePage() {
  const { orgId, id } = useParams<{ orgId: string; id: string }>();
  const [data, setData] = useState<ComponentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(1);
  const [componentNames, setComponentNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Recipe not found' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((items: { id: string; name: string }[]) => {
        const map = new Map<string, string>();
        items.forEach((i) => map.set(i.id, i.name));
        setComponentNames(map);
      })
      .catch(() => {});
  }, []);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return <Spinner />;

  const recipe = data.recipes?.[0];
  const ingredients = (recipe?.ingredients ?? []).sort((a, b) => b.qty - a.qty);
  const totalWeight = ingredients.reduce((sum, r) => sum + r.qty, 0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link to={`/${orgId}/recipes`} className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; All Recipes
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
        {ingredients.length > 0 && (
          <p className="mt-1 text-gray-500">
            {ingredients.length} ingredients &middot; {parseFloat((totalWeight * batchSize).toFixed(2))}g total
          </p>
        )}
      </div>

      {ingredients.length === 0 && (
        <p className="text-sm italic text-gray-400">
          This component has no recipe — it may be a base ingredient.
        </p>
      )}

      {ingredients.length > 0 && (
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
              {ingredients.map((r) => (
                <tr key={r.componentId} className="transition hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <Link
                      to={`/${orgId}/recipe/${r.componentId}`}
                      className="hover:text-indigo-600"
                    >
                      {componentNames.get(r.componentId) ?? r.componentId}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {parseFloat((r.qty * batchSize).toFixed(2))} {r.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recipe?.instructions && recipe.instructions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Instructions</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {recipe?.equipment && recipe.equipment.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Equipment</h2>
          <ul className="flex flex-wrap gap-2">
            {recipe.equipment.map((e) => (
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
