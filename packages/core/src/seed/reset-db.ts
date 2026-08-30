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
import { config, dbPath, ensureDataDir } from '../../../api/src/config.ts';

ensureDataDir();
initDb(dbPath());
runMigrations(getRawDb());

const db = getDb();

console.log('[reset-db] Truncating dynamic data...');
db.transaction((tx) => {
  tx.delete(matches).run();
  tx.delete(registrations).run();
  tx.delete(competitionCategories).run();
  tx.delete(competitions).run();
  tx.delete(athletes).run();
  tx.delete(clubs).run();
});

console.log('[reset-db] Ensuring reference data (wilayas, cities, templates)...');
seedIfEmpty();

console.log('[reset-db] Database is clean and ready for fresh seeding!');
process.exit(0);
