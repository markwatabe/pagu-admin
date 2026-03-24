import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { gitCommitAndPush } from './git.js';

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

export async function executeToolCall(
  repoPath: string,
  toolName: string,
  input: Record<string, string>,
): Promise<string> {
  const ingredientsDir = path.join(repoPath, 'ingredients');

  switch (toolName) {
    case 'list_ingredients': {
      const files = await readdir(ingredientsDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
      return JSON.stringify(jsonFiles);
    }
    case 'read_ingredient': {
      const content = await readFile(
        path.join(ingredientsDir, `${input.id}.json`),
        'utf-8',
      );
      return content;
    }
    case 'write_ingredient': {
      const filePath = path.join(ingredientsDir, `${input.id}.json`);
      await writeFile(filePath, input.content, 'utf-8');
      await gitCommitAndPush(repoPath, `ingredients/${input.id}.json`, input.message);
      return `Successfully wrote ingredients/${input.id}.json and pushed to remote`;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
