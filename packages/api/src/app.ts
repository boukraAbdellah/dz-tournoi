import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.ts';
import { authenticate, requireAuth } from './middleware/auth.ts';
import { authRouter } from './routes/auth.ts';
import { publicRouter } from './routes/public.ts';
import { leagueRouter } from './routes/league.ts';
import { referenceRouter } from './routes/reference.ts';
import { clubsRouter } from './routes/clubs.ts';
import { athletesRouter } from './routes/athletes.ts';
import { statsRouter } from './routes/stats.ts';
import { importExportRouter } from './routes/importExport.ts';
import { templatesRouter } from './routes/templates.ts';
import { competitionsRouter } from './routes/competitions.ts';
import { drawRouter } from './routes/draw.ts';
import { documentsRouter } from './routes/documents.ts';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Attach user payload if valid Bearer token provided
  app.use(authenticate);

  // Health probe (always accessible, public)
  app.get('/api/health', (_req, res) => res.json({ ok: true, serverless: Boolean(process.env.VERCEL) }));

  // Auth, Public & League Portals (accessible without login)
  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/league', leagueRouter);
  app.use('/api', referenceRouter);

  // Core Management Routes (require authenticated user)
  app.use('/api/clubs', requireAuth, clubsRouter);
  app.use('/api/athletes', requireAuth, athletesRouter);
  app.use('/api/stats', requireAuth, statsRouter);
  app.use('/api', requireAuth, importExportRouter);
  app.use('/api/templates', requireAuth, templatesRouter);
  app.use('/api/competitions', requireAuth, competitionsRouter);
  app.use('/api/competitions', requireAuth, drawRouter);
  app.use('/api/competitions', requireAuth, documentsRouter);

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