import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';
import '../styles/menu-print.css';

const PAGE_W = 794;
const PAGE_H = 1123;

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuPreviewPage() {
  const { isLoading, error, data } = db.useQuery({ dishes: {} });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function applyScale() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const wraps = canvas.querySelectorAll<HTMLElement>('[data-page]');
      const available = canvas.clientWidth - 96;
      const scale = Math.min(1, available / PAGE_W);
      const scaledW = Math.round(PAGE_W * scale);
      const scaledH = Math.round(PAGE_H * scale);
      wraps.forEach((wrap) => {
        const page = wrap.querySelector<HTMLElement>('.page');
        if (!page) return;
        wrap.style.width = `${scaledW}px`;
        wrap.style.height = `${scaledH}px`;
        page.style.transform = `scale(${scale})`;
      });
    }
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, [data]);

  if (isLoading) return <Spinner />;
  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error.message}</div>;

  const items = [...(data?.dishes ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? ''));
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div style={{ margin: 0, fontFamily: "'Bryant Pro', sans-serif", background: '#2a2a2a' }}>
      <style>{`
        #toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #1a1a1a; color: #aaa; padding: 12px 24px; font-size: 13px; border-bottom: 1px solid #444; }
        #canvas  { display: flex; flex-wrap: wrap; justify-content: center; gap: 40px; padding: 48px 24px 80px; }
        .page-wrap { position: relative; flex-shrink: 0; }
        .page { position: absolute; top: 0; left: 0; width: ${PAGE_W}px; height: ${PAGE_H}px; background: white; box-shadow: 0 8px 40px rgba(0,0,0,.55); border: 1px solid #555; box-sizing: border-box; padding: 76px 68px; overflow: hidden; transform-origin: top left; color: black; }
        .page-footer-abs { position: absolute; bottom: 76px; left: 68px; right: 68px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; font-size: 11px; color: #9ca3af; }
        .page-num { position: absolute; bottom: 28px; right: 68px; font-size: 11px; color: #d1d5db; }
      `}</style>

      <div id="toolbar">
        <span>
          Menu preview &mdash;{' '}
          <Link to="/menu-render-print" style={{ color: '#818cf8' }}>open print page</Link>
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/menu-render" style={{ display: 'inline-block', background: 'white', color: 'black', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Screen version
          </Link>
          <button
            type="button"
            onClick={() => window.open('/menu-render-print')}
            style={{ background: 'white', color: 'black', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Print / PDF
          </button>
        </div>
      </div>

      <div id="canvas" ref={canvasRef}>
        <div className="page-wrap" data-page>
          <div className="page">
            <div className="page-header">
              <h1>Pagu</h1>
              <p>Restaurant Menu</p>
            </div>
            {sections.map((section) => (
              <div key={section} className="menu-section">
                <h2>{section}</h2>
                <ul>
                  {items.filter((i) => i.section === section).map((item) => (
                    <li key={item.id} className="menu-item">
                      <div className="menu-item-left">
                        <div className="menu-item-name-row">
                          <span className="menu-item-name">{item.name}</span>
                          <span className="leader" />
                        </div>
                        {item.description && <p className="menu-item-desc">{item.description}</p>}
                      </div>
                      <span className="menu-item-price">{formatPrice(item.price ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="page-footer-abs">
              Prices include applicable taxes. Menu subject to change.
            </div>
            <span className="page-num">1 / 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
