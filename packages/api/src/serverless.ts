import { initDb, runMigrations, seedIfEmpty } from '@sport-competition/core';
import { createApp } from './app.ts';

// Initialize DB synchronously so getDb() is always available immediately
try {
  initDb();
} catch (err) {
  console.error('[serverless] Failed to initDb():', err);
}

// Ensure migrations & seeds run asynchronously
runMigrations().catch((err) => console.warn('[serverless] migrations notice:', err?.message ?? err));
seedIfEmpty().catch((err) => console.warn('[serverless] seed notice:', err?.message ?? err));

const app = createApp();

export default app;
