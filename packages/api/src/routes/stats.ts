import { Router } from 'express';
import { count } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import { athletes, clubs, competitions } from '@sport-competition/core';

export const statsRouter = Router();

statsRouter.get('/', async (_req, res, next) => {
  try {
    const db = getDb();
    const clubCount = (await db.select({ n: count() }).from(clubs).get())?.n ?? 0;
    const athleteCount = (await db.select({ n: count() }).from(athletes).get())?.n ?? 0;
    const compCount = (await db.select({ n: count() }).from(competitions).get())?.n ?? 0;
    res.json({
      clubs: clubCount,
      athletes: athleteCount,
      competitions: compCount,
    });
  } catch (err) {
    next(err);
  }
});