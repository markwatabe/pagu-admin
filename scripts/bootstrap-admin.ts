import { init } from '@instantdb/admin';
import 'dotenv/config';

const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const APP_ID = process.env.VITE_INSTANT_APP_ID;

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/bootstrap-admin.ts <email>');
  process.exit(1);
}
if (!ADMIN_TOKEN || !APP_ID) {
  console.error('Missing INSTANT_ADMIN_TOKEN or VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function bootstrap() {
  // 1. Find the $users auth identity by email.
  // db.auth.getUser() throws if the user is not found — catch it explicitly.
  let authUser: { id: string };
  try {
    authUser = await db.auth.getUser({ email });
  } catch {
    console.error(`No $users record found for ${email}. Sign in first via the magic code flow.`);
    process.exit(1);
  }
  console.log(`Found $users record: ${authUser.id}`);

  // 2. Find the users profile record by email
  const result = await db.query({ users: { $: { where: { email } } } });
  const profile = result.users?.[0];
  if (!profile) {
    console.error(`No users profile found with email ${email}. Run the migration script first.`);
    process.exit(1);
  }
  console.log(`Found users profile: ${profile.id}`);

  // 3. Set is_admin and link $users → users.
  // The link must be established FROM the $users namespace (forward link direction).
  // The forward link name is 'users' (configured in the dashboard as $users.users).
  await db.transact([
    db.tx.users[profile.id].update({ is_admin: true }),
    db.tx['$users'][authUser.id].link({ users: profile.id }),
  ]);

  console.log(`Done. ${email} is now an admin.`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
