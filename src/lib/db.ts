import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID as string;

if (!APP_ID) {
  throw new Error('VITE_INSTANT_APP_ID is not set. Add it to your .env file.');
}

export const db = init({ appId: APP_ID });
