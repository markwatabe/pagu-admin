import { Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
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
  const [recipes, setRecipes] = useState<IngredientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ingredients')
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Recipes</h1>
        <p className="mt-1 text-gray-500">{recipes.length} recipes</p>
      </div>

      <div className="space-y-3">
        {recipes.map((ing) => (
          <Link
            key={ing.id}
            to={`/ingredient/${ing.id}`}
            className="flex items-center justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <div>
              <span className="font-semibold text-gray-900">{ing.name}</span>
              {ing.ingredient_type && (
                <span className="ml-3 text-xs text-gray-400">{ing.ingredient_type}</span>
              )}
            </div>
            <span className="text-sm text-gray-400">&rarr;</span>
          </Link>
        ))}
        {recipes.length === 0 && (
          <p className="text-sm italic text-gray-400">No recipes yet.</p>
        )}
      </div>
    </section>
  );
}
