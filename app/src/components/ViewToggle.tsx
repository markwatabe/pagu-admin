import { useSearchParams } from 'react-router-dom';

export type View = 'table' | 'cards';

export function useViewToggle(): [View, (v: View) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: View = searchParams.get('view') === 'cards' ? 'cards' : 'table';
  const setView = (v: View) => setSearchParams({ view: v }, { replace: true });
  return [view, setView];
}

export function ViewToggle({ view, onChangeView }: { view: View; onChangeView: (v: View) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        onClick={() => onChangeView('table')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === 'table' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="inline h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        onClick={() => onChangeView('cards')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === 'cards' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="inline h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
    </div>
  );
}
