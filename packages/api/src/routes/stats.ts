import { Router } from 'express';
import { performance } from 'node:perf_hooks';
import { count } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import { athletes, clubs, competitions } from '@sport-competition/core';

export const statsRouter = Router();

// TEMP-PERF: temporary timing probe to diagnose slow /api/stats responses. Remove after investigation.
statsRouter.get('/', async (_req, res, next) => {
  const totalStart = performance.now();
  try {
    const db = getDb();
    const t0 = performance.now();
    const clubCount = (await db.select({ n: count() }).from(clubs).get())?.n ?? 0;
    const t1 = performance.now();
    console.log(`[TEMP-PERF] GET /api/stats query clubs: ${(t1 - t0).toFixed(2)} ms`);

    const athleteCount = (await db.select({ n: count() }).from(athletes).get())?.n ?? 0;
    const t2 = performance.now();
    console.log(`[TEMP-PERF] GET /api/stats query athletes: ${(t2 - t1).toFixed(2)} ms`);

    const compCount = (await db.select({ n: count() }).from(competitions).get())?.n ?? 0;
    const t3 = performance.now();
    console.log(`[TEMP-PERF] GET /api/stats query competitions: ${(t3 - t2).toFixed(2)} ms`);
    console.log(`[TEMP-PERF] GET /api/stats total DB: ${(t3 - t0).toFixed(2)} ms`);

    res.json({
      clubs: clubCount,
      athletes: athleteCount,
      competitions: compCount,
    });

    console.log(`[TEMP-PERF] GET /api/stats total route: ${(performance.now() - totalStart).toFixed(2)} ms`);
  } catch (err) {
    next(err);
  }
});