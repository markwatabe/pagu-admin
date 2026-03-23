import { Navigate, Outlet } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from './Spinner';

export function ProtectedLayout() {
  const { isLoading, user } = db.useAuth();

  // Query the app profile linked to the current auth user.
  // Pass null when there is no user to skip the query.
  const { isLoading: profileLoading, data } = db.useQuery(
    user ? { users: { $: { where: { '$users.id': user.id } } } } : null
  );
  const profile = data?.users?.[0];

  if (isLoading || (user && profileLoading)) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  // Profile row not found — sign out and send back to login
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.is_admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-gray-900">Access denied</p>
        <p className="text-sm text-gray-500">Your account does not have admin access.</p>
        <button
          type="button"
          onClick={() => db.auth.signOut()}
          className="rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Sign out
        </button>
      </div>
    );
  }

  return <Outlet />;
}
