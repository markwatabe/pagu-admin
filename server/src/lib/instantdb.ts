import { init } from '@instantdb/admin';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from repo root (server runs from server/ subdirectory)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const appId = process.env.VITE_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_ADMIN_TOKEN;

if (!appId || !adminToken) {
  throw new Error('VITE_INSTANT_APP_ID and INSTANT_ADMIN_TOKEN must be set in .env');
}

export const db = init({ appId, adminToken });
