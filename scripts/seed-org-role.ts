import { init, id } from '@instantdb/admin';
import 'dotenv/config';

const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const APP_ID = process.env.VITE_INSTANT_APP_ID;

if (!ADMIN_TOKEN || !APP_ID) {
  console.error('Missing INSTANT_ADMIN_TOKEN or VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function seed() {
  const res = await db.query({ $users: {}, orgs: {} });

  const users = res.$users;
  const orgs = res.orgs;

  if (users.length === 0) {
    console.error('No users found');
    process.exit(1);
  }
  if (orgs.length === 0) {
    console.error('No orgs found');
    process.exit(1);
  }

  const user = users[0];
  const org = orgs[0];

  console.log(`User: ${user.email} (${user.id})`);
  console.log(`Org: ${org.name} (${org.id})`);

  // Check if role already exists
  const existing = await db.query({ orgRoles: { user: {}, org: {} } });
  const alreadyLinked = existing.orgRoles.some(
    (r: { user: unknown; org: unknown }) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const o = Array.isArray(r.org) ? r.org[0] : r.org;
      return u?.id === user.id && o?.id === org.id;
    }
  );

  if (alreadyLinked) {
    console.log('Role already exists, skipping.');
    return;
  }

  const roleId = id();
  await db.transact([
    db.tx.orgRoles[roleId].update({ role: 'admin', created_at: Date.now() }),
    db.tx.orgRoles[roleId].link({ org: org.id }),
    db.tx.orgRoles[roleId].link({ user: user.id }),
  ]);

  console.log(`Created admin role: ${roleId} linking ${user.email} to ${org.name}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
