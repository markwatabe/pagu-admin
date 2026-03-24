import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_TOOLS, executeToolCall } from '../lib/agent-tools.js';

const SYSTEM_PROMPT = `You are Pagu Assistant, an AI helper for the Pagu restaurant admin dashboard.
You help manage ingredients in the restaurant's database. You can list, read, and create/update ingredient files.
Each ingredient is a JSON file with fields: id, production_type, type, unit, and optionally ingredients (for recipes), instructions, directions, equipment.
Be concise and helpful. When creating ingredients, follow the existing JSON format.`;

const MAX_AGENT_ITERATIONS = 10;

export function chatRoutes(repoPath: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set — chat endpoint will fail');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const app = new Hono();

  app.post('/', async (c) => {
    // Auth check: require a token (frontend sends InstantDB user token)
    // TODO: Validate token against InstantDB in production
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let messages: Anthropic.MessageParam[];
    try {
      const body = await c.req.json<{ messages: Anthropic.MessageParam[] }>();
      messages = body.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        return c.json({ error: 'messages must be a non-empty array' }, 400);
      }
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    return streamSSE(c, async (stream) => {
      try {
        let currentMessages = [...messages];

        for (let i = 0; i < MAX_AGENT_ITERATIONS; i++) {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages: currentMessages,
          });

          // Send content blocks to the client
          for (const block of response.content) {
            if (block.type === 'text') {
              await stream.writeSSE({ data: JSON.stringify({ type: 'text', text: block.text }) });
            } else if (block.type === 'tool_use') {
              await stream.writeSSE({
                data: JSON.stringify({ type: 'tool_use', name: block.name, input: block.input }),
              });
            }
          }

          // If no tool use, we're done
          if (response.stop_reason !== 'tool_use') {
            await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) });
            return;
          }

          // Execute tool calls and continue the loop
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type === 'tool_use') {
              const result = await executeToolCall(
                repoPath,
                block.name,
                block.input as Record<string, string>,
              );
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });

              await stream.writeSSE({
                data: JSON.stringify({ type: 'tool_result', name: block.name, result }),
              });
            }
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ];
        }

        // Max iterations reached
        await stream.writeSSE({
          data: JSON.stringify({ type: 'error', message: 'Agent reached maximum iteration limit' }),
        });
      } catch (err) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'error',
            message: err instanceof Error ? err.message : 'Internal error',
          }),
        });
      }
    });
  });

  return app;
}
