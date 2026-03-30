import { Navigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Spinner } from './Spinner';

export function OrgRedirect() {
  const { user } = db.useAuth();
  const { isLoading, data } = db.useQuery(
    user ? { $users: { $: { where: { id: user.id } }, orgRoles: { org: {} } } } : null,
  );

  if (isLoading) return <Spinner />;

  const orgRolesRaw = data?.$users?.[0]?.orgRoles;
  const orgRoles: Array<{ org: unknown }> =
    Array.isArray(orgRolesRaw) ? orgRolesRaw : orgRolesRaw ? [orgRolesRaw] : [];

  // Find first org
  for (const role of orgRoles) {
    const orgRaw = role.org;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    if (org && typeof org === 'object' && 'id' in org) {
      return <Navigate to={`/${(org as { id: string }).id}`} replace />;
    }
  }

  return <NoOrgPage />;
}

function NoOrgPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg font-semibold text-gray-900">No organization</p>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        You are not a member of any organization. Ask an admin to add you to one.
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
