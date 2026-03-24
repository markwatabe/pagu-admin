import 'dotenv/config';

const APP_ID = process.env.VITE_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;

async function check() {
  const resp = await fetch(`https://api.instantdb.com/admin/schema`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      'app-id': APP_ID,
    },
  });
  const schema = await resp.json();

  // Show all refs involving measuredIngredients or ingredients
  const refs = schema.schema.refs;
  for (const [key, ref] of Object.entries(refs)) {
    const r = ref as any;
    if (key.includes('measuredIngredient') || key.includes('ingredient') || key.includes('outputIngredient')) {
      console.log(`\n${key}:`);
      console.log(`  forward: ${r['forward-identity'][1]}.${r['forward-identity'][2]}`);
      console.log(`  reverse: ${r['reverse-identity'][1]}.${r['reverse-identity'][2]}`);
      console.log(`  cardinality: ${r['cardinality']}`);
    }
  }

  // Also show all namespace (table) names
  const attrs = schema.schema.attrs;
  const namespaces = new Set<string>();
  for (const attr of Object.values(attrs) as any[]) {
    if (attr['forward-identity']) {
      namespaces.add(attr['forward-identity'][1]);
    }
  }
  console.log('\n\nAll namespaces:', [...namespaces].sort().join(', '));
}

check().catch(console.error);
