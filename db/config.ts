import { defineDb, defineTable, column } from 'astro:db';

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    email: column.text(),
    role: column.text(), // 'Owner' | 'Manager' | 'Staff'
    active: column.boolean({ default: true }),
    createdAt: column.date(),
  },
});

const MenuItem = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    description: column.text(),
    section: column.text(), // 'Starters' | 'Mains' | 'Desserts'
    price: column.number(), // in cents
    available: column.boolean({ default: true }),
  },
});

const Review = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    author: column.text(),
    rating: column.number(), // 1–5
    body: column.text(),
    source: column.text(), // 'Google' | 'Yelp' | 'In-app'
    replied: column.boolean({ default: false }),
    createdAt: column.date(),
  },
});

const Ingredient = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    unit: column.text({ optional: true }),
  },
});

const MeasuredIngredient = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    menuItemId: column.number({ references: () => MenuItem.columns.id, optional: true }),
    outputIngredientId: column.number({ references: () => Ingredient.columns.id, optional: true }),
    ingredientId: column.number({ references: () => Ingredient.columns.id }),
    amount: column.number({ optional: true }),
    unit: column.text({ optional: true }),
  },
});

export default defineDb({ tables: { User, MenuItem, Review, Ingredient, MeasuredIngredient } });
