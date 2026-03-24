import { Link, Outlet, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';

export function AppLayout() {
  const navigate = useNavigate();

  function handleSignOut() {
    db.auth.signOut();
    navigate('/login');
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-indigo-600">
            Pagu
          </Link>
          <ul className="flex items-center gap-8 text-sm font-medium text-gray-600">
            <li>
              <Link to="/menu-builder" className="transition hover:text-indigo-600">
                Menu Builder
              </Link>
            </li>
            <li>
              <Link to="/users" className="transition hover:text-indigo-600">
                Users
              </Link>
            </li>
            <li>
              <Link to="/reviews" className="transition hover:text-indigo-600">
                Reviews
              </Link>
            </li>
            <li>
              <Link to="/layout-editor" className="transition hover:text-indigo-600">
                Layout Editor
              </Link>
            </li>
          </ul>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            Sign out
          </button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Pagu Admin</p>
        </div>
      </footer>
    </>
  );
}
