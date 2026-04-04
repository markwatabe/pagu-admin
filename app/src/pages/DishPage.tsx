import { useParams, Link } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { db } from '../lib/db';
import { uploadImageFile } from '../lib/upload';
import { Spinner } from '../components/Spinner';

interface ComponentInfo {
  id: string;
  name: string;
  production_type: string;
  ingredient_type?: string;
  type?: string;
}

function ComponentPicker({ existingIds, onAdd }: { existingIds: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [allItems, setAllItems] = useState<ComponentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || allItems.length > 0) return;
    setLoading(true);
    fetch('/api/recipes/all')
      .then((r) => r.json())
      .then(setAllItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = allItems.filter((item) => {
    if (existingIds.includes(item.id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm text-gray-400 transition hover:border-indigo-300 hover:text-indigo-500"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 1v12M1 7h12" />
        </svg>
        Add component
      </button>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5">
          <circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search recipes and ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
        <button
          type="button"
          onClick={() => { setOpen(false); setSearch(''); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading && <p className="px-4 py-3 text-xs text-gray-400">Loading...</p>}
        {!loading && filtered.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-400 italic">
            {search ? 'No matches found' : 'All items already added'}
          </p>
        )}
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { onAdd(item.id); setSearch(''); }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-indigo-50"
          >
            <span className="text-sm text-gray-900">{item.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              item.production_type === 'IN_HOUSE'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {item.production_type === 'IN_HOUSE' ? 'Recipe' : 'Purchased'}
            </span>
            {(item.ingredient_type || item.type) && (
              <span className="text-xs text-gray-400">{item.ingredient_type ?? item.type}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function DishPage() {
  const { orgId, id } = useParams<{ orgId: string; id: string }>();
  const { user } = db.useAuth();
  const { isLoading, error, data } = db.useQuery({
    menuItems: { $: { where: { id } }, photo: {} },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [components, setComponents] = useState<ComponentInfo[]>([]);

  const dish = data?.menuItems?.[0];
  const componentIds = (dish?.components ?? []) as string[];

  useEffect(() => {
    if (componentIds.length === 0) { setComponents([]); return; }
    let cancelled = false;
    Promise.all(
      componentIds.map((cid) =>
        fetch(`/api/recipes/${cid}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) {
        setComponents(
          results
            .filter(Boolean)
            .map((r: any) => ({
              id: r.id,
              name: r.name ?? r.id.replace(/_/g, ' '),
              production_type: r.production_type,
              ingredient_type: r.ingredient_type,
              type: r.type,
            }))
        );
      }
    });
    return () => { cancelled = true; };
  }, [componentIds.join(',')]);

  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;
  if (isLoading) return <Spinner />;

  if (!dish) return <div className="p-8 text-red-600">Dish not found</div>;

  const linkedPhoto = Array.isArray(dish.photo) ? dish.photo[0] : dish.photo;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadImageFile(file, `${dish!.name ?? 'dish'} - photo`, user?.id);
      await db.transact([db.tx.menuItems[id].link({ photo: result.id })]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveImage() {
    if (!id || !linkedPhoto) return;
    await db.transact([db.tx.menuItems[id].unlink({ photo: linkedPhoto.id })]);
  }

  function handleAddComponent(componentId: string) {
    if (!id || componentIds.includes(componentId)) return;
    db.transact([db.tx.menuItems[id].update({ components: [...componentIds, componentId] })]);
  }

  function handleRemoveComponent(componentId: string) {
    if (!id) return;
    db.transact([db.tx.menuItems[id].update({ components: componentIds.filter((c) => c !== componentId) })]);
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link to={`/${orgId}/dishes`} className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; All Dishes
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{dish.name}</h1>
        {dish.description && <p className="mt-1 text-gray-500">{dish.description}</p>}
      </div>

      {/* Image */}
      <div className="mb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        {linkedPhoto?.url ? (
          <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm">
            <img
              src={linkedPhoto.url}
              alt={dish.name ?? ''}
              className="w-full max-h-80 object-contain"
            />
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur hover:bg-white disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Replace'}
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm backdrop-blur hover:bg-white"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-sm text-gray-400 transition hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-50"
          >
            {uploading ? (
              'Uploading...'
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                Add photo
              </>
            )}
          </button>
        )}
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {dish.section && (
              <tr>
                <td className="px-6 py-3 font-medium text-gray-500">Section</td>
                <td className="px-6 py-3 text-gray-900">{dish.section}</td>
              </tr>
            )}
            {dish.price != null && (
              <tr>
                <td className="px-6 py-3 font-medium text-gray-500">Price</td>
                <td className="px-6 py-3 text-gray-900">{formatPrice(dish.price as number)}</td>
              </tr>
            )}
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

      {/* Components */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Components</h2>
        {components.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
            {components.map((comp) => (
              <div key={comp.id} className="flex items-center">
                <Link
                  to={`/${orgId}/recipe/${comp.id}`}
                  className="flex flex-1 items-center justify-between px-6 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{comp.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      comp.production_type === 'IN_HOUSE'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {comp.production_type === 'IN_HOUSE' ? 'Recipe' : 'Purchased'}
                    </span>
                    {(comp.ingredient_type || comp.type) && (
                      <span className="text-xs text-gray-400">{comp.ingredient_type ?? comp.type}</span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemoveComponent(comp.id)}
                  className="px-3 py-3 text-gray-300 hover:text-red-500 transition"
                  title="Remove component"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <ComponentPicker
          existingIds={componentIds}
          onAdd={handleAddComponent}
        />
      </div>
    </section>
  );
}
