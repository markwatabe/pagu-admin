import { Link, useParams } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { ViewToggle, useViewToggle } from '../components/ViewToggle';
import { useEffect, useState } from 'react';

interface IngredientSummary {
  id: string;
  name: string;
  production_type: string;
  ingredient_type?: string;
  type?: string;
  hasRecipe: boolean;
}

export function RecipesPage() {
  const { orgId } = useParams();
  const [recipes, setRecipes] = useState<IngredientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useViewToggle();

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((all: IngredientSummary[]) => setRecipes(all.filter((i) => i.hasRecipe)))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!recipes) return <Spinner />;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Recipes</h1>
          <p className="mt-1 text-gray-500">{recipes.length} recipes</p>
        </div>
        {recipes.length > 0 && <ViewToggle view={view} onChangeView={setView} />}
      </div>

      {recipes.length === 0 && (
        <p className="text-sm italic text-gray-400">No recipes yet.</p>
      )}

      {recipes.length > 0 && view === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recipes.map((ing) => (
                <tr key={ing.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <Link
                      to={`/${orgId}/recipe/${ing.id}`}
                      className="hover:text-indigo-600"
                    >
                      {ing.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {ing.ingredient_type || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recipes.length > 0 && view === 'cards' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {recipes.map((ing) => (
            <Link
              key={ing.id}
              to={`/${orgId}/recipe/${ing.id}`}
              className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <span className="block font-semibold text-gray-900 group-hover:text-indigo-600">
                {ing.name}
              </span>
              {ing.ingredient_type && (
                <span className="mt-1 block text-xs text-gray-400">{ing.ingredient_type}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
