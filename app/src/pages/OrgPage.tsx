import { useState } from 'react';
import { id } from '@instantdb/react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { ClickToEdit } from '../components/ClickToEdit';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']);
const ROLE_OPTIONS = ['admin', 'editor', 'operator'] as const;

function isImage(path: string | undefined): boolean {
  if (!path) return false;
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.has(ext);
}

function LogoPicker({ org }: { org: { id: string; logo?: unknown } }) {
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const { data: filesData } = db.useQuery({ $files: {} });

  const imageFiles = (filesData?.$files ?? []).filter(f => isImage(f.path));
  const filtered = search
    ? imageFiles.filter(f =>
        (f.name ?? f.path ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : imageFiles;

  const logoRaw = org.logo;
  const logo = Array.isArray(logoRaw) ? logoRaw[0] : logoRaw;
  const logoUrl = logo && typeof logo === 'object' && 'url' in logo ? (logo as { url: string }).url : null;

  async function selectLogo(fileId: string) {
    await db.transact([db.tx.orgs[org.id].link({ logo: fileId })]);
    setPicking(false);
    setSearch('');
  }

  async function clearLogo() {
    if (logo && typeof logo === 'object' && 'id' in logo) {
      await db.transact([db.tx.orgs[org.id].unlink({ logo: (logo as { id: string }).id })]);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Logo</p>
      {logoUrl && !picking && (
        <div className="mb-3 flex items-center gap-3">
          <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg border border-gray-200 object-contain bg-gray-50" />
          <div className="flex gap-2">
            <button onClick={() => setPicking(true)} className="text-xs text-indigo-600 hover:text-indigo-800">Change</button>
            <button onClick={clearLogo} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>
        </div>
      )}
      {!logoUrl && !picking && (
        <button
          onClick={() => setPicking(true)}
          className="mb-3 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-xs text-gray-500 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          Select a logo from files
        </button>
      )}
      {picking && (
        <div className="mb-3 space-y-2">
          <input
            type="text"
            placeholder="Search images..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded border border-gray-200 px-2 py-1 text-xs placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto">
            {filtered.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => selectLogo(f.id)}
                className="rounded-lg border border-gray-200 p-1 transition hover:border-indigo-400"
              >
                <img src={f.url} alt="" className="h-12 w-full rounded object-contain" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-4 text-xs text-gray-400 italic">No images found</p>
            )}
          </div>
          <button onClick={() => { setPicking(false); setSearch(''); }} className="text-xs text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  editor: 'bg-blue-100 text-blue-700',
  operator: 'bg-green-100 text-green-700',
};

function MembersList({ orgId }: { orgId: string }) {
  const { data } = db.useQuery({
    orgs: {
      $: { where: { id: orgId } },
      roles: { user: {} },
    },
  });
  const { data: allUsersData } = db.useQuery({ $users: {} });

  const org = data?.orgs?.[0];
  const rolesRaw = org?.roles;
  const roles: Array<{ id: string; role: string; user: unknown }> =
    Array.isArray(rolesRaw) ? rolesRaw : rolesRaw ? [rolesRaw] : [];

  // Normalize user from each role (may be object or array)
  const memberships = roles.map(r => {
    const userRaw = r.user;
    const user = Array.isArray(userRaw) ? userRaw[0] : userRaw;
    return {
      roleId: r.id,
      role: r.role,
      user: user as { id: string; email?: string; avatarURL?: string; imageURL?: string } | null,
    };
  }).filter(m => m.user);

  const memberUserIds = new Set(memberships.map(m => m.user!.id));
  const allUsers = allUsersData?.$users ?? [];
  const nonMembers = allUsers.filter(u => !memberUserIds.has(u.id));

  async function addMember(userId: string, role: string) {
    const roleId = id();
    await db.transact([
      db.tx.orgRoles[roleId].update({ role, created_at: Date.now() }),
      db.tx.orgRoles[roleId].link({ org: orgId }),
      db.tx.orgRoles[roleId].link({ user: userId }),
    ]);
  }

  async function removeMember(roleId: string) {
    await db.transact([db.tx.orgRoles[roleId].delete()]);
  }

  async function changeRole(roleId: string, newRole: string) {
    await db.transact([db.tx.orgRoles[roleId].update({ role: newRole })]);
  }

  return (
    <div className="space-y-2">
      {memberships.length === 0 && (
        <p className="text-xs text-gray-400 italic">No members yet</p>
      )}
      {memberships.map(({ roleId, role, user }) => (
        <div key={roleId} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100">
            {(user!.avatarURL || user!.imageURL) ? (
              <img src={user!.avatarURL || user!.imageURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] font-semibold text-indigo-600">
                {(user!.email?.[0] ?? '?').toUpperCase()}
              </span>
            )}
          </div>
          <span className="flex-1 truncate text-sm text-gray-700">{user!.email}</span>
          <select
            value={role}
            onChange={e => changeRole(roleId, e.target.value)}
            className={`rounded-full px-2 py-0.5 text-xs font-semibold border-0 cursor-pointer ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => removeMember(roleId)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ))}

      {nonMembers.length > 0 && (
        <div className="pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Add member</p>
          <div className="flex flex-wrap gap-1">
            {nonMembers.map(u => (
              <button
                key={u.id}
                onClick={() => addMember(u.id, 'operator')}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition hover:border-indigo-400 hover:text-indigo-600"
              >
                + {u.email}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTable() {
  const { isLoading, error, data } = db.useQuery({ '$users': {} });

  if (isLoading) return <p className="text-gray-500">Loading users...</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  const users = [...(data?.['$users'] ?? [])].sort(
    (a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-6 py-4">Email</th>
            <th className="px-6 py-4">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((user) => (
            <tr key={user.id} className="transition hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100">
                    {(user.avatarURL || user.imageURL) ? (
                      <img src={user.avatarURL || user.imageURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-indigo-600">
                        {(user.email?.[0] ?? '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">{user.email}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-400">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrgCard({ org }: { org: Record<string, unknown> & { id: string; name: string } }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          <ClickToEdit
            value={org.name}
            onCommit={(newName) => db.transact([db.tx.orgs[org.id].update({ name: newName })])}
          />
        </h2>
      </div>

      <LogoPicker org={org} />

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Members</p>
        <MembersList orgId={org.id} />
      </div>
    </div>
  );
}

export function OrgPage() {
  const { orgId } = useParams();
  const { isLoading, data } = db.useQuery(
    orgId
      ? { orgs: { $: { where: { id: orgId } }, logo: {} } }
      : null,
  );

  const org = data?.orgs?.[0] as (Record<string, unknown> & { id: string; name: string }) | undefined;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Organization</h1>
        <p className="mt-1 text-gray-500">Manage your organization</p>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {!isLoading && !org && (
        <p className="text-gray-500">Organization not found.</p>
      )}

      {org && <OrgCard org={org} />}

      <div className="mt-12">
        <h2 className="mb-4 text-xl font-bold tracking-tight text-gray-900">All Users</h2>
        <UsersTable />
      </div>
    </section>
  );
}
