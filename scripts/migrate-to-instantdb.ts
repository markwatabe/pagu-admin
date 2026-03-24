import { init } from '@instantdb/admin';
import { v5 as uuidv5 } from 'uuid';
import 'dotenv/config';

const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const APP_ID = process.env.VITE_INSTANT_APP_ID;

if (!ADMIN_TOKEN || !APP_ID) {
  console.error('Missing INSTANT_ADMIN_TOKEN or VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// ── Helpers ───────────────────────────────────────────────────────────────────

// InstantDB requires valid UUID v4-format entity IDs.
// We use UUID v5 (deterministic, based on a fixed namespace + key) so that
// re-running the script is safe — the same input always produces the same UUID.
const SEED_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID v5 namespace (URL)

function seedId(prefix: string, numericId: number): string {
  return uuidv5(`${prefix}:${numericId}`, SEED_NAMESPACE);
}

// ── Data ──────────────────────────────────────────────────────────────────────

const ingredients = [
  { id: 1,  name: 'lime' },
  { id: 2,  name: 'garlic' },
  { id: 3,  name: 'tamari' },
  { id: 4,  name: 'fish sauce' },
  { id: 5,  name: 'thai chili' },
  { id: 6,  name: 'pickled daikon' },
  { id: 7,  name: 'aji amarillo' },
  { id: 8,  name: 'ginger' },
  { id: 9,  name: 'maple' },
  { id: 10, name: 'arugula' },
  { id: 11, name: 'yuzu' },
  { id: 12, name: 'blood orange' },
  { id: 13, name: 'PAGU granola' },
  { id: 14, name: 'sherry vinegar' },
  { id: 15, name: 'cilantro' },
  { id: 16, name: 'sesame' },
  { id: 17, name: 'tomato' },
  { id: 18, name: 'picual olive oil' },
  { id: 19, name: 'pan de cristal' },
  { id: 20, name: 'anchovies' },
  { id: 21, name: 'vinegar' },
  { id: 22, name: 'togarashi' },
  { id: 23, name: 'thai chili alioli' },
  { id: 24, name: 'mojo verde' },
  { id: 25, name: 'thai chili hot sauce' },
  { id: 26, name: 'alioli' },
  { id: 27, name: 'pickled red onion' },
  { id: 28, name: "za'atar" },
  { id: 29, name: 'feta' },
  { id: 30, name: 'pickled cucumbers' },
  { id: 31, name: 'candied seeds' },
  { id: 32, name: 'pickled papaya' },
  { id: 33, name: 'thai basil alioli' },
  { id: 34, name: 'garlic-ginger marinade' },
  { id: 35, name: 'fried thai basil' },
  { id: 36, name: 'caramelized onion sauce' },
  { id: 37, name: "za'atar fries" },
  { id: 38, name: 'piquillo pepper' },
  { id: 39, name: 'pea puree' },
  { id: 40, name: 'koji corn' },
  { id: 41, name: 'woodear mushroom' },
  { id: 42, name: 'bao' },
  { id: 43, name: 'hot sauce' },
  { id: 44, name: 'romesco' },
  { id: 45, name: 'pickles' },
  { id: 46, name: 'kimchi' },
  { id: 47, name: 'cranberry hoisin' },
  { id: 48, name: 'seasoned nori' },
  { id: 49, name: 'sushi rice' },
  { id: 50, name: 'furikake' },
  { id: 51, name: 'citrus' },
  { id: 52, name: 'tamari lime sauce' },
  { id: 53, name: 'shiso' },
  { id: 54, name: 'pork' },
  { id: 55, name: 'mushrooms' },
  { id: 56, name: 'chili crisp' },
  { id: 57, name: 'scallions' },
  { id: 58, name: 'fried shallots' },
  { id: 59, name: 'soy egg' },
  { id: 60, name: 'pork belly' },
  { id: 61, name: 'nori' },
  { id: 62, name: 'ramen noodles' },
  { id: 63, name: 'shrimp' },
  { id: 64, name: 'coconut milk' },
  { id: 65, name: 'herbs' },
  { id: 66, name: 'sofrito' },
  { id: 67, name: 'turmeric' },
  { id: 68, name: 'peas' },
  { id: 69, name: 'green beans' },
  { id: 70, name: 'squash' },
  { id: 71, name: 'herb alioli' },
  { id: 72, name: 'confit duck leg' },
  { id: 73, name: 'shiitake' },
  { id: 74, name: 'sichuan peppercorn' },
  { id: 75, name: 'cornmeal' },
  { id: 76, name: 'dark chocolate' },
  { id: 77, name: 'maine blueberry sauce' },
  { id: 78, name: 'dark chocolate mousse' },
  { id: 79, name: 'coffee' },
  { id: 80, name: 'cacao nibs' },
  { id: 81, name: 'coconut' },
  { id: 82, name: 'passionfruit caramel' },
  { id: 83, name: 'jamón ibérico de bellota' },
];

const menuItems = [
  { id: 1,  name: 'Japanese Hamachi Crudo',          description: 'lime, garlic, tamari, fish sauce, thai chili',                                              section: 'Chilled',        price: 1800, available: true },
  { id: 2,  name: 'Tuna Tartare',                    description: 'pickled daikon, aji amarillo, ginger, maple',                                               section: 'Chilled',        price: 2000, available: true },
  { id: 3,  name: 'Roasted Beet & Burrata Salad',    description: 'arugula, yuzu, blood orange, PAGU granola',                                                 section: 'Chilled',        price: 1500, available: true },
  { id: 4,  name: 'Chilled Japanese Eggplant',       description: 'tamari, sherry vinegar, cilantro, sesame',                                                  section: 'Chilled',        price: 1100, available: true },
  { id: 5,  name: 'Aljomar Jamón Ibérico de Bellota',description: 'acorn-fed, 36-48 month aged spanish ham',                                                   section: 'Tapas',          price: 1700, available: true },
  { id: 6,  name: 'Pan Con Tomate',                  description: 'tomato, garlic, picual olive oil, pan de cristal',                                          section: 'Tapas',          price:  800, available: true },
  { id: 7,  name: 'Boquerones',                      description: 'anchovies, vinegar, togarashi, picual olive oil',                                           section: 'Tapas',          price:  800, available: true },
  { id: 8,  name: 'Patatas Bravas',                  description: 'thai chili alioli, mojo verde',                                                             section: 'Tapas',          price: 1200, available: true },
  { id: 9,  name: 'Tempura String Beans',            description: 'thai chili hot sauce, alioli, togarashi, sesame',                                           section: 'Tapas',          price: 1400, available: true },
  { id: 10, name: 'Black Cod Croquetas',             description: 'thai chili alioli, togarashi, pickled red onion',                                           section: 'Tapas',          price: 1500, available: true },
  { id: 11, name: 'Shio Koji Roasted Corn',          description: "za'atar, feta, alioli, lime, togarashi",                                                    section: 'Tapas',          price: 1400, available: true },
  { id: 12, name: 'Braised Pork Belly Bao',          description: 'pickled cucumbers, candied seeds',                                                          section: 'Baos',           price: 1600, available: true },
  { id: 13, name: 'Green Pea Bao',                   description: 'pickled papaya, thai basil alioli',                                                         section: 'Baos',           price: 1500, available: true },
  { id: 14, name: 'Chicken Karaage',                 description: 'garlic-ginger marinade, fried thai basil, thai chili alioli',                               section: 'Land & Sea',     price: 1800, available: true },
  { id: 15, name: 'Koji Marinated 8oz Mishima Wagyu Striploin', description: "caramelized onion sauce, za'atar fries, piquillo peppers",                       section: 'Land & Sea',     price: 5800, available: true },
  { id: 16, name: 'Miso Roasted Black Cod',          description: 'pea puree, koji corn, woodear mushroom',                                                    section: 'Land & Sea',     price: 3600, available: true },
  { id: 17, name: 'Suckling Pig',                    description: 'bao, hot sauce, romesco, pickles, kimchi, cranberry hoisin',                                section: 'Land & Sea',     price: 7200, available: true },
  { id: 18, name: 'Roasted Local Tuna Collar',       description: 'seasoned nori, sushi rice, furikake, pickled red onion, citrus, tamari lime sauce, shiso',  section: 'Land & Sea',     price: 9800, available: true },
  { id: 19, name: 'Spicy Knife Cut Noodles',         description: 'pork or mushrooms, sherry vinegar, chili crisp, scallions, fried shallots',                 section: 'Noodles & Rice', price: 1900, available: true },
  { id: 20, name: "2011 Guchi's Midnight Ramen",     description: 'soy egg, pork belly, chili crisp, scallions, nori',                                         section: 'Noodles & Rice', price: 1800, available: true },
  { id: 21, name: 'Green Crab Laksa',                description: 'ramen noodles, shrimp, coconut milk, chili crisp, fried shallots, herbs',                   section: 'Noodles & Rice', price: 2400, available: true },
  { id: 22, name: 'Veggie Paella',                   description: 'sofrito, turmeric, piquillo pepper, peas, mushrooms, green beans, squash, herb alioli',     section: 'Noodles & Rice', price: 1800, available: true },
  { id: 23, name: 'Duck Paella',                     description: 'confit duck leg, shiitake, sofrito, peas, sichuan peppercorn',                              section: 'Noodles & Rice', price: 3300, available: true },
  { id: 24, name: 'Matcha Cookie',                   description: 'cornmeal, dark chocolate',                                                                  section: 'Sweet',          price:  300, available: true },
  { id: 25, name: 'Yuzu Basque Burnt Cheesecake',    description: 'maine blueberry sauce',                                                                     section: 'Sweet',          price: 1400, available: true },
  { id: 26, name: 'Dark Chocolate Cake',             description: 'dark chocolate mousse, coffee, cacao nibs',                                                 section: 'Sweet',          price: 1300, available: true },
  { id: 27, name: 'Ube Panna Cotta',                 description: 'coconut, passionfruit caramel',                                                             section: 'Sweet',          price: 1200, available: true },
];

const reviews = [
  { id: 1, author: 'James L.',  rating: 5, body: "Absolutely incredible ramen. Best I've had outside of Japan. Will be back every week!", source: 'Google',  replied: true,  createdAt: '2025-11-02' },
  { id: 2, author: 'Sara M.',   rating: 4, body: 'Great food, cozy atmosphere. The gyoza were perfect. Service was a bit slow but worth the wait.', source: 'Yelp', replied: false, createdAt: '2025-11-15' },
  { id: 3, author: 'Kevin R.',  rating: 2, body: 'Waited 40 minutes and my order came out wrong. Food was okay once fixed but disappointing experience.', source: 'Google', replied: false, createdAt: '2025-12-01' },
  { id: 4, author: 'Priya S.',  rating: 5, body: 'The matcha ice cream is a must. Everything was fresh and beautifully presented.', source: 'In-app', replied: true,  createdAt: '2025-12-10' },
  { id: 5, author: 'Tom W.',    rating: 3, body: 'Decent place, nothing extraordinary. The curry was a bit bland for my taste but the portions were generous.', source: 'Yelp', replied: false, createdAt: '2026-01-08' },
  { id: 6, author: 'Mia C.',    rating: 5, body: 'My new favourite spot. The salmon teriyaki was cooked to perfection and the staff were so friendly.', source: 'Google', replied: true,  createdAt: '2026-01-22' },
  { id: 7, author: 'Luca F.',   rating: 1, body: 'Found a hair in my food. Staff apologised but the whole experience was ruined. Not returning.', source: 'In-app', replied: true,  createdAt: '2026-02-03' },
  { id: 8, author: 'Hana Y.',   rating: 5, body: 'Authentic flavours and lovely vibes. The mochi platter was a perfect end to the meal!', source: 'In-app', replied: false, createdAt: '2026-02-18' },
];


// measuredIngredients: [{ id, menuItemId, ingredientId }]
const measuredIngredients = [
  { id:   1, menuItemId:  1, ingredientId:  1 }, { id:   2, menuItemId:  1, ingredientId:  2 },
  { id:   3, menuItemId:  1, ingredientId:  3 }, { id:   4, menuItemId:  1, ingredientId:  4 },
  { id:   5, menuItemId:  1, ingredientId:  5 }, { id:   6, menuItemId:  2, ingredientId:  6 },
  { id:   7, menuItemId:  2, ingredientId:  7 }, { id:   8, menuItemId:  2, ingredientId:  8 },
  { id:   9, menuItemId:  2, ingredientId:  9 }, { id:  10, menuItemId:  3, ingredientId: 10 },
  { id:  11, menuItemId:  3, ingredientId: 11 }, { id:  12, menuItemId:  3, ingredientId: 12 },
  { id:  13, menuItemId:  3, ingredientId: 13 }, { id:  14, menuItemId:  4, ingredientId:  3 },
  { id:  15, menuItemId:  4, ingredientId: 14 }, { id:  16, menuItemId:  4, ingredientId: 15 },
  { id:  17, menuItemId:  4, ingredientId: 16 }, { id:  18, menuItemId:  5, ingredientId: 83 },
  { id:  19, menuItemId:  6, ingredientId: 17 }, { id:  20, menuItemId:  6, ingredientId:  2 },
  { id:  21, menuItemId:  6, ingredientId: 18 }, { id:  22, menuItemId:  6, ingredientId: 19 },
  { id:  23, menuItemId:  7, ingredientId: 20 }, { id:  24, menuItemId:  7, ingredientId: 21 },
  { id:  25, menuItemId:  7, ingredientId: 22 }, { id:  26, menuItemId:  7, ingredientId: 18 },
  { id:  27, menuItemId:  8, ingredientId: 23 }, { id:  28, menuItemId:  8, ingredientId: 24 },
  { id:  29, menuItemId:  9, ingredientId: 25 }, { id:  30, menuItemId:  9, ingredientId: 26 },
  { id:  31, menuItemId:  9, ingredientId: 22 }, { id:  32, menuItemId:  9, ingredientId: 16 },
  { id:  33, menuItemId: 10, ingredientId: 23 }, { id:  34, menuItemId: 10, ingredientId: 22 },
  { id:  35, menuItemId: 10, ingredientId: 27 }, { id:  36, menuItemId: 11, ingredientId: 28 },
  { id:  37, menuItemId: 11, ingredientId: 29 }, { id:  38, menuItemId: 11, ingredientId: 26 },
  { id:  39, menuItemId: 11, ingredientId:  1 }, { id:  40, menuItemId: 11, ingredientId: 22 },
  { id:  41, menuItemId: 12, ingredientId: 30 }, { id:  42, menuItemId: 12, ingredientId: 31 },
  { id:  43, menuItemId: 13, ingredientId: 32 }, { id:  44, menuItemId: 13, ingredientId: 33 },
  { id:  45, menuItemId: 14, ingredientId: 34 }, { id:  46, menuItemId: 14, ingredientId: 35 },
  { id:  47, menuItemId: 14, ingredientId: 23 }, { id:  48, menuItemId: 15, ingredientId: 36 },
  { id:  49, menuItemId: 15, ingredientId: 37 }, { id:  50, menuItemId: 15, ingredientId: 38 },
  { id:  51, menuItemId: 16, ingredientId: 39 }, { id:  52, menuItemId: 16, ingredientId: 40 },
  { id:  53, menuItemId: 16, ingredientId: 41 }, { id:  54, menuItemId: 17, ingredientId: 42 },
  { id:  55, menuItemId: 17, ingredientId: 43 }, { id:  56, menuItemId: 17, ingredientId: 44 },
  { id:  57, menuItemId: 17, ingredientId: 45 }, { id:  58, menuItemId: 17, ingredientId: 46 },
  { id:  59, menuItemId: 17, ingredientId: 47 }, { id:  60, menuItemId: 18, ingredientId: 48 },
  { id:  61, menuItemId: 18, ingredientId: 49 }, { id:  62, menuItemId: 18, ingredientId: 50 },
  { id:  63, menuItemId: 18, ingredientId: 27 }, { id:  64, menuItemId: 18, ingredientId: 51 },
  { id:  65, menuItemId: 18, ingredientId: 52 }, { id:  66, menuItemId: 18, ingredientId: 53 },
  { id:  67, menuItemId: 19, ingredientId: 54 }, { id:  68, menuItemId: 19, ingredientId: 55 },
  { id:  69, menuItemId: 19, ingredientId: 14 }, { id:  70, menuItemId: 19, ingredientId: 56 },
  { id:  71, menuItemId: 19, ingredientId: 57 }, { id:  72, menuItemId: 19, ingredientId: 58 },
  { id:  73, menuItemId: 20, ingredientId: 59 }, { id:  74, menuItemId: 20, ingredientId: 60 },
  { id:  75, menuItemId: 20, ingredientId: 56 }, { id:  76, menuItemId: 20, ingredientId: 57 },
  { id:  77, menuItemId: 20, ingredientId: 61 }, { id:  78, menuItemId: 21, ingredientId: 62 },
  { id:  79, menuItemId: 21, ingredientId: 63 }, { id:  80, menuItemId: 21, ingredientId: 64 },
  { id:  81, menuItemId: 21, ingredientId: 56 }, { id:  82, menuItemId: 21, ingredientId: 58 },
  { id:  83, menuItemId: 21, ingredientId: 65 }, { id:  84, menuItemId: 22, ingredientId: 66 },
  { id:  85, menuItemId: 22, ingredientId: 67 }, { id:  86, menuItemId: 22, ingredientId: 38 },
  { id:  87, menuItemId: 22, ingredientId: 68 }, { id:  88, menuItemId: 22, ingredientId: 55 },
  { id:  89, menuItemId: 22, ingredientId: 69 }, { id:  90, menuItemId: 22, ingredientId: 70 },
  { id:  91, menuItemId: 22, ingredientId: 71 }, { id:  92, menuItemId: 23, ingredientId: 72 },
  { id:  93, menuItemId: 23, ingredientId: 73 }, { id:  94, menuItemId: 23, ingredientId: 66 },
  { id:  95, menuItemId: 23, ingredientId: 68 }, { id:  96, menuItemId: 23, ingredientId: 74 },
  { id:  97, menuItemId: 24, ingredientId: 75 }, { id:  98, menuItemId: 24, ingredientId: 76 },
  { id:  99, menuItemId: 25, ingredientId: 77 }, { id: 100, menuItemId: 26, ingredientId: 78 },
  { id: 101, menuItemId: 26, ingredientId: 79 }, { id: 102, menuItemId: 26, ingredientId: 80 },
  { id: 103, menuItemId: 27, ingredientId: 81 }, { id: 104, menuItemId: 27, ingredientId: 82 },
];

// ── Migration ─────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('Migrating ingredients…');
  await db.transact(
    ingredients.map((ing) =>
      db.tx.ingredients[seedId('ing', ing.id)].update({ name: ing.name })
    )
  );

  console.log('Migrating menuItems…');
  await db.transact(
    menuItems.map((item) =>
      db.tx.menuItems[seedId('menu', item.id)].update({
        name: item.name,
        description: item.description,
        section: item.section,
        price: item.price,
        available: item.available,
      })
    )
  );

  console.log('Migrating reviews…');
  await db.transact(
    reviews.map((r) =>
      db.tx.reviews[seedId('rev', r.id)].update({
        author: r.author,
        rating: r.rating,
        body: r.body,
        source: r.source,
        replied: r.replied,
        createdAt: r.createdAt,
      })
    )
  );

  console.log('Migrating measuredIngredients + links…');
  await db.transact(
    measuredIngredients.flatMap((mi) => [
      db.tx.measuredIngredients[seedId('mi', mi.id)].update({}),
      db.tx.measuredIngredients[seedId('mi', mi.id)].link({
        menuItem: seedId('menu', mi.menuItemId),
        ingredient: seedId('ing', mi.ingredientId),
      }),
    ])
  );

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
