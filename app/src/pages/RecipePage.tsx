import { useParams, Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useCallback, useEffect, useRef, useState } from 'react';

const BATCH_SIZES = [0.5, 1, 2, 3, 4] as const;

interface ResolvedIngredient {
  amount: number;
  unit: string;
  ingredientId: string;
  name: string;
}

interface IngredientSummary {
  id: string;
  name: string;
  unit?: string;
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

function AddIngredientForm({
  recipeId,
  onAdded,
}: {
  recipeId: string;
  onAdded: () => void;
}) {
  const [allIngredients, setAllIngredients] = useState<IngredientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<IngredientSummary | null>(null);
  const [amount, setAmount] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then(setAllIngredients)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? allIngredients.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase())
      )
    : allIngredients;

  function handleSelect(ing: IngredientSummary) {
    setSelected(ing);
    setSearch(ing.name);
    setDropdownOpen(false);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setSelected(null);
    setDropdownOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !amount) return;
    setSubmitting(true);
    try {
      await fetch(`/api/recipes/${recipeId}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: selected.id,
          amount: parseFloat(amount),
          unit: selected.unit ?? 'gram',
        }),
      });
      setSearch('');
      setSelected(null);
      setAmount('');
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-3">
      <div ref={wrapperRef} className="relative flex-1">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Ingredient</label>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Search ingredients..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {dropdownOpen && filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {filtered.map((ing) => (
              <li key={ing.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(ing)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                >
                  <span>{ing.name}</span>
                  {ing.unit && (
                    <span className="text-xs text-gray-400">{ing.unit}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Amount</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!selected}
            placeholder="0"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          />
          {selected?.unit && (
            <span className="shrink-0 text-xs text-gray-500">{selected.unit}</span>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={!selected || !amount || submitting}
        className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

export function RecipePage() {
  const { orgId, id } = useParams<{ orgId: string; id: string }>();
  const [data, setData] = useState<IngredientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(1);
  const [rev, setRev] = useState(0);

  const fetchData = useCallback(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Recipe not found' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData, rev]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return <Spinner />;

  const recipe = (data.ingredients ?? []).sort((a, b) => b.amount - a.amount);
  const totalWeight = recipe.reduce((sum, r) => sum + r.amount, 0);

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
                  to={`/${orgId}/recipe/${s}`}
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
                      to={`/${orgId}/recipe/${r.ingredientId}`}
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

      {data.production_type === 'IN_HOUSE' && (
        <AddIngredientForm recipeId={data.id} onAdded={() => setRev((r) => r + 1)} />
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
