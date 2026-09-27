import { Router } from 'express';
import { eq, getTableColumns } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import { cities as citiesTable, clubs, wilayas, athletes } from '@sport-competition/core';

export const clubsRouter = Router();

const joined = () => {
  const db = getDb();
  return db
    .select({
      ...getTableColumns(clubs),
      wilayaName: wilayas.nameFr,
      wilayaNameAr: wilayas.nameAr,
      cityName: citiesTable.nameFr,
      cityNameAr: citiesTable.nameAr,
    })
    .from(clubs)
    .innerJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
    .innerJoin(citiesTable, eq(clubs.cityId, citiesTable.id));
};

clubsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await joined().orderBy(clubs.name).all();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

clubsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await joined().where(eq(clubs.id, id)).get();
    if (!row) return res.status(404).json({ error: 'Club not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

clubsRouter.post('/', async (req, res, next) => {
  try {
    const { name, wilayaId, cityId, email, phone, address, notes } = req.body ?? {};
    if (!name || !wilayaId || !cityId) return res.status(400).json({ error: 'name, wilayaId and cityId are required' });
    const db = getDb();
    const [row] = await db
      .insert(clubs)
      .values({ name: String(name), wilayaId: Number(wilayaId), cityId: Number(cityId), email: email ?? null, phone: phone ?? null, address: address ?? null, notes: notes ?? null })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

clubsRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, wilayaId, cityId, email, phone, address, notes } = req.body ?? {};
    const db = getDb();
    const existing = await db.select().from(clubs).where(eq(clubs.id, id)).get();
    if (!existing) return res.status(404).json({ error: 'Club not found' });
    const [row] = await db
      .update(clubs)
      .set({
        name: name != null ? String(name) : existing.name,
        wilayaId: wilayaId != null ? Number(wilayaId) : existing.wilayaId,
        cityId: cityId != null ? Number(cityId) : existing.cityId,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        address: address ?? existing.address,
        notes: notes ?? existing.notes,
      })
      .where(eq(clubs.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    next(err);
  }
});

clubsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const used = await db.select({ n: athletes.id }).from(athletes).where(eq(athletes.clubId, id)).all();
    if (used.length > 0) return res.status(409).json({ error: 'des athletes sont liés à ce club', title: 'Impossible de supprimer' });
    const result = await db.delete(clubs).where(eq(clubs.id, id)).run();
    if (!result.rowsAffected) return res.status(404).json({ error: 'Club not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});