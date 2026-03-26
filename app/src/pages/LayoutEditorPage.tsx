import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';
import { PrintLayoutEditor } from '../components/print-layout/PrintLayoutEditor';
import type { PrintLayoutState, PageLayout } from '../components/print-layout/types';

const SECTION_TO_KEY: Record<string, string> = {
  'Chilled':          'chilled',
  'Tapas':            'tapas',
  'Baos':             'baos',
  'Land & Sea':       'land_and_sea',
  'Noodles & Rice':   'noodles_and_rice',
  'Sweet':            'sweet',
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

interface MenuNodeJson {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: Record<string, string>;
  template: string;
  query: string | null;
}

interface MenuPageJson {
  nodes: MenuNodeJson[];
  subdivision: string;
}

interface MenuTemplate {
  id: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  pages: MenuPageJson[];
}

interface MenuSummary {
  id: string;
  name: string;
}

/** Menu picker — shown at /menu */
export function LayoutEditorPickerPage() {
  const [menus, setMenus] = useState<MenuSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/menus')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setMenus)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!menus) return <Spinner />;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Layout Editor</h1>
        <p className="mt-1 text-gray-500">Choose a menu to edit</p>
      </div>
      <div className="space-y-3">
        {menus.map((menu) => (
          <button
            key={menu.id}
            type="button"
            onClick={() => navigate(`/menu/${menu.id}`)}
            className="flex w-full items-center justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <span className="font-semibold text-gray-900">{menu.name}</span>
            <span className="text-sm text-gray-400">&rarr;</span>
          </button>
        ))}
        {menus.length === 0 && (
          <p className="text-sm italic text-gray-400">No menus yet.</p>
        )}
      </div>
    </section>
  );
}

/** Layout editor for a specific menu — shown at /menu/:id */
export function LayoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [menuTemplate, setMenuTemplate] = useState<MenuTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [dirty, setDirty] = useState(false);
  const latestStateRef = useRef<PrintLayoutState | null>(null);

  const { isLoading, error: dbError, data } = db.useQuery({ menuItems: {} });

  // Load the menu template
  useEffect(() => {
    fetch(`/api/menus/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Menu not found' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setMenuTemplate)
      .catch((e) => setError(e.message));
  }, [id]);

  // Warn on browser/tab close with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const handleChange = useCallback((state: PrintLayoutState) => {
    latestStateRef.current = state;
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!latestStateRef.current || !menuTemplate) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const state = latestStateRef.current;
      const payload: MenuTemplate = {
        id: menuTemplate.id,
        name: menuTemplate.name,
        pageWidth: state.pageWidth,
        pageHeight: state.pageHeight,
        pages: state.pages.map((page) => ({
          subdivision: page.subdivision,
          nodes: page.nodes.map((n) => ({
            id: n.id,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            style: n.style ?? {},
            template: n.template,
            query: n.query,
          })),
        })),
      };
      const r = await fetch(`/api/menus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [id, menuTemplate]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (dbError) return <div className="p-8 text-red-600">Error: {dbError.message}</div>;
  if (isLoading || !menuTemplate) return <Spinner />;

  // Build data model from menu items
  const items = [...(data?.menuItems ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? ''))
    .map((i) => ({
      name: i.name,
      description: i.description,
      section: i.section,
      price: formatPrice(i.price ?? 0),
      price_cents: i.price ?? 0,
      available: i.available,
    }));

  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const key = SECTION_TO_KEY[item.section] ?? (item.section ?? '').toLowerCase();
    (grouped[key] ??= []).push(item);
  }

  const dataModel = {
    restaurant: { name: 'Pagu', subtitle: 'Japanese-Spanish Tapas' },
    all_menu_items: items,
    ...grouped,
  };

  const pages: PageLayout[] = menuTemplate.pages.map((p) => ({
    nodes: p.nodes,
    subdivision: p.subdivision as PageLayout['subdivision'],
  }));

  const initialState: Partial<PrintLayoutState> = {
    dataModel,
    pages,
    pageWidth: menuTemplate.pageWidth,
    pageHeight: menuTemplate.pageHeight,
  };

  return (
    <div className="flex h-screen flex-col">
      <PrintLayoutEditor
        key={menuTemplate.id}
        initialState={initialState}
        onChange={handleChange}
        title={
          <nav className="flex items-center gap-1.5 text-sm">
            <Link to="/menu" className="text-gray-500 hover:text-indigo-600 transition">Menus</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-700">{menuTemplate.name}</span>
          </nav>
        }
        toolbar={
          <>
            {dirty && (
              <span className="text-xs text-amber-600">Unsaved changes</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Save failed' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                const w = window.open(`/menu-render-print/${id}`, '_blank');
                w?.addEventListener('load', () => {
                  setTimeout(() => w.print(), 300);
                });
              }}
              className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-900"
            >
              Print
            </button>
          </>
        }
      />
    </div>
  );
}
