#!/usr/bin/env node
// Reset the database: clears tournament & master data while preserving reference data.
// Usage: npm run db:reset

import { getDb, getRawDb, initDb } from '../db/connection.ts';
import { runMigrations } from '../db/migrate.ts';
import {
  matches,
  registrations,
  competitionCategories,
  competitions,
  athletes,
  clubs,
} from '../db/schema.ts';
import { seedIfEmpty } from './runner.ts';
import { dbPath, ensureDataDir } from '../../../api/src/config.ts';

ensureDataDir();
initDb(dbPath());
await runMigrations(getRawDb());

const db = getDb();

console.log('[reset-db] Truncating dynamic data...');
await db.transaction(async (tx) => {
  await tx.delete(matches).run();
  await tx.delete(registrations).run();
  await tx.delete(competitionCategories).run();
  await tx.delete(competitions).run();
  await tx.delete(athletes).run();
  await tx.delete(clubs).run();
});

console.log('[reset-db] Ensuring reference data (wilayas, cities, templates)...');
await seedIfEmpty();

console.log('[reset-db] Database is clean and ready for fresh seeding!');
process.exit(0);
