// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/admin";

const _schema = i.schema({
  // We inferred 13 attributes!
  // Take a look at this schema, and if everything looks good,
  // run `push schema` again to enforce the types.
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      is_admin: i.boolean().optional(),
      created_at: i.number().optional(),
      type: i.string().optional(),
    }),
    ingredients: i.entity({
      name: i.string().optional(),
    }),
    measuredIngredients: i.entity({
      amount: i.number(),
      unit: i.string(),
    }),
    menuItems: i.entity({
      available: i.boolean().optional(),
      description: i.string().optional(),
      name: i.string().optional(),
      price: i.number().optional(),
      section: i.string().optional(),
    }),
    reviews: i.entity({
      author: i.string().optional(),
      body: i.string().optional(),
      createdAt: i.string().optional(),
      rating: i.number().optional(),
      replied: i.boolean().optional(),
      source: i.string().optional(),
    }),
  },
  links: {
    $streams$files: {
      forward: {
        on: "$streams",
        has: "many",
        label: "$files",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "$stream",
        onDelete: "cascade",
      },
    },
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    measuredIngredientsIngredient: {
      forward: {
        on: "measuredIngredients",
        has: "many",
        label: "ingredient",
      },
      reverse: {
        on: "ingredient",
        has: "many",
        label: "measuredIngredients",
      },
    },
    measuredIngredientsMenuItem: {
      forward: {
        on: "measuredIngredients",
        has: "many",
        label: "menuItem",
      },
      reverse: {
        on: "menuItem",
        has: "many",
        label: "measuredIngredients",
      },
    },
    measuredIngredientsOutputIngredient: {
      forward: {
        on: "measuredIngredients",
        has: "many",
        label: "outputIngredient",
      },
      reverse: {
        on: "outputIngredient",
        has: "many",
        label: "measuredIngredients",
      },
    },
    measuredIngredientsSource_ingredient: {
      forward: {
        on: "measuredIngredients",
        has: "one",
        label: "source_ingredient",
      },
      reverse: {
        on: "ingredients",
        has: "many",
        label: "measuredIngredients",
      },
    },
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
