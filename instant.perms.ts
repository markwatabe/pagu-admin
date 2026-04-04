import type { InstantRules } from "@instantdb/react";

const rules = {
  $files: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  $users: {
    allow: {
      view: "true",
      update: "auth.id == data.id",
    },
  },
  orgs: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  events: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  orgRoles: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  components: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  recipes: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  skus: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  dishes: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  menus: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  componentInstances: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  productionRecords: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  dishInstances: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  reviews: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
} satisfies InstantRules;

export default rules;
