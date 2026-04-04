// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/admin";

const _schema = i.schema({
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
    // -- Master Data --
    components: i.entity({
      name: i.string(),
      type: i.string().optional(),
      allergen: i.boolean().optional(),
    }),
    recipes: i.entity({
      name: i.string(),
      ingredients: i.json<{ qty: number; unit: string; componentId: string }[]>().optional(),
      instructions: i.json<string[]>().optional(),
      equipment: i.json<string[]>().optional(),
    }),
    skus: i.entity({
      name: i.string(),
      url: i.string().optional(),
      asin: i.string().optional(),
      brand: i.string().optional(),
      quantity: i.number().optional(),
      unit: i.string().optional(),
      dimensions: i.string().optional(),
      upc: i.string().optional(),
      manufacturer: i.string().optional(),
      prices: i.json<{ price: number; date: string; rating?: number; reviewCount?: number; isPrime?: boolean; availability?: string; delivery?: string }[]>().optional(),
    }),
    dishes: i.entity({
      name: i.string(),
      description: i.string().optional(),
      price: i.number().optional(),
      section: i.string().optional(),
      available: i.boolean().optional(),
      instructions: i.json<string[]>().optional(),
    }),
    menus: i.entity({
      name: i.string(),
      layout: i.json<unknown>().optional(),
    }),
    orgs: i.entity({
      name: i.string(),
      created_at: i.number().optional(),
      designTokens: i.json<Record<string, string>>().optional(),
    }),
    orgRoles: i.entity({
      role: i.string(),
      created_at: i.number().optional(),
    }),
    events: i.entity({
      name: i.string(),
      type: i.string(),
      date: i.number(),
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
    // -- Execution Data (stubs) --
    componentInstances: i.entity({
      created_at: i.number().optional(),
    }),
    productionRecords: i.entity({
      created_at: i.number().optional(),
    }),
    dishInstances: i.entity({
      created_at: i.number().optional(),
    }),
  },
  links: {
    // -- System links --
    $filesUploadedBy: {
      forward: { on: "$files", has: "one", label: "uploadedBy" },
      reverse: { on: "$users", has: "many", label: "$files" },
    },
    $streams$files: {
      forward: { on: "$streams", has: "many", label: "$files" },
      reverse: { on: "$files", has: "one", label: "$stream", onDelete: "cascade" },
    },
    $usersLinkedPrimaryUser: {
      forward: { on: "$users", has: "one", label: "linkedPrimaryUser", onDelete: "cascade" },
      reverse: { on: "$users", has: "many", label: "linkedGuestUsers" },
    },
    // -- Org links --
    orgRolesOrg: {
      forward: { on: "orgRoles", has: "one", label: "org" },
      reverse: { on: "orgs", has: "many", label: "roles" },
    },
    orgRolesUser: {
      forward: { on: "orgRoles", has: "one", label: "user" },
      reverse: { on: "$users", has: "many", label: "orgRoles" },
    },
    orgsLogo: {
      forward: { on: "orgs", has: "one", label: "logo" },
      reverse: { on: "$files", has: "many", label: "logoForOrgs" },
    },
    eventsOrg: {
      forward: { on: "events", has: "one", label: "org" },
      reverse: { on: "orgs", has: "many", label: "events" },
    },
    // -- Master Data links --
    recipesComponent: {
      forward: { on: "recipes", has: "one", label: "component" },
      reverse: { on: "components", has: "many", label: "recipes" },
    },
    skusComponent: {
      forward: { on: "skus", has: "one", label: "component" },
      reverse: { on: "components", has: "many", label: "skus" },
    },
    dishesComponents: {
      forward: { on: "dishes", has: "many", label: "components" },
      reverse: { on: "components", has: "many", label: "dishes" },
    },
    menusDishes: {
      forward: { on: "menus", has: "many", label: "dishes" },
      reverse: { on: "dishes", has: "many", label: "menus" },
    },
    dishesPhoto: {
      forward: { on: "dishes", has: "one", label: "photo" },
      reverse: { on: "$files", has: "many", label: "dishPhotos" },
    },
    // -- Execution Data links --
    componentInstancesComponent: {
      forward: { on: "componentInstances", has: "one", label: "component" },
      reverse: { on: "components", has: "many", label: "instances" },
    },
    componentInstancesSku: {
      forward: { on: "componentInstances", has: "one", label: "sku" },
      reverse: { on: "skus", has: "many", label: "instances" },
    },
    componentInstancesProductionRecord: {
      forward: { on: "componentInstances", has: "one", label: "productionRecord" },
      reverse: { on: "productionRecords", has: "one", label: "componentInstance" },
    },
    dishInstancesDish: {
      forward: { on: "dishInstances", has: "one", label: "dish" },
      reverse: { on: "dishes", has: "many", label: "instances" },
    },
    dishInstancesComponentInstances: {
      forward: { on: "dishInstances", has: "many", label: "componentInstances" },
      reverse: { on: "componentInstances", has: "many", label: "dishInstances" },
    },
  },
  rooms: {},
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
