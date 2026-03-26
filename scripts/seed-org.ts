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
  // Check if PAGU org already exists
  const existing = await db.query({ orgs: { $: { where: { name: 'PAGU' } } } });
  if (existing.orgs.length > 0) {
    console.log(`PAGU org already exists: ${existing.orgs[0].id}`);
    return;
  }

  const orgId = id();
  await db.transact([
    db.tx.orgs[orgId].update({
      name: 'PAGU',
      created_at: Date.now(),
    }),
  ]);

  console.log(`Created PAGU org: ${orgId}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
