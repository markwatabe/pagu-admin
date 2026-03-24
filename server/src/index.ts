import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingredientRoutes } from './routes/ingredients.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoPath = path.resolve(__dirname, '..', '..', process.env.REPO_PATH ?? 'REPO');

const app = new Hono();

app.use('/api/*', cors({ origin: 'http://localhost:5173' }));
app.route('/api/ingredients', ingredientRoutes(repoPath));

const port = 3001;
console.log(`Server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
