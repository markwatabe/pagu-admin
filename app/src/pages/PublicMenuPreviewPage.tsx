import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import '../styles/menu-print.css';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  section: string;
  price: number;
  photo: string | null;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function PublicMenuPreviewPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/menu-items')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error}</div>;
  if (!items) return <Spinner />;

  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div style={{ margin: 0, fontFamily: "'Bryant Pro', sans-serif", background: 'white', color: 'black', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px 96px' }}>
        <div className="page-header">
          <h1>Pagu</h1>
          <p>Japanese-Spanish Tapas</p>
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
