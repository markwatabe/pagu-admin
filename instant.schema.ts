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
      name: i.string().optional(),
      created_at: i.number().optional(),
      width: i.number().optional(),
      height: i.number().optional(),
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
      avatarURL: i.string().optional(),
      is_admin: i.boolean().optional(),
      created_at: i.number().optional(),
      type: i.string().optional(),
    }),
    recipes: i.entity({
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
    orgs: i.entity({
      name: i.string(),
      created_at: i.number().optional(),
    }),
    orgRoles: i.entity({
      role: i.string(), // 'admin' | 'editor' | 'operator'
      created_at: i.number().optional(),
    }),
    events: i.entity({
      name: i.string(),
      type: i.string(), // 'buyout' | 'large_party'
      date: i.number(), // epoch ms, start of day
      revenue: i.number(),
      guests: i.number(),
      notes: i.string().optional(),
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
    $filesUploadedBy: {
      forward: {
        on: "$files",
        has: "one",
        label: "uploadedBy",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "$files",
      },
    },
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
    orgRolesOrg: {
      forward: {
        on: "orgRoles",
        has: "one",
        label: "org",
      },
      reverse: {
        on: "orgs",
        has: "many",
        label: "roles",
      },
    },
    orgRolesUser: {
      forward: {
        on: "orgRoles",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "orgRoles",
      },
    },
    orgsLogo: {
      forward: {
        on: "orgs",
        has: "one",
        label: "logo",
      },
      reverse: {
        on: "$files",
        has: "many",
        label: "logoForOrgs",
      },
    },
    eventsOrg: {
      forward: {
        on: "events",
        has: "one",
        label: "org",
      },
      reverse: {
        on: "orgs",
        has: "many",
        label: "events",
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
        on: "recipes",
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
