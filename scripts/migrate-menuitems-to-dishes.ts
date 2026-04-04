import { init } from '@instantdb/admin';
import 'dotenv/config';

const db = init({ appId: process.env.VITE_INSTANT_APP_ID!, adminToken: process.env.INSTANT_ADMIN_TOKEN! });

async function migrate() {
  const { menuItems } = await db.query({ menuItems: { photo: {} } });
  if (!menuItems?.length) {
    console.log('No menuItems to migrate.');
    return;
  }

  console.log(`Migrating ${menuItems.length} menuItems to dishes...`);

  // Check existing dishes to avoid duplicates
  const { dishes: existingDishes } = await db.query({ dishes: {} });
  const existingNames = new Set((existingDishes ?? []).map((d) => d.name));

  let created = 0;
  let skipped = 0;

  for (const item of menuItems) {
    if (existingNames.has(item.name)) {
      console.log(`  Skipping "${item.name}" — dish already exists`);
      skipped++;
      continue;
    }

    const txns: any[] = [
      db.tx.dishes[item.id].update({
        name: item.name ?? '',
        description: item.description ?? null,
        price: item.price ?? null,
        section: item.section ?? null,
        available: item.available ?? true,
        instructions: null,
      }),
    ];

    // Migrate photo link
    const photo = Array.isArray(item.photo) ? item.photo[0] : item.photo;
    if (photo?.id) {
      txns.push(db.tx.dishes[item.id].link({ photo: photo.id }));
    }

    await db.transact(txns);
    console.log(`  Created dish "${item.name}"`);
    created++;
  }

  // Now delete old menuItems
  console.log(`\nDeleting ${menuItems.length} old menuItems...`);
  const deleteTxns = menuItems.map((mi: any) => db.tx.menuItems[mi.id].delete());
  await db.transact(deleteTxns);

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Deleted menuItems: ${menuItems.length}`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
