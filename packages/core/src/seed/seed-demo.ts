#!/usr/bin/env node
// Standalone script to seed demo clubs + athletes.
// Usage: node packages/core/src/seed/seed-demo.ts
// Or:    npm run seed:demo (from root)

import { getDb, getRawDb, initDb } from '../db/connection.ts';
import { runMigrations } from '../db/migrate.ts';
import { count } from 'drizzle-orm';
import { clubs, athletes } from '../db/schema.ts';
import { seedClubs, seedAthletes } from './runner.ts';
import { config, dbPath, ensureDataDir } from '../../../api/src/config.ts';

ensureDataDir();
initDb(dbPath());
runMigrations(getRawDb());

const clubCount = getDb().select({ n: count() }).from(clubs).get()?.n ?? 0;
const athleteCount = getDb().select({ n: count() }).from(athletes).get()?.n ?? 0;

if (clubCount > 0 || athleteCount > 0) {
  console.log(`[seed:demo] DB already has ${clubCount} clubs + ${athleteCount} athletes — skipping.`);
  console.log('[seed:demo] Delete data/app.db first if you want a fresh seed.');
  process.exit(0);
}

seedClubs();
seedAthletes();
console.log('[seed:demo] Done.');
