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

  // Profile row not found — user is authenticated but has no app profile yet.
  // Redirecting to /login would cause an empty-page loop (LoginPage returns null
  // when a user is already signed in). Show an actionable message instead.
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-gray-900">Account not set up</p>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Your account exists but has no admin profile linked to it.
          Run <code className="bg-gray-100 px-1 rounded">pnpm dlx tsx scripts/bootstrap-admin.ts &lt;your-email&gt;</code> to finish setup.
        </p>
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
