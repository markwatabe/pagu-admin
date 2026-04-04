import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Spreadsheet } from '../components/Spreadsheet';
import { Spinner } from '../components/Spinner';

interface Recipe {
  id: string;
  name: string;
  type?: string | null;
  allergen: boolean;
  hasRecipe: boolean;
}

const columns: ColumnDef<Recipe>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    size: 280,
    cell: ({ getValue }) => (
      <span className="font-medium text-gray-900">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    size: 160,
    cell: ({ getValue }) => (
      <span className="text-gray-500">{getValue<string>() ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'allergen',
    header: 'Allergen',
    size: 110,
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          Yes
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    accessorKey: 'hasRecipe',
    header: 'Has Recipe',
    size: 120,
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          Yes
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
];

export function TableTestPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((recipes) => {
        setData(recipes);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="flex h-screen flex-col">
      <Spreadsheet
        data={data}
        columns={columns}
        searchPlaceholder="Search recipes..."
        onRowClick={(recipe) => navigate(`/${orgId}/recipe/${recipe.id}`)}
      />
    </div>
  );
}
