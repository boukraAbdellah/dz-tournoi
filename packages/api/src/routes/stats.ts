import { Router } from 'express';
import { count } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import { athletes, clubs, competitions } from '@sport-competition/core';

export const statsRouter = Router();

statsRouter.get('/', (_req, res) => {
  const db = getDb();
  res.json({
    clubs: db.select({ n: count() }).from(clubs).get()?.n ?? 0,
    athletes: db.select({ n: count() }).from(athletes).get()?.n ?? 0,
    competitions: db.select({ n: count() }).from(competitions).get()?.n ?? 0,
  });
});