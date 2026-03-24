import { useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

export function IngredientPage() {
  const { id } = useParams<{ id: string }>();

  const { isLoading, error, data } = db.useQuery({
    ingredients: {
      $: { where: { id: id! } },
      measuredIngredients: { ingredient: {} },
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const ingredient = data?.ingredients?.[0];
  if (!ingredient) return <div className="p-8 text-gray-500">Ingredient not found.</div>;

  const recipe = (ingredient.measuredIngredients ?? []).sort(
    (a, b) => (b.amount ?? 0) - (a.amount ?? 0)
  );
  const totalWeight = recipe.reduce((sum, mi) => sum + (mi.amount ?? 0), 0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 capitalize">
          {ingredient.name}
        </h1>
        {recipe.length > 0 && (
          <p className="mt-1 text-gray-500">
            {recipe.length} ingredients &middot; {totalWeight}g total
          </p>
        )}
      </div>

      {recipe.length === 0 ? (
        <p className="text-sm italic text-gray-400">
          This ingredient has no recipe — it is a base ingredient.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Ingredient</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recipe.map((mi) => {
                const name = mi.ingredient?.[0]?.name ?? '—';
                const pct = totalWeight > 0 ? ((mi.amount ?? 0) / totalWeight) * 100 : 0;
                return (
                  <tr key={mi.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 capitalize">{name}</td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {mi.amount ?? '—'} {mi.unit ?? ''}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-400">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
