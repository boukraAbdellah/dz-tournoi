import { exec } from 'node:child_process';
import { getRawDb, initDb, runMigrations, seedIfEmpty } from '@sport-competition/core';
import { config, dbPath, ensureDataDir } from './config.ts';
import { createApp } from './app.ts';

try {
  (process as any).loadEnvFile?.();
} catch {
  // ignore
}

ensureDataDir();

initDb(dbPath());
await runMigrations(getRawDb());
await seedIfEmpty();

const app = createApp();
app.listen(config.port, config.host, () => {
  const url = `http://${config.host}:${config.port}`;
  console.log(`\n  Sport Competition — API en écoute sur ${url}\n`);
  if (config.openBrowser) openBrowser(url);
});

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn('Impossible d’ouvrir le navigateur:', err.message);
  });
}