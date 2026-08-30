import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Applies all *.sql migration files in ./migrations, in filename order, once each. */
export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    (sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const apply = sqlite.transaction((name: string, body: string) => {
    try {
      sqlite.exec(body);
    } catch (e: any) {
      // Ignore harmless "already exists" errors (e.g. duplicate column from prior seed)
      if (e.code === 'SQLITE_ERROR' && (/already exists/.test(e.message) || /duplicate column/.test(e.message))) {
        console.log(`[migrate] skipped ${name} (${e.message})`);
      } else {
        throw e;
      }
    }
    sqlite.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
  });

  for (const file of files) {
    if (applied.has(file)) continue;
    const body = readFileSync(join(migrationsDir, file), 'utf8');
    apply(file, body);
    console.log(`[migrate] applied ${file}`);
  }
}