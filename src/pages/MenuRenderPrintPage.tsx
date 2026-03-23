import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';
import '../styles/menu-print.css';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function MenuRenderPrintPage() {
  const { isLoading, error, data } = db.useQuery({ menuItems: {} });

  if (isLoading) return <Spinner />;
  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error.message}</div>;

  const items = [...(data?.menuItems ?? [])]
    .filter((i) => i.available)
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || (a.name ?? '').localeCompare(b.name ?? ''));
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div style={{ margin: 0, fontFamily: "'Bryant Pro', sans-serif", background: 'white', color: 'black' }}>
      <style>{`
        @page { size: A4; margin: 0; }
        body { margin: 0; }
        @media screen {
          body { background: #e5e7eb; }
          .print-page { box-sizing: border-box; width: 210mm; max-width: calc(100vw - 32px); padding: 20mm 18mm; margin: 32px auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,.15); border: 1px solid #d1d5db; }
          .no-print { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 10; background: #f3f4f6; padding: 12px 32px; font-size: 13px; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { box-sizing: border-box; width: 210mm; height: 297mm; margin: 0; padding: 20mm 18mm; break-after: page; overflow: hidden; }
          .print-page:last-child { break-after: auto; }
        }
      `}</style>

      <div className="no-print">
        <span>
          Print preview &mdash;{' '}
          <Link to="/menu-render" style={{ color: '#4f46e5' }}>back to screen version</Link>
          &nbsp;·&nbsp;
          <Link to="/menu-preview" style={{ color: '#4f46e5' }}>visual preview</Link>
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: 'black', color: 'white', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="print-page">
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
        <div className="page-footer">
          Prices include applicable taxes. Menu subject to change.
        </div>
      </div>
    </div>
  );
}
