import { Router } from 'express';
import { eq, getTableColumns } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import {
  sportTemplates,
  ageCategories,
  weightDivisions,
} from '@sport-competition/core';

export const templatesRouter = Router();

templatesRouter.get('/', (_req, res) => {
  const db = getDb();
  const templates = db.select().from(sportTemplates).all();
  res.json(templates);
});

templatesRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, id)).get();
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const ages = db.select().from(ageCategories)
    .where(eq(ageCategories.templateId, id))
    .orderBy(ageCategories.orderIndex)
    .all();

  const weights = db.select().from(weightDivisions)
    .where(eq(weightDivisions.templateId, id))
    .orderBy(weightDivisions.orderIndex)
    .all();

  res.json({ ...template, ageCategories: ages, weightDivisions: weights });
});

templatesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const existing = db.select().from(sportTemplates).where(eq(sportTemplates.id, id)).get();
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  if (existing.builtin) return res.status(400).json({ error: 'Cannot modify built-in template' });

  const { name, settings } = req.body ?? {};
  const row = db.update(sportTemplates)
    .set({
      name: name != null ? String(name) : existing.name,
      settings: settings != null ? JSON.stringify(settings) : existing.settings,
    })
    .where(eq(sportTemplates.id, id))
    .returning()
    .get();
  res.json(row);
});
