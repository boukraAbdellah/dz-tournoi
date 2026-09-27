import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, and, inArray } from 'drizzle-orm';
import {
  getDb,
  competitions,
  competitionCategories,
  registrations,
  athletes,
  clubs,
  wilayas,
  registrationTokens,
  ageCategories,
  weightDivisions,
  findCategory,
} from '@sport-competition/core';
import { requireAdmin } from '../middleware/auth.ts';
import { ageAtDate } from '../utils.ts';

export const leagueRouter = Router();

// ── Generate Direct Registration Token (Admin Only) ──────────────────────
leagueRouter.post('/generate-token', requireAdmin, async (req, res, next) => {
  try {
    const { competitionId, wilayaId, expiresInDays = 7 } = req.body ?? {};
    if (!competitionId || !wilayaId) {
      return res.status(400).json({ error: 'competitionId et wilayaId sont requis' });
    }

    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, Number(competitionId))).get();
    if (!comp) return res.status(404).json({ error: 'Compétition introuvable' });

    const wilaya = await db.select().from(wilayas).where(eq(wilayas.id, Number(wilayaId))).get();
    if (!wilaya) return res.status(404).json({ error: 'Wilaya introuvable' });

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString();

    const [created] = await db
      .insert(registrationTokens)
      .values({
        token,
        competitionId: Number(competitionId),
        wilayaId: Number(wilayaId),
        expiresAt,
      })
      .returning();

    if (!created) return res.status(500).json({ error: 'Échec de la génération du lien' });

    res.status(201).json({
      token: created.token,
      url: `/register/${competitionId}?token=${created.token}`,
      expiresAt: created.expiresAt,
      wilayaName: wilaya.nameFr,
    });
  } catch (err) {
    next(err);
  }
});

// ── List tokens for competition (Admin Only) ──────────────────────────────
leagueRouter.get('/tokens/:competitionId', requireAdmin, async (req, res, next) => {
  try {
    const compId = Number(req.params.competitionId);
    const db = getDb();

    const rows = await db
      .select({
        id: registrationTokens.id,
        token: registrationTokens.token,
        competitionId: registrationTokens.competitionId,
        wilayaId: registrationTokens.wilayaId,
        expiresAt: registrationTokens.expiresAt,
        createdAt: registrationTokens.createdAt,
        wilayaNameFr: wilayas.nameFr,
        wilayaNameAr: wilayas.nameAr,
        wilayaCode: wilayas.code,
      })
      .from(registrationTokens)
      .innerJoin(wilayas, eq(registrationTokens.wilayaId, wilayas.id))
      .where(eq(registrationTokens.competitionId, compId))
      .orderBy(wilayas.code)
      .all();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── Validate Token & Get League Portal Context (Public / Token-Based) ─────
leagueRouter.get('/token-info', async (req, res, next) => {
  try {
    const tokenStr = String(req.query.token ?? '').trim();
    if (!tokenStr) return res.status(400).json({ error: 'Token requis' });

    const db = getDb();
    const tokenRow = await db
      .select()
      .from(registrationTokens)
      .where(eq(registrationTokens.token, tokenStr))
      .get();

    if (!tokenRow) return res.status(404).json({ error: 'Lien d’inscription invalide ou introuvable' });

    const isExpired = new Date(tokenRow.expiresAt).getTime() < Date.now();
    if (isExpired) {
      return res.status(410).json({ error: 'Ce lien d’inscription a expiré', isExpired: true });
    }

    const comp = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        date: competitions.date,
        location: competitions.location,
        status: competitions.status,
      })
      .from(competitions)
      .where(eq(competitions.id, tokenRow.competitionId))
      .get();

    if (!comp) return res.status(404).json({ error: 'Compétition introuvable' });

    const wilaya = await db.select().from(wilayas).where(eq(wilayas.id, tokenRow.wilayaId)).get();

    // Get all clubs belonging to this wilaya
    const wilayaClubs = await db
      .select()
      .from(clubs)
      .where(eq(clubs.wilayaId, tokenRow.wilayaId))
      .orderBy(clubs.name)
      .all();

    const clubIds = wilayaClubs.map((c) => c.id);

    // Get athletes belonging to these clubs
    let wilayaAthletes: any[] = [];
    if (clubIds.length > 0) {
      wilayaAthletes = await db
        .select()
        .from(athletes)
        .where(inArray(athletes.clubId, clubIds))
        .orderBy(athletes.lastName, athletes.firstName)
        .all();
    }

    // Get enabled categories for this competition
    const categories = await db
      .select({
        id: competitionCategories.id,
        gender: competitionCategories.gender,
        ageCatName: ageCategories.name,
        minAge: ageCategories.minAge,
        maxAge: ageCategories.maxAge,
        weightDivName: weightDivisions.name,
        minKg: weightDivisions.minKg,
        maxKg: weightDivisions.maxKg,
      })
      .from(competitionCategories)
      .innerJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
      .innerJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
      .where(and(eq(competitionCategories.competitionId, comp.id), eq(competitionCategories.enabled, true)))
      .all();

    // Get existing registrations for this competition from this wilaya
    const existingRegs = await db
      .select({
        id: registrations.id,
        athleteId: registrations.athleteId,
        firstName: athletes.firstName,
        lastName: athletes.lastName,
        gender: athletes.gender,
        weightKg: registrations.weightKg,
        clubName: clubs.name,
        clubId: registrations.clubIdAtRegistration,
        subDepartmentId: registrations.subDepartmentId,
        status: registrations.status,
      })
      .from(registrations)
      .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
      .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
      .where(and(eq(registrations.competitionId, comp.id), inArray(registrations.clubIdAtRegistration, clubIds.length ? clubIds : [-1])))
      .all();

    res.json({
      competition: comp,
      wilaya,
      clubs: wilayaClubs,
      athletes: wilayaAthletes,
      categories: categories.map((c) => ({
        ...c,
        name: `${c.ageCatName} - ${c.weightDivName} (${c.gender})`,
      })),
      existingRegistrations: existingRegs,
      expiresAt: tokenRow.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// ── Register Athlete With Token ───────────────────────────────────────────
leagueRouter.post('/register-with-token', async (req, res, next) => {
  try {
    const { token, athleteId, weightKg, subDepartmentId, inlineAthlete } = req.body ?? {};
    const tokenStr = String(token ?? '').trim();
    if (!tokenStr) return res.status(400).json({ error: 'Token requis' });

    const db = getDb();
    const tokenRow = await db.select().from(registrationTokens).where(eq(registrationTokens.token, tokenStr)).get();
    if (!tokenRow) return res.status(404).json({ error: 'Lien d’inscription invalide' });

    if (new Date(tokenRow.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Le lien d’inscription a expiré' });
    }

    const comp = await db.select().from(competitions).where(eq(competitions.id, tokenRow.competitionId)).get();
    if (!comp) return res.status(404).json({ error: 'Compétition introuvable' });
    if (comp.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({ error: `Les inscriptions sont fermées (Statut actuel: ${comp.status})` });
    }

    let targetAthleteId: number;
    let targetClubId: number | null = null;
    let targetGender: 'M' | 'F';
    let targetBirthDate: string;
    let finalWeight: number | null = weightKg != null ? Number(weightKg) : null;

    if (inlineAthlete) {
      const { firstName, lastName, birthDate, gender, clubId, phone } = inlineAthlete;
      if (!firstName || !lastName || !birthDate || !gender || !clubId) {
        return res.status(400).json({ error: 'Nom, prénom, date de naissance, sexe et club requis pour l’athlète' });
      }

      // Verify club belongs to token's wilaya (Registration Isolation)
      const club = await db.select().from(clubs).where(eq(clubs.id, Number(clubId))).get();
      if (!club || club.wilayaId !== tokenRow.wilayaId) {
        return res.status(403).json({ error: 'Ce club n’appartient pas à la wilaya autorisée par ce lien.' });
      }

      const [newAth] = await db
        .insert(athletes)
        .values({
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          birthDate: String(birthDate).trim(),
          gender: gender === 'M' || gender === 'F' ? gender : 'M',
          weightKg: finalWeight,
          clubId: Number(clubId),
          phone: phone ? String(phone).trim() : null,
        })
        .returning();

      if (!newAth) return res.status(500).json({ error: 'Échec de la création de l’athlète' });

      targetAthleteId = newAth.id;
      targetClubId = newAth.clubId;
      targetGender = newAth.gender as 'M' | 'F';
      targetBirthDate = newAth.birthDate;
      if (finalWeight == null) finalWeight = newAth.weightKg;
    } else {
      if (!athleteId) return res.status(400).json({ error: 'athleteId ou inlineAthlete requis' });

      const ath = await db.select().from(athletes).where(eq(athletes.id, Number(athleteId))).get();
      if (!ath) return res.status(404).json({ error: 'Athlète introuvable' });

      // Verify athlete club belongs to token's wilaya (Registration Isolation)
      if (ath.clubId) {
        const club = await db.select().from(clubs).where(eq(clubs.id, ath.clubId)).get();
        if (!club || club.wilayaId !== tokenRow.wilayaId) {
          return res.status(403).json({ error: 'Cet athlète n’appartient pas à la wilaya autorisée par ce lien.' });
        }
      }

      targetAthleteId = ath.id;
      targetClubId = ath.clubId;
      targetGender = ath.gender as 'M' | 'F';
      targetBirthDate = ath.birthDate;
      if (finalWeight == null) finalWeight = ath.weightKg;
    }

    // Check if already registered
    const existing = await db
      .select()
      .from(registrations)
      .where(and(eq(registrations.competitionId, comp.id), eq(registrations.athleteId, targetAthleteId)))
      .get();

    if (existing) {
      if (existing.status === 'WITHDRAWN') {
        // Re-activate
        const [updated] = await db
          .update(registrations)
          .set({ status: 'REGISTERED', weightKg: finalWeight, subDepartmentId: subDepartmentId ? Number(subDepartmentId) : null })
          .where(eq(registrations.id, existing.id))
          .returning();
        return res.json(updated);
      }
      return res.status(409).json({ error: 'Cet athlète est déjà inscrit à cette compétition.' });
    }

    // Auto-resolve category if not passed
    let assignedCategoryId = subDepartmentId ? Number(subDepartmentId) : null;
    if (!assignedCategoryId && finalWeight != null) {
      const cats = await db.select().from(competitionCategories).where(eq(competitionCategories.competitionId, comp.id)).all();
      const ageCatIds = [...new Set(cats.map((c) => c.ageCategoryId))];
      const weightDivIds = [...new Set(cats.map((c) => c.weightDivisionId))];
      const ageCats = await db.select().from(ageCategories).where(ageCatIds.length ? undefined : eq(ageCategories.id, -1)).all();
      const weightDivs = await db.select().from(weightDivisions).where(weightDivIds.length ? undefined : eq(weightDivisions.id, -1)).all();
      const ageCatMap = new Map(ageCats.map((a) => [a.id, { minAge: a.minAge, maxAge: a.maxAge }]));
      const weightMap = new Map(weightDivs.map((w) => [w.id, { minKg: w.minKg, maxKg: w.maxKg }]));
      const age = ageAtDate(targetBirthDate, comp.date);
      assignedCategoryId = findCategory(cats, ageCatMap, weightMap, targetGender, age, finalWeight);
    }

    const [reg] = await db
      .insert(registrations)
      .values({
        competitionId: comp.id,
        athleteId: targetAthleteId,
        weightKg: finalWeight,
        clubIdAtRegistration: targetClubId,
        subDepartmentId: assignedCategoryId,
        status: 'REGISTERED',
      })
      .returning();

    res.status(201).json(reg);
  } catch (err) {
    next(err);
  }
});

// ── Withdraw Athlete With Token ───────────────────────────────────────────
leagueRouter.post('/withdraw-with-token', async (req, res, next) => {
  try {
    const { token, registrationId } = req.body ?? {};
    const tokenStr = String(token ?? '').trim();
    if (!tokenStr || !registrationId) {
      return res.status(400).json({ error: 'token et registrationId requis' });
    }

    const db = getDb();
    const tokenRow = await db.select().from(registrationTokens).where(eq(registrationTokens.token, tokenStr)).get();
    if (!tokenRow) return res.status(404).json({ error: 'Lien invalide' });

    const comp = await db.select().from(competitions).where(eq(competitions.id, tokenRow.competitionId)).get();
    if (!comp) return res.status(404).json({ error: 'Compétition introuvable' });
    if (comp.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({ error: 'Les inscriptions sont fermées' });
    }

    const reg = await db.select().from(registrations).where(eq(registrations.id, Number(registrationId))).get();
    if (!reg) return res.status(404).json({ error: 'Inscription introuvable' });

    // Verify registration club belongs to token's wilaya
    if (reg.clubIdAtRegistration) {
      const club = await db.select().from(clubs).where(eq(clubs.id, reg.clubIdAtRegistration)).get();
      if (!club || club.wilayaId !== tokenRow.wilayaId) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
    }

    const [updated] = await db
      .update(registrations)
      .set({ status: 'WITHDRAWN', subDepartmentId: null })
      .where(eq(registrations.id, reg.id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
