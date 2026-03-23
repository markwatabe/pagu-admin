import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuRenderPage() {
  const { isLoading, error, data } = db.useQuery({ menuItems: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? ''));
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-gray-900">Our Menu</h1>
      <p className="mb-12 text-gray-500">Fresh ingredients, served with care.</p>

      <div className="space-y-12">
        {sections.map((section) => (
          <div key={section}>
            <h2 className="mb-6 border-b border-gray-100 pb-3 text-xl font-bold tracking-tight text-gray-900">
              {section}
            </h2>
            <ul className="space-y-5">
              {items.filter((i) => i.section === section).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-6">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-gray-900">{formatPrice(item.price)}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
