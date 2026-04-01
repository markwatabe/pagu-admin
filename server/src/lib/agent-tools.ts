import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { gitCommit } from './git.js';
import { getRecipe, listAllRecipes, resolveRecipeDir } from './recipes.js';

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'list_recipes',
    description: 'List all recipe/ingredient files in the database',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_recipe',
    description: 'Read the full JSON content of a specific recipe/ingredient file',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Recipe ID (e.g., APPLE_CORED_PEELED)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'write_recipe',
    description: 'Create or update a recipe JSON file and commit it to the repository',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Recipe ID (e.g., NEW_RECIPE)' },
        content: { type: 'string', description: 'Full JSON content for the recipe file' },
        message: { type: 'string', description: 'Git commit message describing the change' },
      },
      required: ['id', 'content', 'message'],
    },
  },
];

function sanitizeId(id: string): string {
  const cleaned = path.basename(id).replace(/\.json$/, '');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new Error(`Invalid recipe ID: ${id}`);
  }
  return cleaned;
}

export async function executeToolCall(
  repoPath: string,
  toolName: string,
  input: Record<string, string>,
): Promise<string> {
  switch (toolName) {
    case 'list_recipes': {
      try {
        const jsonFiles = await listAllRecipes(repoPath);
        return JSON.stringify(jsonFiles);
      } catch (err) {
        return `Error listing recipes: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'read_recipe': {
      try {
        const safeId = sanitizeId(input.id);
        const data = await getRecipe(repoPath, safeId);
        if (!data) return `Recipe not found: ${safeId}`;
        return JSON.stringify(data, null, 2);
      } catch (err) {
        return `Error reading recipe ${input.id}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'write_recipe': {
      try {
        const safeId = sanitizeId(input.id);
        const dir = await resolveRecipeDir(repoPath, safeId);
        const filePath = path.join(dir, `${safeId}.json`);
        const relPath = path.relative(repoPath, filePath);
        await writeFile(filePath, input.content, 'utf-8');
        await gitCommit(repoPath, relPath, input.message);
        return `Successfully wrote ${relPath} and committed`;
      } catch (err) {
        return `Error writing recipe ${input.id}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
