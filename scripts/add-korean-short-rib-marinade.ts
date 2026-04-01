import { init, id } from '@instantdb/admin';
import 'dotenv/config';

const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const APP_ID = process.env.VITE_INSTANT_APP_ID;

if (!ADMIN_TOKEN || !APP_ID) {
  console.error('Missing INSTANT_ADMIN_TOKEN or VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function run() {
  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log('Cleaning up previous attempts…');
  const existing = await db.query({
    recipes: {},
    measuredIngredients: {},
  });

  // Delete all measured ingredients that have an amount (these are from our previous runs)
  const orphanedMIs = existing.measuredIngredients.filter(
    (mi: any) => mi.amount != null
  );
  if (orphanedMIs.length > 0) {
    await db.transact(
      orphanedMIs.map((mi: any) => db.tx.measuredIngredients[mi.id].delete())
    );
    console.log(`  Deleted ${orphanedMIs.length} orphaned measured ingredients`);
  }

  // Delete ingredients from previous attempts
  const namesToClean = new Set([
    'korean short rib marinade',
    'sake', 'soy sauce', 'mirin', 'organic cane sugar', 'rice vinegar',
    'garlic, minced', 'ginger, peeled and minced', 'scallion', 'sesame oil',
  ]);
  const dupeIngs = existing.recipes.filter((i: any) =>
    namesToClean.has(i.name)
  );
  if (dupeIngs.length > 0) {
    await db.transact(
      dupeIngs.map((i: any) => db.tx.recipes[i.id].delete())
    );
    console.log(`  Deleted ${dupeIngs.length} duplicate ingredients`);
  }

  // ── Create ingredients ─────────────────────────────────────────────────────
  const marinadeId = id();
  const subs = [
    { name: 'sake',                       amount: 200, unit: 'gram', ingId: id() },
    { name: 'soy sauce',                  amount: 200, unit: 'gram', ingId: id() },
    { name: 'mirin',                      amount: 100, unit: 'gram', ingId: id() },
    { name: 'organic cane sugar',          amount: 100, unit: 'gram', ingId: id() },
    { name: 'rice vinegar',                amount: 100, unit: 'gram', ingId: id() },
    { name: 'garlic, minced',              amount: 40,  unit: 'gram', ingId: id() },
    { name: 'ginger, peeled and minced',   amount: 20,  unit: 'gram', ingId: id() },
    { name: 'scallion',                    amount: 20,  unit: 'gram', ingId: id() },
    { name: 'sesame oil',                  amount: 10,  unit: 'gram', ingId: id() },
  ];

  console.log(`\nCreating marinade ingredient (${marinadeId})…`);
  await db.transact([
    db.tx.recipes[marinadeId].update({ name: 'korean short rib marinade' }),
    ...subs.map((s) => db.tx.recipes[s.ingId].update({ name: s.name })),
  ]);

  // ── Create measured ingredients with links ─────────────────────────────────
  // - `ingredient` link → the source ingredient (sake, etc.)
  // - `source_ingredient` link → the output ingredient (marinade)
  //   (source_ingredient is the pre-existing link that targets the `ingredients` namespace)
  console.log('Creating measured ingredients with links…');
  for (const sub of subs) {
    const miId = id();
    await db.transact([
      db.tx.measuredIngredients[miId].update({
        amount: sub.amount,
        unit: sub.unit,
      }),
      db.tx.measuredIngredients[miId].link({
        ingredient: sub.ingId,
        source_ingredient: marinadeId,
      }),
    ]);
    console.log(`  ${sub.amount}g ${sub.name}`);
  }

  // ── Verify ─────────────────────────────────────────────────────────────────
  console.log('\nVerifying…');

  // Query the marinade ingredient and follow the reverse source_ingredient link
  const result = await db.query({
    recipes: {
      $: { where: { id: marinadeId } },
      measuredIngredients: { ingredient: {} },
    },
  });

  const marinade = result.recipes[0] as any;
  console.log(`Marinade: ${marinade?.name} (${marinade?.id})`);
  const recipe = marinade?.measuredIngredients ?? [];
  console.log(`Recipe has ${recipe.length} measured ingredients:`);
  for (const mi of recipe) {
    console.log(`  ${mi.amount}g ${mi.unit} → ingredient link present: ${mi.ingredient?.length > 0}`);
  }

  console.log('\nDone!');
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
