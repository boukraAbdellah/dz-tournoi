import { getRawDb, initDb, runMigrations, seedIfEmpty } from '@sport-competition/core';
import { ensureDataDir, dbPath } from '../config.ts';

ensureDataDir();
initDb(dbPath());
await runMigrations(getRawDb());
const seeded = await seedIfEmpty();
console.log(seeded ? 'Données de référence insérées.' : 'Données de référence déjà présentes.');
process.exit(0);