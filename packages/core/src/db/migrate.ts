import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Client } from '@libsql/client';
import { getClient } from './connection.ts';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Applies all *.sql migration files in ./migrations, in filename order, once each. */
export async function runMigrations(client?: Client): Promise<void> {
  const c = client ?? getClient();
  await c.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedResult = await c.execute('SELECT name FROM _migrations');
  const applied = new Set(appliedResult.rows.map((r) => String(r.name)));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const body = readFileSync(join(migrationsDir, file), 'utf8');
    try {
      await c.executeMultiple(body);
    } catch (e: any) {
      // Ignore harmless "already exists" errors (e.g. duplicate column from prior seed)
      if (/already exists/i.test(e.message) || /duplicate column/i.test(e.message)) {
        console.log(`[migrate] skipped ${file} (${e.message})`);
      } else {
        throw e;
      }
    }
    await c.execute({
      sql: 'INSERT INTO _migrations (name) VALUES (?)',
      args: [file],
    });
    console.log(`[migrate] applied ${file}`);
  }
}