import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { recipeRoutes } from './routes/recipes.js';
import { dishRoutes } from './routes/dishes.js';
import { menuRoutes } from './routes/menus.js';
import { designTokenRoutes } from './routes/designTokens.js';
import { chatRoutes } from './routes/chat.js';
import { skuRoutes } from './routes/skus.js';
import { publicMenuRoutes } from './routes/publicMenu.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = new Hono();

if (!isProduction) {
  app.use('/api/*', cors({ origin: 'http://localhost:5173' }));
}

app.route('/api/recipes', recipeRoutes());
app.route('/api/dishes', dishRoutes());
app.route('/api/menus', menuRoutes());
app.route('/api/design-tokens', designTokenRoutes());
app.route('/api/chat', chatRoutes());
app.route('/api/skus', skuRoutes());
app.route('/api/public', publicMenuRoutes());

// In production, serve the built frontend
if (isProduction) {
  const distPath = path.resolve(__dirname, '..', '..', 'app', 'dist');
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), distPath) + '/' }));
  // SPA fallback: serve index.html for non-API, non-static routes
  app.get('*', async (c) => {
    const html = await readFile(path.join(distPath, 'index.html'), 'utf-8');
    return c.html(html);
  });
}

const port = parseInt(process.env.PORT ?? '3001', 10);
console.log(`Server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
