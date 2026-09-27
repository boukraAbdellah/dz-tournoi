import { Router, type RequestHandler } from 'express';
import { getDb } from '@sport-competition/core';
import { cities, wilayas } from '@sport-competition/core';

export const referenceRouter = Router();

let cachedWilayas: any[] | null = null;
let cachedCitiesAll: any[] | null = null;

export function clearReferenceCache() {
  cachedWilayas = null;
  cachedCitiesAll = null;
}

const handleWilayas: RequestHandler = async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (!cachedWilayas) {
      const db = getDb();
      cachedWilayas = await db.select().from(wilayas).orderBy(wilayas.code).all();
    }
    res.json(cachedWilayas);
  } catch (err) {
    next(err);
  }
};

const handleCities: RequestHandler = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    const wilayaId = Number(req.query.wilayaId);
    if (!cachedCitiesAll) {
      const db = getDb();
      cachedCitiesAll = await db.select().from(cities).all();
    }
    if (Number.isFinite(wilayaId) && wilayaId > 0) {
      res.json(cachedCitiesAll.filter((c: any) => c.wilayaId === wilayaId));
    } else {
      res.json(cachedCitiesAll);
    }
  } catch (err) {
    next(err);
  }
};

referenceRouter.get('/wilayas', handleWilayas);
referenceRouter.get('/reference/wilayas', handleWilayas);
referenceRouter.get('/cities', handleCities);
referenceRouter.get('/reference/cities', handleCities);