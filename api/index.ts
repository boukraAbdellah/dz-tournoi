import { initDb, runMigrations, seedIfEmpty } from '@sport-competition/core';
import { createApp } from '../packages/api/src/app.ts';

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      initDb();
      try {
        await runMigrations();
        await seedIfEmpty();
      } catch (err) {
        console.error('[serverless] Initialization error/warning:', err);
      }
      initialized = true;
    })();
  }
  await initPromise;
}

const app = createApp();

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  return app(req, res);
}
