import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

function defaultDataDir(): string {
  // Keep data next to the app source when running from a checkout,
  // otherwise under the user home dir.
  const here = dirname(fileURLToPath(import.meta.url));
  if (here.includes('packages\\api') || here.includes('packages/api')) {
    return join(here, '..', '..', '..', 'data');
  }
  return join(homedir(), '.sport-competition');
}

export const config = {
  port: Number(process.env.PORT ?? 5175),
  host: process.env.HOST ?? '127.0.0.1',
  dataDir: process.env.DATA_DIR ?? defaultDataDir(),
  staticDir: process.env.STATIC_DIR ?? join(defaultDataDir(), 'static'),
  openBrowser: (process.env.OPEN_BROWSER ?? '1') !== '0',
};

export function ensureDataDir(): void {
  if (!existsSync(config.dataDir)) mkdirSync(config.dataDir, { recursive: true });
  if (!existsSync(config.staticDir)) mkdirSync(config.staticDir, { recursive: true });
}

export function dbPath(): string {
  return join(config.dataDir, 'app.db');
}