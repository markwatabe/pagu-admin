import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Liquid } from 'liquidjs';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';
import { MM_TO_PX, subdivisionGrid } from '../components/print-layout/types';
import type { LayoutNode } from '../components/print-layout/types';
import type { DesignTokens } from '../components/print-layout/useDesignTokens';
import '../styles/menu-print.css';

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

interface MenuPageJson {
  nodes: LayoutNode[];
  subdivision: string;
}

interface MenuLayout {
  pageWidth: number;
  pageHeight: number;
  pages: MenuPageJson[];
}

interface MenuTemplate {
  id: string;
  name: string;
  layout: MenuLayout;
}

function PrintNode({ node, liquid, dataModel, zIndex }: { node: LayoutNode; liquid: Liquid; dataModel: Record<string, unknown>; zIndex?: number }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    const items = node.query ? dataModel[node.query] : null;

    async function render() {
      try {
        // QR code nodes render as inline SVG
        if (node.nodeType === 'qrcode') {
          if (node.src) {
            const QRCode = (await import('qrcode')).default;
            const svg = await QRCode.toString(node.src, { type: 'svg', margin: 0 });
            if (!cancelled) setHtml(`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${svg}</div>`);
          }
          return;
        }

        // Image nodes render as a simple <img> tag — no Liquid needed
        if (node.nodeType === 'image') {
          const result = node.src
            ? `<img src="${node.src}" style="width:100%;height:100%;object-fit:contain;" />`
            : '';
          if (!cancelled) setHtml(result);
          return;
        }

        let result: string;
        if (Array.isArray(items)) {
          const parts = await Promise.all(
            items.map((item: unknown) =>
              liquid.parseAndRender(node.template, { ...dataModel, item })
            )
          );
          result = parts.join('');
        } else {
          result = await liquid.parseAndRender(node.template, dataModel);
        }
        if (!cancelled) setHtml(result);
      } catch {
        // Silently skip render errors in print view
      }
    }

    render();
    return () => { cancelled = true; };
  }, [node.template, node.query, dataModel, liquid]);

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        zIndex,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
      }}
    >
      <div style={{ height: '100%', width: '100%', overflow: 'hidden', ...(node.style ?? {}) }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

export function MenuRenderPrintPage() {
  const { orgId, id } = useParams<{ orgId: string; id: string }>();
  const [menuTemplate, setMenuTemplate] = useState<MenuTemplate | null>(null);
  const [designTokens, setDesignTokens] = useState<DesignTokens>({});
  const [error, setError] = useState<string | null>(null);
  const liquid = useMemo(() => new Liquid(), []);

  const { isLoading, error: dbError, data } = db.useQuery({ dishes: {} });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/menus/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Menu not found' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setMenuTemplate)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    fetch('/api/design-tokens')
      .then(r => r.json())
      .then(setDesignTokens)
      .catch(() => setDesignTokens({}));
  }, []);

  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error}</div>;
  if (dbError) return <div style={{ padding: 32, color: 'red' }}>Error: {dbError.message}</div>;
  if (isLoading || !menuTemplate) return <Spinner />;

  const items = [...(data?.dishes ?? [])]
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

  const dataModel: Record<string, unknown> = {
    restaurant: { name: 'Pagu', subtitle: 'Japanese-Spanish Tapas' },
    all_menu_items: items,
    ...grouped,
  };

  const pageWidthPx = menuTemplate.layout.pageWidth * MM_TO_PX;
  const pageHeightPx = menuTemplate.layout.pageHeight * MM_TO_PX;

  return (
    <div style={{ margin: 0, fontFamily: "'Bryant Pro', sans-serif", background: 'white', color: 'black' }}>
      <style>{`
        @page { size: ${menuTemplate.layout.pageWidth}mm ${menuTemplate.layout.pageHeight}mm; margin: 0; }
        body { margin: 0; }
        @media screen {
          body { background: #e5e7eb; }
          .print-page { box-sizing: border-box; width: ${menuTemplate.layout.pageWidth}mm; max-width: calc(100vw - 32px); margin: 32px auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,.15); border: 1px solid #d1d5db; }
          .no-print { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 10; background: #f3f4f6; padding: 12px 32px; font-size: 13px; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { box-sizing: border-box; width: ${menuTemplate.layout.pageWidth}mm; height: ${menuTemplate.layout.pageHeight}mm; margin: 0; break-after: page; overflow: hidden; }
          img { display: block !important; visibility: visible !important; }
          .print-page:last-child { break-after: auto; }
        }
      `}</style>

      <div className="no-print">
        <span>
          Print preview &mdash; {menuTemplate.name} ({menuTemplate.layout.pages.length} {menuTemplate.layout.pages.length === 1 ? 'page' : 'pages'}) &nbsp;·&nbsp;
          <Link to={`/${orgId}/menu/${menuTemplate.id}`} style={{ color: '#4f46e5' }}>back to editor</Link>
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ background: 'black', color: 'white', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Print / Save as PDF
        </button>
      </div>

      {menuTemplate.layout.pages.map((page, pageIndex) => {
        const { cols, rows } = subdivisionGrid(page.subdivision as 'full' | 'cols2' | 'rows2' | 'grid4');
        const cellWidthPx = pageWidthPx / cols;
        const cellHeightPx = pageHeightPx / rows;

        return (
          <div
            key={pageIndex}
            className="print-page"
            style={{ ...designTokens, position: 'relative', width: pageWidthPx, height: pageHeightPx }}
          >
            {Array.from({ length: cols }, (_, col) =>
              Array.from({ length: rows }, (_, row) => {
                const offsetX = col * cellWidthPx;
                const offsetY = row * cellHeightPx;
                return page.nodes.map((node, nodeIndex) => (
                  <PrintNode
                    key={`${pageIndex}-${col}-${row}-${node.id}`}
                    node={{ ...node, x: node.x + offsetX, y: node.y + offsetY }}
                    liquid={liquid}
                    dataModel={dataModel}
                    zIndex={page.nodes.length - nodeIndex}
                  />
                ));
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
