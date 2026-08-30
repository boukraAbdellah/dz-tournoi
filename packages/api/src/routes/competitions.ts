import { Router } from 'express';
import { eq, count, and, isNull } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import {
  competitions,
  competitionCategories,
  registrations,
  athletes,
  sportTemplates,
  ageCategories,
  weightDivisions,
  clubs,
  wilayas,
  matches,
  computeCompetitionRankings,
  type CompetitionStatus,
} from '@sport-competition/core';

export const competitionsRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

/** Calculate age at competition date */
function ageAtDate(birthDate: string, compDate: string): number {
  const birth = new Date(birthDate);
  const comp = new Date(compDate);
  let age = comp.getFullYear() - birth.getFullYear();
  const m = comp.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && comp.getDate() < birth.getDate())) age--;
  return age;
}

/** Find the first enabled category matching (gender, age, weight) */
function findCategory(
  cats: Array<{ id: number; gender: string; ageCategoryId: number; weightDivisionId: number; enabled: boolean }>,
  ageCatMap: Map<number, { minAge: number; maxAge: number | null }>,
  weightMap: Map<number, { minKg: number | null; maxKg: number | null }>,
  gender: string,
  age: number,
  weightKg: number | null,
): number | null {
  for (const cat of cats) {
    if (!cat.enabled) continue;
    if (cat.gender !== gender) continue;

    const ageCat = ageCatMap.get(cat.ageCategoryId);
    const weight = weightMap.get(cat.weightDivisionId);
    if (!ageCat || !weight) continue;

    // Check age: [minAge, maxAge]
    if (age < ageCat.minAge) continue;
    if (ageCat.maxAge != null && age > ageCat.maxAge) continue;

    // Check weight: [minKg, maxKg] (inclusive both ends)
    if (weightKg == null) continue; // no weight → can't resolve
    if (weight.minKg != null && weightKg < weight.minKg) continue;
    if (weight.maxKg != null && weightKg > weight.maxKg) continue;

    return cat.id;
  }
  return null;
}

// ── List ──────────────────────────────────────────────────────────────────
competitionsRouter.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.select({
    id: competitions.id,
    name: competitions.name,
    date: competitions.date,
    location: competitions.location,
    status: competitions.status,
    sportTemplateId: competitions.sportTemplateId,
    templateName: sportTemplates.name,
  })
    .from(competitions)
    .leftJoin(sportTemplates, eq(competitions.sportTemplateId, sportTemplates.id))
    .orderBy(competitions.date)
    .all();
  res.json(rows);
});

// ── Get one ───────────────────────────────────────────────────────────────
competitionsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const row = db.select({
    id: competitions.id,
    name: competitions.name,
    date: competitions.date,
    location: competitions.location,
    description: competitions.description,
    sportTemplateId: competitions.sportTemplateId,
    templateName: sportTemplates.name,
    bronzeMatchEnabled: competitions.bronzeMatchEnabled,
    clubRankingEnabled: competitions.clubRankingEnabled,
    wilayaRankingEnabled: competitions.wilayaRankingEnabled,
    rankPoints: competitions.rankPoints,
    status: competitions.status,
  })
    .from(competitions)
    .leftJoin(sportTemplates, eq(competitions.sportTemplateId, sportTemplates.id))
    .where(eq(competitions.id, id))
    .get();
  if (!row) return res.status(404).json({ error: 'Competition not found' });

  const categories = db.select({
    id: competitionCategories.id,
    ageCategoryId: competitionCategories.ageCategoryId,
    ageCategoryName: ageCategories.name,
    minAge: ageCategories.minAge,
    maxAge: ageCategories.maxAge,
    weightDivisionId: competitionCategories.weightDivisionId,
    weightDivisionName: weightDivisions.name,
    minKg: weightDivisions.minKg,
    maxKg: weightDivisions.maxKg,
    gender: competitionCategories.gender,
    enabled: competitionCategories.enabled,
    format: competitionCategories.format,
    rngSeed: competitionCategories.rngSeed,
    drawGeneratedAt: competitionCategories.drawGeneratedAt,
    drawLockedAt: competitionCategories.drawLockedAt,
  })
    .from(competitionCategories)
    .innerJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
    .innerJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
    .where(eq(competitionCategories.competitionId, id))
    .all();

  // Add registration counts per category (only REGISTERED + assigned)
  const categoriesWithCounts = categories.map((cat) => {
    const regCount = db.select({ n: count() })
      .from(registrations)
      .where(and(
        eq(registrations.competitionId, id),
        eq(registrations.subDepartmentId, cat.id),
        eq(registrations.status, 'REGISTERED'),
      ))
      .get()?.n ?? 0;
    return { ...cat, registrationCount: regCount };
  });

  // Total registrations (including unresolved)
  const totalRegs = db.select({ n: count() })
    .from(registrations)
    .where(and(
      eq(registrations.competitionId, id),
      eq(registrations.status, 'REGISTERED'),
    ))
    .get()?.n ?? 0;

  // Unresolved count (registered but no subDepartmentId)
  const unresolvedCount = db.select({ n: count() })
    .from(registrations)
    .where(and(
      eq(registrations.competitionId, id),
      eq(registrations.status, 'REGISTERED'),
      isNull(registrations.subDepartmentId),
    ))
    .get()?.n ?? 0;

  res.json({ ...row, categories: categoriesWithCounts, totalRegistrations: totalRegs, unresolvedCount });
});

// ── Create ────────────────────────────────────────────────────────────────
competitionsRouter.post('/', (req, res) => {
  const { name, date, location, description, sportTemplateId, bronzeMatchEnabled, clubRankingEnabled, wilayaRankingEnabled, rankPoints } = req.body ?? {};
  if (!name || !date || !sportTemplateId) {
    return res.status(400).json({ error: 'name, date and sportTemplateId are required' });
  }
  const db = getDb();

  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, Number(sportTemplateId))).get();
  if (!template) return res.status(400).json({ error: 'Template not found' });

  const comp = db.insert(competitions).values({
    name: String(name),
    date: String(date),
    location: location ?? null,
    description: description ?? null,
    sportTemplateId: Number(sportTemplateId),
    bronzeMatchEnabled: bronzeMatchEnabled ?? true,
    clubRankingEnabled: clubRankingEnabled ?? true,
    wilayaRankingEnabled: wilayaRankingEnabled ?? false,
    rankPoints: rankPoints ? JSON.stringify(rankPoints) : '{"gold":5,"silver":3,"bronze":1}',
    status: 'DRAFT',
  }).returning().get();

  // Materialize categories from template (M + F for each age × weight)
  const ages = db.select().from(ageCategories)
    .where(eq(ageCategories.templateId, Number(sportTemplateId)))
    .all();
  const weights = db.select().from(weightDivisions)
    .where(eq(weightDivisions.templateId, Number(sportTemplateId)))
    .all();

  for (const age of ages) {
    for (const weight of weights) {
      if (weight.ageCategoryId !== age.id) continue;
      for (const gender of ['M', 'F'] as const) {
        db.insert(competitionCategories).values({
          competitionId: comp.id,
          ageCategoryId: age.id,
          weightDivisionId: weight.id,
          gender,
          enabled: true,
          format: 'SINGLE_ELIM',
        }).run();
      }
    }
  }

  res.status(201).json(comp);
});

// ── Update ────────────────────────────────────────────────────────────────
competitionsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const existing = db.select().from(competitions).where(eq(competitions.id, id)).get();
  if (!existing) return res.status(404).json({ error: 'Competition not found' });

  const { name, date, location, description, bronzeMatchEnabled, clubRankingEnabled, wilayaRankingEnabled, rankPoints } = req.body ?? {};
  const row = db.update(competitions).set({
    name: name != null ? String(name) : existing.name,
    date: date != null ? String(date) : existing.date,
    location: location !== undefined ? (location ?? null) : existing.location,
    description: description !== undefined ? (description ?? null) : existing.description,
    bronzeMatchEnabled: bronzeMatchEnabled ?? existing.bronzeMatchEnabled,
    clubRankingEnabled: clubRankingEnabled ?? existing.clubRankingEnabled,
    wilayaRankingEnabled: wilayaRankingEnabled ?? existing.wilayaRankingEnabled,
    rankPoints: rankPoints ? JSON.stringify(rankPoints) : existing.rankPoints,
  }).where(eq(competitions.id, id)).returning().get();
  res.json(row);
});

// ── Delete ────────────────────────────────────────────────────────────────
competitionsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const existing = db.select().from(competitions).where(eq(competitions.id, id)).get();
  if (!existing) return res.status(404).json({ error: 'Competition not found' });
  if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Can only delete draft competitions' });
  db.delete(competitions).where(eq(competitions.id, id)).run();
  res.status(204).end();
});

// ── State transitions ─────────────────────────────────────────────────────
const TRANSITIONS: Record<CompetitionStatus, CompetitionStatus[]> = {
  DRAFT: ['REGISTRATION_OPEN'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED'],
  REGISTRATION_CLOSED: ['DRAW_GENERATED', 'REGISTRATION_OPEN'],
  DRAW_GENERATED: ['DRAW_CONFIRMED', 'REGISTRATION_CLOSED'],
  DRAW_CONFIRMED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

type TransitionResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string; status: number };

function transition(id: number, target: CompetitionStatus): TransitionResult {
  const db = getDb();
  const existing = db.select().from(competitions).where(eq(competitions.id, id)).get();
  if (!existing) return { ok: false, error: 'Competition not found', status: 404 };
  const allowed = TRANSITIONS[existing.status as CompetitionStatus];
  if (!allowed.includes(target)) {
    return { ok: false, error: `Cannot transition from ${existing.status} to ${target}`, status: 400 };
  }
  const row = db.update(competitions).set({ status: target }).where(eq(competitions.id, id)).returning().get() as Record<string, unknown>;
  return { ok: true, row };
}

competitionsRouter.post('/:id/open-registration', (req, res) => {
  const result = transition(Number(req.params.id), 'REGISTRATION_OPEN');
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  res.json(result.row);
});

competitionsRouter.post('/:id/close-registration', (req, res) => {
  const result = transition(Number(req.params.id), 'REGISTRATION_CLOSED');
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  res.json(result.row);
});

competitionsRouter.post('/:id/reopen-registration', (req, res) => {
  const result = transition(Number(req.params.id), 'REGISTRATION_OPEN');
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  res.json(result.row);
});

competitionsRouter.post('/:id/complete', (req, res) => {
  const result = transition(Number(req.params.id), 'COMPLETED');
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  res.json(result.row);
});

// ── Category toggle ───────────────────────────────────────────────────────
competitionsRouter.put('/:id/categories/:catId', (req, res) => {
  const catId = Number(req.params.catId);
  const db = getDb();
  const cat = db.select().from(competitionCategories).where(eq(competitionCategories.id, catId)).get();
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const { enabled } = req.body ?? {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }

  const row = db.update(competitionCategories)
    .set({ enabled })
    .where(eq(competitionCategories.id, catId))
    .returning().get();
  res.json(row);
});

// ── Batch category toggle ─────────────────────────────────────────────────
competitionsRouter.put('/:id/categories', (req, res) => {
  const compId = Number(req.params.id);
  const { enabled, gender, ageCategoryId } = req.body ?? {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }
  const db = getDb();
  const conditions = [eq(competitionCategories.competitionId, compId)];
  if (gender) conditions.push(eq(competitionCategories.gender, gender));
  if (ageCategoryId) conditions.push(eq(competitionCategories.ageCategoryId, Number(ageCategoryId)));
  const rows = db.update(competitionCategories)
    .set({ enabled })
    .where(and(...conditions))
    .returning()
    .all();
  res.json({ updated: rows.length });
});

// ── Registration list ─────────────────────────────────────────────────────
competitionsRouter.get('/:id/registrations', (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const rows = db.select({
    id: registrations.id,
    athleteId: registrations.athleteId,
    firstName: athletes.firstName,
    lastName: athletes.lastName,
    birthDate: athletes.birthDate,
    gender: athletes.gender,
    weightKg: registrations.weightKg,
    clubIdAtRegistration: registrations.clubIdAtRegistration,
    clubName: clubs.name,
    subDepartmentId: registrations.subDepartmentId,
    status: registrations.status,
  })
    .from(registrations)
    .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
    .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
    .where(eq(registrations.competitionId, id))
    .orderBy(athletes.lastName, athletes.firstName)
    .all();
  res.json(rows);
});

// ── Register existing athlete (with auto-assign) ──────────────────────────
competitionsRouter.post('/:id/register', (req, res) => {
  const compId = Number(req.params.id);
  const { athleteId, weightKg, subDepartmentId } = req.body ?? {};
  if (!athleteId) return res.status(400).json({ error: 'athleteId is required' });

  const db = getDb();
  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  if (comp.status !== 'REGISTRATION_OPEN') return res.status(400).json({ error: 'Registration is not open' });

  const athlete = db.select().from(athletes).where(eq(athletes.id, Number(athleteId))).get();
  if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

  // Check duplicate
  const existing = db.select().from(registrations)
    .where(and(eq(registrations.competitionId, compId), eq(registrations.athleteId, Number(athleteId))))
    .get();
  if (existing) return res.status(409).json({ error: 'Athlete already registered' });

  const finalWeight = weightKg != null ? Number(weightKg) : athlete.weightKg;

  // Auto-assign category if not manually provided
  let assignedCategoryId = subDepartmentId ? Number(subDepartmentId) : null;
  if (!assignedCategoryId && finalWeight != null) {
    const cats = db.select().from(competitionCategories)
      .where(eq(competitionCategories.competitionId, compId))
      .all();
    const ageCatIds = [...new Set(cats.map((c) => c.ageCategoryId))];
    const weightDivIds = [...new Set(cats.map((c) => c.weightDivisionId))];
    const ageCats = db.select().from(ageCategories).where(
      ageCatIds.length > 0 ? undefined : eq(ageCategories.id, -1),
    ).all();
    const weightDivs = db.select().from(weightDivisions).where(
      weightDivIds.length > 0 ? undefined : eq(weightDivisions.id, -1),
    ).all();
    const ageCatMap = new Map(ageCats.map((a) => [a.id, { minAge: a.minAge, maxAge: a.maxAge }]));
    const weightMap = new Map(weightDivs.map((w) => [w.id, { minKg: w.minKg, maxKg: w.maxKg }]));
    const age = ageAtDate(athlete.birthDate, comp.date);
    assignedCategoryId = findCategory(cats, ageCatMap, weightMap, athlete.gender, age, finalWeight);
  }

  const row = db.insert(registrations).values({
    competitionId: compId,
    athleteId: Number(athleteId),
    weightKg: finalWeight,
    clubIdAtRegistration: athlete.clubId,
    subDepartmentId: assignedCategoryId,
    status: 'REGISTERED',
  }).returning().get();
  res.status(201).json(row);
});

// ── Register inline (create athlete + register + auto-assign) ──────────────
competitionsRouter.post('/:id/register-inline', (req, res) => {
  const compId = Number(req.params.id);
  const { firstName, lastName, birthDate, gender, weightKg, clubId, phone, subDepartmentId } = req.body ?? {};
  if (!firstName || !lastName || !birthDate || !gender) {
    return res.status(400).json({ error: 'firstName, lastName, birthDate and gender are required' });
  }

  const db = getDb();
  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  if (comp.status !== 'REGISTRATION_OPEN') return res.status(400).json({ error: 'Registration is not open' });

  // Create athlete
  const athlete = db.insert(athletes).values({
    firstName: String(firstName),
    lastName: String(lastName),
    birthDate: String(birthDate),
    gender: gender === 'M' || gender === 'F' ? gender : 'M',
    weightKg: weightKg != null ? Number(weightKg) : null,
    clubId: clubId ? Number(clubId) : null,
    phone: phone ?? null,
  }).returning().get();

  const finalWeight = weightKg != null ? Number(weightKg) : null;

  // Auto-assign category
  let assignedCategoryId = subDepartmentId ? Number(subDepartmentId) : null;
  if (!assignedCategoryId && finalWeight != null) {
    const cats = db.select().from(competitionCategories)
      .where(eq(competitionCategories.competitionId, compId))
      .all();
    const ageCatIds = [...new Set(cats.map((c) => c.ageCategoryId))];
    const weightDivIds = [...new Set(cats.map((c) => c.weightDivisionId))];
    const ageCats = db.select().from(ageCategories).where(
      ageCatIds.length > 0 ? undefined : eq(ageCategories.id, -1),
    ).all();
    const weightDivs = db.select().from(weightDivisions).where(
      weightDivIds.length > 0 ? undefined : eq(weightDivisions.id, -1),
    ).all();
    const ageCatMap = new Map(ageCats.map((a) => [a.id, { minAge: a.minAge, maxAge: a.maxAge }]));
    const weightMap = new Map(weightDivs.map((w) => [w.id, { minKg: w.minKg, maxKg: w.maxKg }]));
    const age = ageAtDate(athlete.birthDate, comp.date);
    assignedCategoryId = findCategory(cats, ageCatMap, weightMap, athlete.gender, age, finalWeight);
  }

  // Register
  const reg = db.insert(registrations).values({
    competitionId: compId,
    athleteId: athlete.id,
    weightKg: finalWeight,
    clubIdAtRegistration: clubId ? Number(clubId) : null,
    subDepartmentId: assignedCategoryId,
    status: 'REGISTERED',
  }).returning().get();

  res.status(201).json({ athlete, registration: reg });
});

// ── Bulk register by subcategory ──────────────────────────────────────────
competitionsRouter.post('/:id/register-bulk', (req, res) => {
  const compId = Number(req.params.id);
  const { subDepartmentId } = req.body ?? {};
  if (!subDepartmentId) return res.status(400).json({ error: 'subDepartmentId is required' });

  const db = getDb();
  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  if (comp.status !== 'REGISTRATION_OPEN') return res.status(400).json({ error: 'Registration is not open' });

  // Get the target category
  const targetCat = db.select().from(competitionCategories)
    .where(and(
      eq(competitionCategories.id, Number(subDepartmentId)),
      eq(competitionCategories.competitionId, compId),
      eq(competitionCategories.enabled, true),
    ))
    .get();
  if (!targetCat) return res.status(400).json({ error: 'Category not found or disabled' });

  // Get age and weight info for this category
  const ageCat = db.select().from(ageCategories).where(eq(ageCategories.id, targetCat.ageCategoryId)).get();
  const weightDiv = db.select().from(weightDivisions).where(eq(weightDivisions.id, targetCat.weightDivisionId)).get();
  if (!ageCat || !weightDiv) return res.status(400).json({ error: 'Category reference data not found' });

  // Get already registered athlete IDs for this competition
  const existingRegs = db.select({ athleteId: registrations.athleteId })
    .from(registrations)
    .where(eq(registrations.competitionId, compId))
    .all();
  const registeredIds = new Set(existingRegs.map((r) => r.athleteId));

  // Find all athletes matching (gender, age, weight) who are NOT yet registered
  const allAthletes = db.select().from(athletes).all();
  const matched: typeof allAthletes = [];

  for (const a of allAthletes) {
    if (registeredIds.has(a.id)) continue;
    if (a.gender !== targetCat.gender) continue;

    const age = ageAtDate(a.birthDate, comp.date);
    if (age < ageCat.minAge) continue;
    if (ageCat.maxAge != null && age > ageCat.maxAge) continue;

    const weight = a.weightKg;
    if (weight == null) continue;
    if (weightDiv.minKg != null && weight < weightDiv.minKg) continue;
    if (weightDiv.maxKg != null && weight > weightDiv.maxKg) continue;

    matched.push(a);
  }

  // Register all matched athletes
  let registered = 0;
  db.transaction((tx) => {
    for (const a of matched) {
      // Check again inside transaction to avoid race conditions
      const already = tx.select().from(registrations)
        .where(and(eq(registrations.competitionId, compId), eq(registrations.athleteId, a.id)))
        .get();
      if (already) continue;

      tx.insert(registrations).values({
        competitionId: compId,
        athleteId: a.id,
        weightKg: a.weightKg,
        clubIdAtRegistration: a.clubId,
        subDepartmentId: Number(subDepartmentId),
        status: 'REGISTERED',
      }).run();
      registered++;
    }
  });

  res.status(201).json({
    registered,
    total: matched.length,
    categoryName: `${ageCat.name} - ${weightDiv.name} (${targetCat.gender})`,
  });
});

// ── Bulk register preview ────────────────────────────────────────────────
competitionsRouter.get('/:id/register-bulk/preview', (req, res) => {
  const compId = Number(req.params.id);
  const catId = Number(req.query.categoryId);
  if (!catId) return res.status(400).json({ error: 'categoryId query param is required' });

  const db = getDb();
  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });

  const targetCat = db.select().from(competitionCategories)
    .where(and(
      eq(competitionCategories.id, catId),
      eq(competitionCategories.competitionId, compId),
      eq(competitionCategories.enabled, true),
    ))
    .get();
  if (!targetCat) return res.status(400).json({ error: 'Category not found or disabled' });

  const ageCat = db.select().from(ageCategories).where(eq(ageCategories.id, targetCat.ageCategoryId)).get();
  const weightDiv = db.select().from(weightDivisions).where(eq(weightDivisions.id, targetCat.weightDivisionId)).get();
  if (!ageCat || !weightDiv) return res.status(400).json({ error: 'Category reference data not found' });

  const existingRegs = db.select({ athleteId: registrations.athleteId })
    .from(registrations)
    .where(eq(registrations.competitionId, compId))
    .all();
  const registeredIds = new Set(existingRegs.map((r) => r.athleteId));

  const allAthletes = db.select().from(athletes).all();
  const matched: Array<{ id: number; firstName: string; lastName: string; weightKg: number | null; clubName: string | null }> = [];

  for (const a of allAthletes) {
    if (registeredIds.has(a.id)) continue;
    if (a.gender !== targetCat.gender) continue;

    const age = ageAtDate(a.birthDate, comp.date);
    if (age < ageCat.minAge) continue;
    if (ageCat.maxAge != null && age > ageCat.maxAge) continue;

    const weight = a.weightKg;
    if (weight == null) continue;
    if (weightDiv.minKg != null && weight < weightDiv.minKg) continue;
    if (weightDiv.maxKg != null && weight > weightDiv.maxKg) continue;

    const club = a.clubId ? db.select().from(clubs).where(eq(clubs.id, a.clubId)).get() : null;
    matched.push({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      weightKg: a.weightKg,
      clubName: club?.name ?? null,
    });
  }

  res.json({
    categoryName: `${ageCat.name} - ${weightDiv.name} (${targetCat.gender})`,
    athletes: matched,
    total: matched.length,
  });
});

// ── Manual category override ──────────────────────────────────────────────
competitionsRouter.put('/:id/registrations/:regId/category', (req, res) => {
  const regId = Number(req.params.regId);
  const { subDepartmentId } = req.body ?? {};
  const db = getDb();

  const reg = db.select().from(registrations).where(eq(registrations.id, regId)).get();
  if (!reg) return res.status(404).json({ error: 'Registration not found' });

  // Validate category belongs to this competition if provided
  if (subDepartmentId != null) {
    const cat = db.select().from(competitionCategories)
      .where(and(
        eq(competitionCategories.id, Number(subDepartmentId)),
        eq(competitionCategories.competitionId, reg.competitionId),
      ))
      .get();
    if (!cat) return res.status(400).json({ error: 'Category not found in this competition' });
  }

  const row = db.update(registrations)
    .set({ subDepartmentId: subDepartmentId != null ? Number(subDepartmentId) : null })
    .where(eq(registrations.id, regId))
    .returning().get();
  res.json(row);
});

// ── Update registration weight ────────────────────────────────────────────
competitionsRouter.put('/:id/registrations/:regId/weight', (req, res) => {
  const regId = Number(req.params.regId);
  const { weightKg } = req.body ?? {};
  const db = getDb();

  const reg = db.select().from(registrations).where(eq(registrations.id, regId)).get();
  if (!reg) return res.status(404).json({ error: 'Registration not found' });

  const newWeight = weightKg != null ? Number(weightKg) : null;

  // Re-assign category with new weight
  let assignedCategoryId = reg.subDepartmentId;
  if (newWeight != null) {
    const cats = db.select().from(competitionCategories)
      .where(eq(competitionCategories.competitionId, reg.competitionId))
      .all();
    const ageCatIds = [...new Set(cats.map((c) => c.ageCategoryId))];
    const weightDivIds = [...new Set(cats.map((c) => c.weightDivisionId))];
    const ageCats = db.select().from(ageCategories).where(
      ageCatIds.length > 0 ? undefined : eq(ageCategories.id, -1),
    ).all();
    const weightDivs = db.select().from(weightDivisions).where(
      weightDivIds.length > 0 ? undefined : eq(weightDivisions.id, -1),
    ).all();
    const ageCatMap = new Map(ageCats.map((a) => [a.id, { minAge: a.minAge, maxAge: a.maxAge }]));
    const weightMap = new Map(weightDivs.map((w) => [w.id, { minKg: w.minKg, maxKg: w.maxKg }]));

    const athlete = db.select().from(athletes).where(eq(athletes.id, reg.athleteId)).get();
    const comp = db.select().from(competitions).where(eq(competitions.id, reg.competitionId)).get();
    if (athlete && comp) {
      const age = ageAtDate(athlete.birthDate, comp.date);
      assignedCategoryId = findCategory(cats, ageCatMap, weightMap, athlete.gender, age, newWeight);
    }
  }

  const row = db.update(registrations)
    .set({ weightKg: newWeight, subDepartmentId: assignedCategoryId })
    .where(eq(registrations.id, regId))
    .returning().get();
  res.json(row);
});

// ── Withdraw ─────────────────────────────────────────────────────────────
competitionsRouter.post('/:id/withdraw/:regId', (req, res) => {
  const regId = Number(req.params.regId);
  const db = getDb();
  const reg = db.select().from(registrations).where(eq(registrations.id, regId)).get();
  if (!reg) return res.status(404).json({ error: 'Registration not found' });
  const row = db.update(registrations).set({ status: 'WITHDRAWN', subDepartmentId: null }).where(eq(registrations.id, regId)).returning().get();
  res.json(row);
});

// ── Resolve (POST, only unresolved athletes, only enabled categories) ─────
competitionsRouter.post('/:id/resolve', (req, res) => {
  const compId = Number(req.params.id);
  const db = getDb();
  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });

  // Only allow resolution when registration is closed or later
  const blockedStatuses: string[] = ['DRAFT', 'REGISTRATION_OPEN'];
  if (blockedStatuses.includes(comp.status)) {
    return res.status(400).json({ error: 'Resolve only available after registration closes' });
  }

  // Only process unresolved athletes (subDepartmentId IS NULL)
  const regs = db.select({
    regId: registrations.id,
    athleteId: athletes.id,
    firstName: athletes.firstName,
    lastName: athletes.lastName,
    birthDate: athletes.birthDate,
    gender: athletes.gender,
    weightKg: registrations.weightKg,
  })
    .from(registrations)
    .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
    .where(and(
      eq(registrations.competitionId, compId),
      eq(registrations.status, 'REGISTERED'),
      isNull(registrations.subDepartmentId),
    ))
    .all();

  // Only match against enabled categories
  const cats = db.select().from(competitionCategories)
    .where(and(
      eq(competitionCategories.competitionId, compId),
      eq(competitionCategories.enabled, true),
    ))
    .all();

  const ageCatIds = [...new Set(cats.map((c) => c.ageCategoryId))];
  const weightDivIds = [...new Set(cats.map((c) => c.weightDivisionId))];
  const ageCats = db.select().from(ageCategories).where(
    ageCatIds.length > 0 ? undefined : eq(ageCategories.id, -1),
  ).all();
  const weightDivs = db.select().from(weightDivisions).where(
    weightDivIds.length > 0 ? undefined : eq(weightDivisions.id, -1),
  ).all();
  const ageCatMap = new Map(ageCats.map((a) => [a.id, { minAge: a.minAge, maxAge: a.maxAge }]));
  const weightMap = new Map(weightDivs.map((w) => [w.id, { minKg: w.minKg, maxKg: w.maxKg }]));

  const resolved: Array<{ regId: number; athleteName: string; categoryId: number; categoryName: string }> = [];
  const unresolved: Array<{ regId: number; athleteName: string; reason: string }> = [];

  for (const r of regs) {
    const age = ageAtDate(r.birthDate, comp.date);
    const matchedCatId = findCategory(cats, ageCatMap, weightMap, r.gender, age, r.weightKg);

    if (matchedCatId) {
      const cat = cats.find((c) => c.id === matchedCatId);
      const ageCat = ageCats.find((a) => a.id === cat?.ageCategoryId);
      const weight = weightDivs.find((w) => w.id === cat?.weightDivisionId);
      db.update(registrations)
        .set({ subDepartmentId: matchedCatId })
        .where(eq(registrations.id, r.regId))
        .run();
      resolved.push({
        regId: r.regId,
        athleteName: `${r.firstName} ${r.lastName}`,
        categoryId: matchedCatId,
        categoryName: `${ageCat?.name ?? '?'} - ${weight?.name ?? '?'} (${r.gender})`,
      });
    } else {
      let reason: string;
      if (r.weightKg == null) {
        reason = 'Poids non renseigné';
      } else {
        reason = `Aucune catégorie ne correspond (âge=${age}, poids=${r.weightKg} kg, sexe=${r.gender})`;
      }
      unresolved.push({ regId: r.regId, athleteName: `${r.firstName} ${r.lastName}`, reason });
    }
  }

  res.json({ resolved, unresolved, total: regs.length + resolved.length + unresolved.length });
});

// ── Resolution status (read-only GET) ────────────────────────────────────
competitionsRouter.get('/:id/resolution', (req, res) => {
  const compId = Number(req.params.id);
  const db = getDb();
  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });

  // Get all enabled categories
  const cats = db.select().from(competitionCategories)
    .where(and(
      eq(competitionCategories.competitionId, compId),
      eq(competitionCategories.enabled, true),
    ))
    .all();

  // Get all registrations with their assigned category info
  const regs = db.select({
    regId: registrations.id,
    athleteId: athletes.id,
    firstName: athletes.firstName,
    lastName: athletes.lastName,
    birthDate: athletes.birthDate,
    gender: athletes.gender,
    weightKg: registrations.weightKg,
    subDepartmentId: registrations.subDepartmentId,
    clubName: clubs.name,
  })
    .from(registrations)
    .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
    .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
    .where(and(
      eq(registrations.competitionId, compId),
      eq(registrations.status, 'REGISTERED'),
    ))
    .all();

  const ageCatIds = [...new Set(cats.map((c) => c.ageCategoryId))];
  const weightDivIds = [...new Set(cats.map((c) => c.weightDivisionId))];
  const ageCats = db.select().from(ageCategories).where(
    ageCatIds.length > 0 ? undefined : eq(ageCategories.id, -1),
  ).all();
  const weightDivs = db.select().from(weightDivisions).where(
    weightDivIds.length > 0 ? undefined : eq(weightDivisions.id, -1),
  ).all();
  const ageCatMap = new Map(ageCats.map((a) => [a.id, a]));
  const weightMap = new Map(weightDivs.map((w) => [w.id, w]));

  const resolved: Array<{
    regId: number; athleteName: string; categoryId: number; categoryName: string;
    weightKg: number | null; clubName: string | null;
  }> = [];
  const unresolved: Array<{
    regId: number; athleteName: string; reason: string;
    weightKg: number | null; clubName: string | null;
  }> = [];

  for (const r of regs) {
    if (r.subDepartmentId) {
      const cat = cats.find((c) => c.id === r.subDepartmentId);
      const ageCat = ageCatMap.get(cat?.ageCategoryId ?? -1);
      const weight = weightMap.get(cat?.weightDivisionId ?? -1);
      resolved.push({
        regId: r.regId,
        athleteName: `${r.firstName} ${r.lastName}`,
        categoryId: r.subDepartmentId,
        categoryName: `${ageCat?.name ?? '?'} - ${weight?.name ?? '?'} (${r.gender})`,
        weightKg: r.weightKg,
        clubName: r.clubName,
      });
    } else {
      const age = ageAtDate(r.birthDate, comp.date);
      let reason: string;
      if (r.weightKg == null) {
        reason = 'Poids non renseigné';
      } else {
        reason = `Âge=${age}, poids=${r.weightKg} kg — aucune catégorie ne correspond`;
      }
      unresolved.push({
        regId: r.regId,
        athleteName: `${r.firstName} ${r.lastName}`,
        reason,
        weightKg: r.weightKg,
        clubName: r.clubName,
      });
    }
  }

  res.json({ resolved, unresolved, total: regs.length });
});

// ── Competition rankings (GET /:id/rankings) ──────────────────────────────
competitionsRouter.get('/:id/rankings', (req, res) => {
  const compId = Number(req.params.id);
  const db = getDb();
  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });

  let pointsConfig = { gold: 5, silver: 3, bronze: 1 };
  try {
    if (comp.rankPoints) pointsConfig = JSON.parse(comp.rankPoints);
  } catch {
    // fallback to default
  }

  // Get categories with display names
  const cats = db.select({
    id: competitionCategories.id,
    gender: competitionCategories.gender,
    ageCategoryName: ageCategories.name,
    weightDivisionName: weightDivisions.name,
  })
    .from(competitionCategories)
    .innerJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
    .innerJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
    .where(and(eq(competitionCategories.competitionId, compId), eq(competitionCategories.enabled, true)))
    .all();

  const formattedCats = cats.map((c) => ({
    id: c.id,
    name: `${c.ageCategoryName} - ${c.weightDivisionName} (${c.gender})`,
    gender: c.gender,
  }));

  const catIds = new Set(cats.map((c) => c.id));

  // Get all registered athletes
  const regs = db.select({
    id: registrations.id,
    athleteId: registrations.athleteId,
    firstName: athletes.firstName,
    lastName: athletes.lastName,
    clubId: registrations.clubIdAtRegistration,
    clubName: clubs.name,
    wilayaId: clubs.wilayaId,
    wilayaName: wilayas.nameFr,
    subDepartmentId: registrations.subDepartmentId,
    status: registrations.status,
  })
    .from(registrations)
    .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
    .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
    .leftJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
    .where(and(eq(registrations.competitionId, compId), eq(registrations.status, 'REGISTERED')))
    .all();

  const formattedRegs = regs.map((r) => ({
    id: r.id,
    athleteId: r.athleteId,
    athleteName: `${r.firstName} ${r.lastName}`,
    clubId: r.clubId,
    clubName: r.clubName,
    wilayaId: r.wilayaId,
    wilayaName: r.wilayaName,
    subDepartmentId: r.subDepartmentId,
    status: r.status,
  }));

  // Get all matches for this competition's categories
  const allMatches = db.select().from(matches).all();
  const compMatches = allMatches.filter((m) => catIds.has(m.competitionCategoryId));

  const result = computeCompetitionRankings(formattedCats, formattedRegs, compMatches, {
    bronzeMatchEnabled: comp.bronzeMatchEnabled,
    pointsConfig,
  });

  res.json(result);
});

// ── Duplicate competition (POST /:id/duplicate) ───────────────────────────
competitionsRouter.post('/:id/duplicate', (req, res) => {
  const compId = Number(req.params.id);
  const db = getDb();
  const source = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!source) return res.status(404).json({ error: 'Competition not found' });

  const newName = req.body?.name || `${source.name} (Copie)`;
  const newDate = req.body?.date || new Date().toISOString().split('T')[0];

  const duplicated = db.insert(competitions).values({
    name: newName,
    date: newDate,
    location: source.location,
    description: source.description,
    sportTemplateId: source.sportTemplateId,
    bronzeMatchEnabled: source.bronzeMatchEnabled,
    clubRankingEnabled: source.clubRankingEnabled,
    wilayaRankingEnabled: source.wilayaRankingEnabled,
    rankPoints: source.rankPoints,
    status: 'DRAFT',
  }).returning().get();

  // Copy category configurations
  const sourceCats = db.select().from(competitionCategories).where(eq(competitionCategories.competitionId, compId)).all();
  for (const cat of sourceCats) {
    db.insert(competitionCategories).values({
      competitionId: duplicated.id,
      ageCategoryId: cat.ageCategoryId,
      weightDivisionId: cat.weightDivisionId,
      gender: cat.gender,
      enabled: cat.enabled,
      format: cat.format,
    }).run();
  }

  res.status(201).json(duplicated);
});
