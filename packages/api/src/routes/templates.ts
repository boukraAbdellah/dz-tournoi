import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import {
  sportTemplates,
  ageCategories,
  weightDivisions,
} from '@sport-competition/core';

export const templatesRouter = Router();

templatesRouter.get('/', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    const db = getDb();
    const templates = await db.select().from(sportTemplates).all();
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

templatesRouter.get('/:id', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    const id = Number(req.params.id);
    const db = getDb();
    const template = await db.select().from(sportTemplates).where(eq(sportTemplates.id, id)).get();
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const ages = await db.select().from(ageCategories)
      .where(eq(ageCategories.templateId, id))
      .orderBy(ageCategories.orderIndex)
      .all();

    const weights = await db.select().from(weightDivisions)
      .where(eq(weightDivisions.templateId, id))
      .orderBy(weightDivisions.orderIndex)
      .all();

    res.json({ ...template, ageCategories: ages, weightDivisions: weights });
  } catch (err) {
    next(err);
  }
});

templatesRouter.put('/:id', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const id = Number(req.params.id);
    const db = getDb();
    const existing = await db.select().from(sportTemplates).where(eq(sportTemplates.id, id)).get();
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    if (existing.builtin) return res.status(400).json({ error: 'Cannot modify built-in template' });

    const { name, settings } = req.body ?? {};
    const [row] = await db.update(sportTemplates)
      .set({
        name: name != null ? String(name) : existing.name,
        settings: settings != null ? JSON.stringify(settings) : existing.settings,
      })
      .where(eq(sportTemplates.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    next(err);
  }
});
