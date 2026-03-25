import { db } from '../lib/db';
import { Spinner } from '../components/Spinner';

export function UsersPage() {
  const { isLoading, error, data } = db.useQuery({ '$users': {} });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const users = [...(data?.['$users'] ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Users</h1>
          <p className="mt-1 text-gray-500">{users.length} team members</p>
        </div>
        <button className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          + Invite user
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="transition hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={[
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    user.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600',
                  ].join(' ')}>
                    {user.is_admin ? 'Admin' : 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
