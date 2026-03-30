import { init, id } from '@instantdb/admin';
import 'dotenv/config';

const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const APP_ID = process.env.VITE_INSTANT_APP_ID;

if (!ADMIN_TOKEN || !APP_ID) {
  console.error('Missing INSTANT_ADMIN_TOKEN or VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const ORG_ID = '77ff9e13-884b-4018-ab08-a57d900b24da';

function dayStart(daysAgo: number): number {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const EVENTS = [
  {
    name: 'Tanaka Anniversary Buyout',
    type: 'buyout',
    daysAgo: 12,
    revenue: 8500,
    guests: 45,
    notes: 'Full restaurant buyout, custom kaiseki menu',
  },
  {
    name: 'Tech Company Team Dinner',
    type: 'large_party',
    daysAgo: 10,
    revenue: 3200,
    guests: 22,
    notes: 'Reserved back room, omakase for all',
  },
  {
    name: 'Wedding Rehearsal Dinner',
    type: 'buyout',
    daysAgo: 7,
    revenue: 7200,
    guests: 38,
    notes: 'Full buyout, special sake pairing',
  },
  {
    name: 'Birthday Party - Kim',
    type: 'large_party',
    daysAgo: 5,
    revenue: 2800,
    guests: 16,
    notes: 'Private dining room, custom dessert course',
  },
  {
    name: 'Corporate Holiday Party',
    type: 'large_party',
    daysAgo: 3,
    revenue: 4100,
    guests: 28,
    notes: 'Cocktail hour + seated dinner, open bar',
  },
  {
    name: 'Charity Gala Dinner',
    type: 'buyout',
    daysAgo: 1,
    revenue: 9200,
    guests: 50,
    notes: 'Full buyout, 5-course menu with wine pairing',
  },
];

async function seed() {
  // Check for existing events
  const existing = await db.query({ events: {} });
  if (existing.events.length > 0) {
    console.log(`Already have ${existing.events.length} events, skipping.`);
    return;
  }

  const txs = EVENTS.flatMap((e) => {
    const eid = id();
    return [
      db.tx.events[eid].update({
        name: e.name,
        type: e.type,
        date: dayStart(e.daysAgo),
        revenue: e.revenue,
        guests: e.guests,
        notes: e.notes,
      }),
      db.tx.events[eid].link({ org: ORG_ID }),
    ];
  });

  await db.transact(txs);
  console.log(`Seeded ${EVENTS.length} events.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
