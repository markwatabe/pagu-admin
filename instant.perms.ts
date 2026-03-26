import type { InstantRules } from "@instantdb/react";

const rules = {
  $files: {
    allow: {
      "view": "true",
      "create": "true",
      "update": "true",
      "delete": "true",
    },
  },
  $users: {
    allow: {
      "view": "true",
      "update": "auth.id == data.id",
    },
  },
  orgs: {
    allow: {
      "view": "true",
      "create": "true",
      "update": "true",
      "delete": "true",
    },
  },
  orgRoles: {
    allow: {
      "view": "true",
      "create": "true",
      "update": "true",
      "delete": "true",
    },
  },
} satisfies InstantRules;

export default rules;
