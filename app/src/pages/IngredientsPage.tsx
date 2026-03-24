import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

export function IngredientsPage() {
  const { isLoading, error, data } = db.useQuery({
    ingredients: { measuredIngredients: {} },
  });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const ingredients = [...(data?.ingredients ?? [])].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '')
  );

  const hasRecipe = (ing: (typeof ingredients)[number]) =>
    (ing.measuredIngredients ?? []).length > 0;

  const withRecipe = ingredients.filter(hasRecipe);
  const withoutRecipe = ingredients.filter((i) => !hasRecipe(i));

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Ingredients</h1>
        <p className="mt-1 text-gray-500">
          {ingredients.length} ingredients &middot; {withRecipe.length} with recipes
        </p>
      </div>

      {withRecipe.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Recipes</h2>
          <div className="space-y-3">
            {withRecipe.map((ing) => (
              <Link
                key={ing.id}
                to={`/ingredient/${ing.id}`}
                className="flex items-center justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <span className="font-semibold text-gray-900 capitalize">{ing.name}</span>
                <span className="text-sm text-gray-400">
                  {ing.measuredIngredients?.length ?? 0} ingredients &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Base Ingredients</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <ul className="divide-y divide-gray-50">
            {withoutRecipe.map((ing) => (
              <li key={ing.id}>
                <Link
                  to={`/ingredient/${ing.id}`}
                  className="block px-6 py-3 text-sm text-gray-700 capitalize transition hover:bg-gray-50 hover:text-indigo-600"
                >
                  {ing.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
