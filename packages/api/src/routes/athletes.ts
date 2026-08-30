import { Router } from 'express';
import { eq, getTableColumns } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import { athletes as athletesTable, clubs } from '@sport-competition/core';

export const athletesRouter = Router();

const joined = () => {
  const db = getDb();
  return db
    .select({
      ...getTableColumns(athletesTable),
      clubName: clubs.name,
    })
    .from(athletesTable)
    .leftJoin(clubs, eq(athletesTable.clubId, clubs.id));
};

athletesRouter.get('/', (req, res) => {
  const rows = joined()
    .orderBy(athletesTable.lastName, athletesTable.firstName)
    .all();
  res.json(rows);
});

athletesRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = joined().where(eq(athletesTable.id, id)).get();
  if (!row) return res.status(404).json({ error: 'Athlète introuvable' });
  res.json(row);
});

const validate = (body: Record<string, unknown>) => {
  const errors: string[] = [];
  if (!body.firstName) errors.push('Le prénom est requis');
  if (!body.lastName) errors.push('Le nom est requis');
  if (!body.birthDate) errors.push('La date de naissance est requise');
  if (body.gender !== 'M' && body.gender !== 'F') errors.push('Le sexe doit être M ou F');
  return errors;
};

athletesRouter.post('/', (req, res) => {
  const body = req.body ?? {};
  const errors = validate(body);
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });
  const db = getDb();
  const row = db
    .insert(athletesTable)
    .values({
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      birthDate: String(body.birthDate),
      gender: body.gender === 'M' ? 'M' : 'F',
      weightKg: body.weightKg != null ? Number(body.weightKg) : null,
      clubId: body.clubId != null ? Number(body.clubId) : null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    })
    .returning()
    .get();
  res.status(201).json(row);
});

athletesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const body = req.body ?? {};
  const db = getDb();
  const existing = db.select().from(athletesTable).where(eq(athletesTable.id, id)).get();
  if (!existing) return res.status(404).json({ error: 'Athlète introuvable' });
  const row = db
    .update(athletesTable)
    .set({
      firstName: body.firstName != null ? String(body.firstName) : existing.firstName,
      lastName: body.lastName != null ? String(body.lastName) : existing.lastName,
      birthDate: body.birthDate != null ? String(body.birthDate) : existing.birthDate,
      gender: body.gender === 'M' || body.gender === 'F' ? body.gender : existing.gender,
      weightKg: body.weightKg != null ? Number(body.weightKg) : existing.weightKg,
      clubId: body.clubId != null ? Number(body.clubId) : existing.clubId,
      phone: body.phone != null ? String(body.phone) : existing.phone,
      notes: body.notes != null ? String(body.notes) : existing.notes,
    })
    .where(eq(athletesTable.id, id))
    .returning()
    .get();
  res.json(row);
});

athletesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const result = db.delete(athletesTable).where(eq(athletesTable.id, id)).run();
  if (!result.changes) return res.status(404).json({ error: 'Athlète introuvable' });
  res.status(204).end();
});