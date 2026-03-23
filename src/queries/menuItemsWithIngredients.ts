import { db, MenuItem, MeasuredIngredient, Ingredient } from 'astro:db';

export type IngredientRow = {
  id: number;
  name: string;
  unit: string | null;
  amount: number | null;
  measuredUnit: string | null;
};

export type MenuItemWithIngredients = {
  id: number;
  name: string;
  description: string;
  section: string;
  price: number;
  available: boolean;
  ingredients: IngredientRow[];
};

export async function getMenuItemsWithIngredients(): Promise<MenuItemWithIngredients[]> {
  const [items, measured, ingredients] = await Promise.all([
    db.select().from(MenuItem).orderBy(MenuItem.section, MenuItem.name),
    db.select().from(MeasuredIngredient),
    db.select().from(Ingredient),
  ]);

  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));

  return items.map((item) => {
    const itemIngredients = measured
      .filter((m) => m.menuItemId === item.id)
      .map((m) => {
        const ing = ingredientById.get(m.ingredientId);
        if (!ing) return null;
        return {
          id:          ing.id,
          name:        ing.name,
          unit:        ing.unit,
          amount:      m.amount,
          measuredUnit: m.unit,
        };
      })
      .filter((i): i is IngredientRow => i !== null);

    return { ...item, ingredients: itemIngredients };
  });
}
