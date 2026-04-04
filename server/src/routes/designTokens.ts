import { Hono } from 'hono';
import { db } from '../lib/instantdb.js';

export function designTokenRoutes() {
  const app = new Hono();

  app.get('/', async (c) => {
    const { orgs } = await db.query({ orgs: {} });
    const org = orgs?.[0];
    return c.json(org?.designTokens ?? {});
  });

  app.put('/', async (c) => {
    const body = await c.req.json();
    const { orgs } = await db.query({ orgs: {} });
    const org = orgs?.[0];

    if (!org) {
      return c.json({ error: 'No org found' }, 404);
    }

    await db.transact([db.tx.orgs[org.id].update({ designTokens: body })]);
    return c.json({ ok: true });
  });

  return app;
}
