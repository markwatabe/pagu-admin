import { useEffect, useState } from 'react';
import { Spinner } from '../components/Spinner';

interface Sku {
  url: string;
  asin: string;
  name: string | null;
  brand: string | null;
  latestPrice: number | null;
  latestDate: string | null;
  hasSkuFile: boolean;
}

export function SkusPage() {
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [addUrl, setAddUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  function load() {
    fetch('/api/skus')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setSkus)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRemove(asin: string) {
    setRemoving((prev) => new Set(prev).add(asin));
    try {
      const r = await fetch(`/api/skus/${asin}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSkus((prev) => prev?.filter((s) => s.asin !== asin) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(asin);
        return next;
      });
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addUrl.trim()) return;

    try {
      const r = await fetch('/api/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setAddUrl('');
      load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e));
    }
  }

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!skus) return <Spinner />;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Amazon SKUs</h1>
        <p className="mt-1 text-gray-500">
          {skus.length} tracked product{skus.length !== 1 ? 's' : ''} in AMAZON_SKUS.csv
        </p>
      </div>

      {/* Add URL form */}
      <form onSubmit={handleAdd} className="mb-8 flex gap-3">
        <input
          type="url"
          value={addUrl}
          onChange={(e) => setAddUrl(e.target.value)}
          placeholder="https://www.amazon.com/dp/B00..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          Add SKU
        </button>
      </form>
      {addError && (
        <p className="-mt-5 mb-6 text-sm text-red-600">{addError}</p>
      )}

      {/* SKU list */}
      <div className="space-y-3">
        {skus.map((sku) => (
          <div
            key={sku.asin}
            className="flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="truncate font-semibold text-gray-900">
                  {sku.name ?? sku.asin}
                </span>
                {sku.brand && (
                  <span className="shrink-0 text-sm text-gray-500">{sku.brand}</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="font-mono text-xs">{sku.asin}</span>
                {sku.latestPrice !== null && (
                  <span className="font-medium text-gray-900">
                    ${sku.latestPrice.toFixed(2)}
                  </span>
                )}
                {sku.latestDate && (
                  <span className="text-xs text-gray-400">as of {sku.latestDate}</span>
                )}
                {!sku.hasSkuFile && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    No price data
                  </span>
                )}
              </div>
            </div>

            <a
              href={sku.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              Amazon
            </a>

            <button
              type="button"
              onClick={() => handleRemove(sku.asin)}
              disabled={removing.has(sku.asin)}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {removing.has(sku.asin) ? 'Removing...' : 'Remove'}
            </button>
          </div>
        ))}
        {skus.length === 0 && (
          <p className="text-sm italic text-gray-400">No SKUs tracked yet. Add an Amazon URL above.</p>
        )}
      </div>
    </section>
  );
}
