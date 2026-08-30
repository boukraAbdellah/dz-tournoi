import { Router } from 'express';
import { getDb } from '@sport-competition/core';
import { cities, wilayas } from '@sport-competition/core';
import { eq } from 'drizzle-orm';

export const referenceRouter = Router();

referenceRouter.get('/wilayas', (_req, res) => {
  const db = getDb();
  const rows = db.select().from(wilayas).orderBy(wilayas.code).all();
  res.json(rows);
});

referenceRouter.get('/cities', (req, res) => {
  const db = getDb();
  const wilayaId = Number(req.query.wilayaId);
  const query = db.select().from(cities);
  const rows = Number.isFinite(wilayaId) && wilayaId > 0 ? query.where(eq(cities.wilayaId, wilayaId)).all() : query.all();
  res.json(rows);
});