import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.ts';

let _db: BetterSQLite3Database<typeof schema> | undefined;
let _sqlite: Database.Database | undefined;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) throw new Error('Database not initialised. Call initDb() first.');
  return _db;
}

export function getRawDb(): Database.Database {
  if (!_sqlite) throw new Error('Database not initialised. Call initDb() first.');
  return _sqlite;
}

export function initDb(dbPath: string): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  _sqlite = sqlite;
  _db = drizzle(sqlite, { schema });
  return _db;
}