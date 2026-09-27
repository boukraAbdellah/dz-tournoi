import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

// Auto-load .env if present in Node environment
try {
  (process as any).loadEnvFile?.();
} catch {
  // ignore if .env does not exist
}

let _db: LibSQLDatabase<typeof schema> | undefined;
let _client: Client | undefined;

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) throw new Error('Database not initialised. Call initDb() first.');
  return _db;
}

export function getClient(): Client {
  if (!_client) throw new Error('Database not initialised. Call initDb() first.');
  return _client;
}

// Backward compatibility alias
export function getRawDb(): Client {
  return getClient();
}

export function initDb(optionsOrPath?: string | { url?: string; authToken?: string }): LibSQLDatabase<typeof schema> {
  let url: string;
  let authToken: string | undefined;

  const envUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  const envToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

  // Cloud environment variables take priority over default local file path
  if (envUrl) {
    url = envUrl;
    authToken = envToken;
  } else if (typeof optionsOrPath === 'string') {
    url = optionsOrPath.startsWith('file:') || optionsOrPath.startsWith('http') || optionsOrPath.startsWith('libsql:')
      ? optionsOrPath
      : `file:${optionsOrPath.replace(/\\/g, '/')}`;
  } else if (optionsOrPath && typeof optionsOrPath === 'object') {
    url = optionsOrPath.url ?? (process.env.VERCEL ? 'file:/tmp/sport.db' : 'file:data/sport.db');
    authToken = optionsOrPath.authToken;
  } else {
    url = process.env.VERCEL ? 'file:/tmp/sport.db' : 'file:data/sport.db';
    if (process.env.VERCEL) {
      console.warn('[db] WARNING: TURSO_DATABASE_URL environment variable is not defined in Vercel! Falling back to /tmp/sport.db');
    }
  }

  const isCloud = url.startsWith('libsql:') || url.startsWith('http');
  if (isCloud) {
    console.log(`[db] Connected to Turso Cloud: ${url.replace(/:[^@]+@/, ':***@')}`);
  }

  const client = createClient({
    url,
    authToken,
  });

  _client = client;
  _db = drizzle(client, { schema });
  return _db;
}