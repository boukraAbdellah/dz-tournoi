import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import {
  getDb,
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
} from '@sport-competition/core';

export const publicRouter = Router();

// ── Public list of competitions ──────────────────────────────────────────
publicRouter.get('/competitions', async (_req, res, next) => {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        date: competitions.date,
        location: competitions.location,
        description: competitions.description,
        status: competitions.status,
        sportTemplateId: competitions.sportTemplateId,
        templateName: sportTemplates.name,
      })
      .from(competitions)
      .leftJoin(sportTemplates, eq(competitions.sportTemplateId, sportTemplates.id))
      .orderBy(competitions.date)
      .all();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── Public competition details & categories ──────────────────────────────
publicRouter.get('/competitions/:id', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const db = getDb();
    const comp = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        date: competitions.date,
        location: competitions.location,
        description: competitions.description,
        sportTemplateId: competitions.sportTemplateId,
        templateName: sportTemplates.name,
        bronzeMatchEnabled: competitions.bronzeMatchEnabled,
        status: competitions.status,
      })
      .from(competitions)
      .leftJoin(sportTemplates, eq(competitions.sportTemplateId, sportTemplates.id))
      .where(eq(competitions.id, compId))
      .get();

    if (!comp) return res.status(404).json({ error: 'Compétition introuvable' });

    const categories = await db
      .select({
        id: competitionCategories.id,
        gender: competitionCategories.gender,
        enabled: competitionCategories.enabled,
        format: competitionCategories.format,
        drawGeneratedAt: competitionCategories.drawGeneratedAt,
        drawLockedAt: competitionCategories.drawLockedAt,
        ageCatName: ageCategories.name,
        weightDivName: weightDivisions.name,
      })
      .from(competitionCategories)
      .innerJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
      .innerJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
      .where(and(eq(competitionCategories.competitionId, compId), eq(competitionCategories.enabled, true)))
      .all();

    const allRegs = await db
      .select({ subDepartmentId: registrations.subDepartmentId })
      .from(registrations)
      .where(and(eq(registrations.competitionId, compId), eq(registrations.status, 'REGISTERED')))
      .all();

    const countByCat = new Map<number, number>();
    for (const r of allRegs) {
      if (r.subDepartmentId) {
        countByCat.set(r.subDepartmentId, (countByCat.get(r.subDepartmentId) ?? 0) + 1);
      }
    }

    const categoriesWithCount = categories.map((c) => ({
      ...c,
      name: `${c.ageCatName} - ${c.weightDivName} (${c.gender})`,
      registrationCount: countByCat.get(c.id) ?? 0,
    }));

    res.json({
      ...comp,
      categories: categoriesWithCount,
      totalRegistrations: allRegs.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── Public participants roster ───────────────────────────────────────────
publicRouter.get('/competitions/:id/participants', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const db = getDb();

    const rows = await db
      .select({
        id: registrations.id,
        firstName: athletes.firstName,
        lastName: athletes.lastName,
        gender: athletes.gender,
        weightKg: registrations.weightKg,
        clubName: clubs.name,
        wilayaNameFr: wilayas.nameFr,
        wilayaNameAr: wilayas.nameAr,
        wilayaCode: wilayas.code,
        subDepartmentId: registrations.subDepartmentId,
        ageCatName: ageCategories.name,
        weightDivName: weightDivisions.name,
      })
      .from(registrations)
      .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
      .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
      .leftJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
      .leftJoin(competitionCategories, eq(registrations.subDepartmentId, competitionCategories.id))
      .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
      .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
      .where(and(eq(registrations.competitionId, compId), eq(registrations.status, 'REGISTERED')))
      .orderBy(athletes.lastName, athletes.firstName)
      .all();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── Public interactive bracket viewer ────────────────────────────────────
publicRouter.get('/competitions/:id/bracket/:catId', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const catId = Number(req.params.catId);
    const db = getDb();

    const cat = await db
      .select({
        id: competitionCategories.id,
        gender: competitionCategories.gender,
        ageCatName: ageCategories.name,
        weightDivName: weightDivisions.name,
        drawGeneratedAt: competitionCategories.drawGeneratedAt,
      })
      .from(competitionCategories)
      .innerJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
      .innerJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
      .where(and(eq(competitionCategories.id, catId), eq(competitionCategories.competitionId, compId)))
      .get();

    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });

    const catMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.competitionCategoryId, catId))
      .all();

    // Enrich matches with names, clubs, and wilayas
    const enriched = [];
    for (const m of catMatches) {
      let nameA: string | null = null;
      let nameB: string | null = null;
      let clubA: string | null = null;
      let clubB: string | null = null;
      let wilayaA: string | null = null;
      let wilayaB: string | null = null;

      if (m.competitorAId) {
        const regA = await db
          .select({
            firstName: athletes.firstName,
            lastName: athletes.lastName,
            clubName: clubs.name,
            wilayaName: wilayas.nameFr,
          })
          .from(registrations)
          .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
          .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
          .leftJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
          .where(eq(registrations.id, m.competitorAId))
          .get();
        if (regA) {
          nameA = `${regA.lastName} ${regA.firstName}`;
          clubA = regA.clubName ?? null;
          wilayaA = regA.wilayaName ?? null;
        }
      }

      if (m.competitorBId) {
        const regB = await db
          .select({
            firstName: athletes.firstName,
            lastName: athletes.lastName,
            clubName: clubs.name,
            wilayaName: wilayas.nameFr,
          })
          .from(registrations)
          .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
          .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
          .leftJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
          .where(eq(registrations.id, m.competitorBId))
          .get();
        if (regB) {
          nameB = `${regB.lastName} ${regB.firstName}`;
          clubB = regB.clubName ?? null;
          wilayaB = regB.wilayaName ?? null;
        }
      }

      let winnerName: string | null = null;
      if (m.winnerRegistrationId) {
        const winReg = await db
          .select({ firstName: athletes.firstName, lastName: athletes.lastName })
          .from(registrations)
          .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
          .where(eq(registrations.id, m.winnerRegistrationId))
          .get();
        if (winReg) winnerName = `${winReg.lastName} ${winReg.firstName}`;
      }

      enriched.push({
        id: m.id,
        round: m.round,
        form: m.form,
        ordinal: m.ordinal,
        isBronze: m.isBronze,
        competitorAId: m.competitorAId,
        competitorBId: m.competitorBId,
        nameA,
        nameB,
        clubA,
        clubB,
        wilayaA,
        wilayaB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        resultType: m.resultType,
        winnerRegistrationId: m.winnerRegistrationId,
        winnerName,
        status: m.status,
      });
    }

    res.json({
      category: {
        id: cat.id,
        name: `${cat.ageCatName} - ${cat.weightDivName} (${cat.gender})`,
        gender: cat.gender,
        drawGeneratedAt: cat.drawGeneratedAt,
      },
      matches: enriched,
      rounds: Math.max(...enriched.map((m) => m.round), 0),
    });
  } catch (err) {
    next(err);
  }
});

// ── Public podiums & rankings ────────────────────────────────────────────
publicRouter.get('/competitions/:id/rankings', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Compétition introuvable' });

    let pointsConfig = { gold: 5, silver: 3, bronze: 1 };
    if (comp.rankPoints) {
      try {
        pointsConfig = JSON.parse(comp.rankPoints);
      } catch {}
    }

    const cats = await db
      .select({
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

    const regs = await db
      .select({
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
      athleteName: `${r.lastName} ${r.firstName}`,
      clubId: r.clubId,
      clubName: r.clubName,
      wilayaId: r.wilayaId,
      wilayaName: r.wilayaName,
      subDepartmentId: r.subDepartmentId,
      status: r.status,
    }));

    const allMatches = await db.select().from(matches).all();
    const compMatches = allMatches.filter((m) => catIds.has(m.competitionCategoryId));

    const result = computeCompetitionRankings(formattedCats, formattedRegs, compMatches, {
      bronzeMatchEnabled: comp.bronzeMatchEnabled,
      pointsConfig,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});
