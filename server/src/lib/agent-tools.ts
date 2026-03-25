import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { gitCommit } from './git.js';

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'list_ingredients',
    description: 'List all ingredient files in the database',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_ingredient',
    description: 'Read the full JSON content of a specific ingredient file',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Ingredient ID (e.g., APPLE_CORED_PEELED)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'write_ingredient',
    description: 'Create or update an ingredient JSON file and commit it to the repository',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Ingredient ID (e.g., NEW_INGREDIENT)' },
        content: { type: 'string', description: 'Full JSON content for the ingredient file' },
        message: { type: 'string', description: 'Git commit message describing the change' },
      },
      required: ['id', 'content', 'message'],
    },
  },
];

function sanitizeId(id: string): string {
  const cleaned = path.basename(id).replace(/\.json$/, '');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new Error(`Invalid ingredient ID: ${id}`);
  }
  return cleaned;
}

export async function executeToolCall(
  repoPath: string,
  toolName: string,
  input: Record<string, string>,
): Promise<string> {
  const ingredientsDir = path.join(repoPath, 'ingredients');

  switch (toolName) {
    case 'list_ingredients': {
      try {
        const files = await readdir(ingredientsDir);
        const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
        return JSON.stringify(jsonFiles);
      } catch (err) {
        return `Error listing ingredients: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'read_ingredient': {
      try {
        const safeId = sanitizeId(input.id);
        const content = await readFile(
          path.join(ingredientsDir, `${safeId}.json`),
          'utf-8',
        );
        return content;
      } catch (err) {
        return `Error reading ingredient ${input.id}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'write_ingredient': {
      try {
        const safeId = sanitizeId(input.id);
        const filePath = path.join(ingredientsDir, `${safeId}.json`);
        await writeFile(filePath, input.content, 'utf-8');
        await gitCommit(repoPath, `ingredients/${safeId}.json`, input.message);
        return `Successfully wrote ingredients/${safeId}.json and committed`;
      } catch (err) {
        return `Error writing ingredient ${input.id}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
