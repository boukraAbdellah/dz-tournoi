import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.ts';
import { referenceRouter } from './routes/reference.ts';
import { clubsRouter } from './routes/clubs.ts';
import { athletesRouter } from './routes/athletes.ts';
import { statsRouter } from './routes/stats.ts';
import { importExportRouter } from './routes/importExport.ts';
import { templatesRouter } from './routes/templates.ts';
import { competitionsRouter } from './routes/competitions.ts';
import { drawRouter } from './routes/draw.ts';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', referenceRouter);
  app.use('/api/clubs', clubsRouter);
  app.use('/api/athletes', athletesRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api', importExportRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/competitions', competitionsRouter);
  app.use('/api/competitions', drawRouter);

  // Health
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Serve the built web app (optional; missing in dev)
  const indexHtml = join(config.staticDir, 'index.html');
  if (existsSync(indexHtml)) {
    app.use(express.static(config.staticDir));
    app.get('*', (_req, res) => res.sendFile(indexHtml));
  } else {
    app.get('/', (_req, res) => res.json({ ok: true, hint: 'Run `npm run dev:web` for the UI (dev mode).' }));
  }

  // Error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  });

  return app;
}