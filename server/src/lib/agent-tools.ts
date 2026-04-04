import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { db } from './instantdb.js';
import { id as instantId } from '@instantdb/admin';

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'list_components',
    description: 'List all components (ingredients and recipe items) in the database',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_component',
    description: 'Read a component with its recipes and SKUs',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Component UUID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_component',
    description: 'Create a new component with an optional recipe',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Component name' },
        type: { type: 'string', description: 'Component type (e.g. sauce, protein, nut)' },
        allergen: { type: 'boolean', description: 'Whether this is a common allergen' },
        recipe: {
          type: 'object',
          description: 'Optional recipe for this component',
          properties: {
            name: { type: 'string' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  qty: { type: 'number' },
                  unit: { type: 'string' },
                  componentId: { type: 'string' },
                },
              },
            },
            instructions: { type: 'array', items: { type: 'string' } },
            equipment: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['name'],
    },
  },
];

export async function executeToolCall(
  toolName: string,
  input: Record<string, any>,
): Promise<string> {
  switch (toolName) {
    case 'list_components': {
      const { components } = await db.query({ components: { recipes: {} } });
      return JSON.stringify(
        (components ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          hasRecipe: Array.isArray(c.recipes) && c.recipes.length > 0,
        }))
      );
    }
    case 'read_component': {
      const { components } = await db.query({
        components: { $: { where: { id: input.id } }, recipes: {}, skus: {} },
      });
      const comp = components?.[0];
      if (!comp) return `Component not found: ${input.id}`;
      return JSON.stringify(comp, null, 2);
    }
    case 'create_component': {
      const compId = instantId();
      const txns: any[] = [
        db.tx.components[compId].update({
          name: input.name,
          type: input.type ?? null,
          allergen: input.allergen ?? false,
        }),
      ];

      if (input.recipe) {
        const recipeId = instantId();
        txns.push(
          db.tx.recipes[recipeId].update({
            name: input.recipe.name ?? input.name,
            ingredients: input.recipe.ingredients ?? [],
            instructions: input.recipe.instructions ?? [],
            equipment: input.recipe.equipment ?? [],
          }),
          db.tx.recipes[recipeId].link({ component: compId }),
        );
      }

      await db.transact(txns);
      return JSON.stringify({ ok: true, id: compId });
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
