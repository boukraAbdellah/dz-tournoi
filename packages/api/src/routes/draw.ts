import { Router } from 'express';
import { eq, and, isNull, count as drizzleCount } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import {
  competitions,
  competitionCategories,
  registrations,
  athletes,
  clubs,
  wilayas,
  cities,
  matches,
  type CompetitionStatus,
} from '@sport-competition/core';
import {
  generateBracket,
  type DrawParticipant,
} from '@sport-competition/core';

export const drawRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────

const TRANSITIONS: Record<CompetitionStatus, CompetitionStatus[]> = {
  DRAFT: ['REGISTRATION_OPEN'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED'],
  REGISTRATION_CLOSED: ['DRAW_GENERATED', 'REGISTRATION_OPEN'],
  DRAW_GENERATED: ['DRAW_CONFIRMED', 'REGISTRATION_CLOSED', 'DRAW_GENERATED'],
  DRAW_CONFIRMED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

function canTransition(from: CompetitionStatus, to: CompetitionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

async function computeDetailedAudit(
  round1Matches: Array<{
    id: number;
    ordinal: number;
    competitorAId: number | null;
    competitorBId: number | null;
    nameA?: string | null;
    nameB?: string | null;
    clubA?: string | null;
    clubB?: string | null;
    status?: string;
  }>,
  db: any,
) {
  const activeR1 = round1Matches.filter((m) => m.status !== 'BYE' && m.competitorAId && m.competitorBId);
  let sameWilaya = 0;
  let sameCity = 0;
  let sameClub = 0;
  const details: Array<{
    matchId: number;
    ordinal: number;
    nameA: string;
    nameB: string;
    clubA: string | null;
    clubB: string | null;
    sameClub: boolean;
    sameCity: boolean;
    sameWilaya: boolean;
    clubName: string | null;
    cityName: string | null;
    wilayaName: string | null;
  }> = [];

  for (const m of activeR1) {
    if (!m.competitorAId || !m.competitorBId) continue;
    const regA = await db.select({
      clubId: registrations.clubIdAtRegistration,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
    })
      .from(registrations)
      .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
      .where(eq(registrations.id, m.competitorAId))
      .get();

    const regB = await db.select({
      clubId: registrations.clubIdAtRegistration,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
    })
      .from(registrations)
      .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
      .where(eq(registrations.id, m.competitorBId))
      .get();

    const nameA = m.nameA ?? (regA ? `${regA.firstName} ${regA.lastName}` : 'Combattant A');
    const nameB = m.nameB ?? (regB ? `${regB.firstName} ${regB.lastName}` : 'Combattant B');

    if (regA?.clubId && regB?.clubId) {
      const clubA = await db.select().from(clubs).where(eq(clubs.id, regA.clubId)).get();
      const clubB = await db.select().from(clubs).where(eq(clubs.id, regB.clubId)).get();
      if (clubA && clubB) {
        const isSameClub = clubA.id === clubB.id;
        const isSameCity = clubA.cityId != null && clubA.cityId === clubB.cityId;
        const isSameWilaya = clubA.wilayaId != null && clubA.wilayaId === clubB.wilayaId;

        if (isSameWilaya) sameWilaya++;
        if (isSameCity) sameCity++;
        if (isSameClub) sameClub++;

        if (isSameWilaya || isSameCity || isSameClub) {
          let wilayaName: string | null = null;
          if (isSameWilaya && clubA.wilayaId) {
            const w = await db.select().from(wilayas).where(eq(wilayas.id, clubA.wilayaId)).get();
            wilayaName = w?.nameFr ?? null;
          }
          let cityName: string | null = null;
          if (isSameCity && clubA.cityId) {
            const c = await db.select().from(cities).where(eq(cities.id, clubA.cityId)).get();
            cityName = c?.nameFr ?? null;
          }
          details.push({
            matchId: m.id,
            ordinal: m.ordinal,
            nameA,
            nameB,
            clubA: m.clubA ?? clubA.name,
            clubB: m.clubB ?? clubB.name,
            sameClub: isSameClub,
            sameCity: isSameCity,
            sameWilaya: isSameWilaya,
            clubName: isSameClub ? clubA.name : null,
            cityName,
            wilayaName,
          });
        }
      }
    }
  }

  return { sameWilaya, sameCity, sameClub, details };
}

async function syncRound1ByeAdvancements(tx: any, categoryId: number) {
  const r1Matches = await tx.select().from(matches)
    .where(and(eq(matches.competitionCategoryId, categoryId), eq(matches.round, 1)))
    .all();

  for (const m1 of r1Matches) {
    if (m1.isBronze) continue;
    const hasA = m1.competitorAId != null;
    const hasB = m1.competitorBId != null;
    const isBye = !hasA || !hasB;
    const byeWinner = isBye ? (m1.competitorAId ?? m1.competitorBId) : null;

    await tx.update(matches)
      .set({
        status: isBye ? 'BYE' : 'PENDING',
        winnerRegistrationId: isBye ? byeWinner : null,
      })
      .where(eq(matches.id, m1.id))
      .run();

    const nextOrd = Math.ceil(m1.ordinal / 2);
    const nextSlot = m1.ordinal % 2 === 1 ? 'competitorAId' : 'competitorBId';
    await tx.update(matches)
      .set({ [nextSlot]: isBye ? byeWinner : null, status: 'PENDING' })
      .where(and(
        eq(matches.competitionCategoryId, categoryId),
        eq(matches.round, 2),
        eq(matches.ordinal, nextOrd),
      ))
      .run();
  }
}

// ── POST /:id/generate-draw ────────────────────────────────────────────
// Generate brackets for all (or a specific) enabled categories with registered athletes.

drawRouter.post('/:id/generate-draw', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const targetCatId = req.query.catId
      ? Number(req.query.catId)
      : req.body?.categoryId
        ? Number(req.body.categoryId)
        : null;

    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Competition not found' });
    if (comp.status !== 'DRAW_GENERATED' && !canTransition(comp.status as CompetitionStatus, 'DRAW_GENERATED')) {
      return res.status(400).json({ error: `Cannot generate draw from status ${comp.status}` });
    }

    // Check all registrations are resolved
    const unresolved = (await db.select({ n: drizzleCount() })
      .from(registrations)
      .where(and(
        eq(registrations.competitionId, compId),
        eq(registrations.status, 'REGISTERED'),
        isNull(registrations.subDepartmentId),
      ))
      .get())?.n ?? 0;
    if (unresolved > 0) {
      return res.status(400).json({ error: `${unresolved} registration(s) unresolved. Resolve all before generating draw.` });
    }

    // Get enabled categories with at least 1 registration
    const allCats = await db.select().from(competitionCategories)
      .where(and(
        eq(competitionCategories.competitionId, compId),
        eq(competitionCategories.enabled, true),
      ))
      .all();

    const cats = targetCatId != null
      ? allCats.filter((c) => c.id === targetCatId)
      : allCats;

    if (targetCatId != null && cats.length === 0) {
      return res.status(404).json({ error: 'Category not found or not enabled for this competition' });
    }

    let totalMatches = 0;
    let categoriesProcessed = 0;

    await db.transaction(async (tx) => {
      for (const cat of cats) {
        // Get registrations for this category
        const regs = await tx.select({
          regId: registrations.id,
          athleteId: athletes.id,
          weightKg: registrations.weightKg,
          clubIdAtRegistration: registrations.clubIdAtRegistration,
        })
          .from(registrations)
          .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
          .where(and(
            eq(registrations.competitionId, compId),
            eq(registrations.subDepartmentId, cat.id),
            eq(registrations.status, 'REGISTERED'),
          ))
          .all();

        if (regs.length < 2) continue;

        // Delete old matches and reset category metadata (regeneration)
        await tx.delete(matches).where(eq(matches.competitionCategoryId, cat.id)).run();
        await tx.update(competitionCategories)
          .set({ rngSeed: null, drawGeneratedAt: null, drawLockedAt: null })
          .where(eq(competitionCategories.id, cat.id))
          .run();

        // Resolve wilayaId/cityId for each registration
        const participants: DrawParticipant[] = [];
        for (const r of regs) {
          let wilayaId: number | null = null;
          let cityId: number | null = null;
          if (r.clubIdAtRegistration) {
            const club = await tx.select().from(clubs).where(eq(clubs.id, r.clubIdAtRegistration)).get();
            if (club) {
              wilayaId = club.wilayaId;
              cityId = club.cityId;
            }
          }
          participants.push({ registrationId: r.regId, wilayaId, cityId, clubId: r.clubIdAtRegistration });
        }

        const seed = Math.floor(Math.random() * 2147483647);
        const bracket = generateBracket(participants, { bronze: comp.bronzeMatchEnabled, seed });

        // Insert all matches for this category across all rounds in batches
        const catMatchesToInsert: Array<typeof matches.$inferInsert> = [];
        for (const round of Object.values(bracket.matches)) {
          for (const m of round) {
            const regA = m.competitorAId != null
              ? regs.find((r) => r.regId === m.competitorAId)?.regId ?? null
              : null;
            const regB = m.competitorBId != null
              ? regs.find((r) => r.regId === m.competitorBId)?.regId ?? null
              : null;

            const isRound1Bye = m.round === 1 && (m.isBye || regA == null || regB == null);
            const byeWinner = isRound1Bye ? (regA ?? regB) : null;

            catMatchesToInsert.push({
              competitionCategoryId: cat.id,
              round: m.round,
              form: m.form,
              ordinal: m.ordinal,
              isBronze: m.isBronze,
              competitorAId: regA,
              competitorBId: regB,
              scoreA: null,
              scoreB: null,
              resultType: 'REGULAR',
              winnerRegistrationId: byeWinner,
              status: isRound1Bye ? 'BYE' : 'PENDING',
            });
            totalMatches++;
          }
        }

        if (catMatchesToInsert.length > 0) {
          for (let i = 0; i < catMatchesToInsert.length; i += 50) {
            await tx.insert(matches).values(catMatchesToInsert.slice(i, i + 50)).run();
          }
        }

        // Auto-advance round 1 bye winners into round 2
        await syncRound1ByeAdvancements(tx, cat.id);

        // Update category metadata
        await tx.update(competitionCategories)
          .set({
            rngSeed: seed,
            drawGeneratedAt: new Date().toISOString(),
          })
          .where(eq(competitionCategories.id, cat.id))
          .run();

        categoriesProcessed++;
      }

      // Transition competition status if not already DRAW_GENERATED
      if (comp.status !== 'DRAW_GENERATED') {
        await tx.update(competitions)
          .set({ status: 'DRAW_GENERATED' })
          .where(eq(competitions.id, compId))
          .run();
      }
    });

    res.json({
      ok: true,
      categoriesProcessed,
      totalMatches,
      targetCategoryId: targetCatId,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/categories/:catId/generate-draw ──────────────────────────
drawRouter.post('/:id/categories/:catId/generate-draw', async (req, res, next) => {
  try {
    req.query.catId = req.params.catId;
    const compId = Number(req.params.id);
    const targetCatId = Number(req.params.catId);

    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Competition not found' });
    if (comp.status !== 'DRAW_GENERATED' && !canTransition(comp.status as CompetitionStatus, 'DRAW_GENERATED')) {
      return res.status(400).json({ error: `Cannot generate draw from status ${comp.status}` });
    }

    const cat = await db.select().from(competitionCategories)
      .where(and(
        eq(competitionCategories.id, targetCatId),
        eq(competitionCategories.competitionId, compId),
        eq(competitionCategories.enabled, true),
      ))
      .get();
    if (!cat) return res.status(404).json({ error: 'Category not found or not enabled' });

    let totalMatches = 0;
    await db.transaction(async (tx) => {
      const regs = await tx.select({
        regId: registrations.id,
        athleteId: athletes.id,
        weightKg: registrations.weightKg,
        clubIdAtRegistration: registrations.clubIdAtRegistration,
      })
        .from(registrations)
        .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
        .where(and(
          eq(registrations.competitionId, compId),
          eq(registrations.subDepartmentId, cat.id),
          eq(registrations.status, 'REGISTERED'),
        ))
        .all();

      if (regs.length >= 2) {
        await tx.delete(matches).where(eq(matches.competitionCategoryId, cat.id)).run();
        await tx.update(competitionCategories)
          .set({ rngSeed: null, drawGeneratedAt: null, drawLockedAt: null })
          .where(eq(competitionCategories.id, cat.id))
          .run();

        const participants: DrawParticipant[] = [];
        for (const r of regs) {
          let wilayaId: number | null = null;
          let cityId: number | null = null;
          if (r.clubIdAtRegistration) {
            const club = await tx.select().from(clubs).where(eq(clubs.id, r.clubIdAtRegistration)).get();
            if (club) { wilayaId = club.wilayaId; cityId = club.cityId; }
          }
          participants.push({ registrationId: r.regId, wilayaId, cityId, clubId: r.clubIdAtRegistration });
        }

        const seed = Math.floor(Math.random() * 2147483647);
        const bracket = generateBracket(participants, { bronze: comp.bronzeMatchEnabled, seed });

        const catMatchesToInsert: Array<typeof matches.$inferInsert> = [];
        for (const round of Object.values(bracket.matches)) {
          for (const m of round) {
            const regA = m.competitorAId != null
              ? regs.find((r) => r.regId === m.competitorAId)?.regId ?? null
              : null;
            const regB = m.competitorBId != null
              ? regs.find((r) => r.regId === m.competitorBId)?.regId ?? null
              : null;

            const isRound1Bye = m.round === 1 && (m.isBye || regA == null || regB == null);
            const byeWinner = isRound1Bye ? (regA ?? regB) : null;

            catMatchesToInsert.push({
              competitionCategoryId: cat.id,
              round: m.round,
              form: m.form,
              ordinal: m.ordinal,
              isBronze: m.isBronze,
              competitorAId: regA,
              competitorBId: regB,
              scoreA: null,
              scoreB: null,
              resultType: 'REGULAR',
              winnerRegistrationId: byeWinner,
              status: isRound1Bye ? 'BYE' : 'PENDING',
            });
            totalMatches++;
          }
        }

        if (catMatchesToInsert.length > 0) {
          for (let i = 0; i < catMatchesToInsert.length; i += 50) {
            await tx.insert(matches).values(catMatchesToInsert.slice(i, i + 50)).run();
          }
        }

        await syncRound1ByeAdvancements(tx, cat.id);

        await tx.update(competitionCategories)
          .set({
            rngSeed: seed,
            drawGeneratedAt: new Date().toISOString(),
          })
          .where(eq(competitionCategories.id, cat.id))
          .run();
      }

      if (comp.status !== 'DRAW_GENERATED') {
        await tx.update(competitions)
          .set({ status: 'DRAW_GENERATED' })
          .where(eq(competitions.id, compId))
          .run();
      }
    });

    res.json({ ok: true, categoriesProcessed: 1, totalMatches, targetCategoryId: targetCatId });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/bracket/:catId ────────────────────────────────────────────
// Get bracket matches for a specific category.

drawRouter.get('/:id/bracket/:catId', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const catId = Number(req.params.catId);
    const db = getDb();

    const cat = await db.select().from(competitionCategories)
      .where(and(
        eq(competitionCategories.id, catId),
        eq(competitionCategories.competitionId, compId),
      ))
      .get();
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const catMatches = await db.select().from(matches)
      .where(eq(matches.competitionCategoryId, catId))
      .all();

    // Enrich matches with athlete names and wilayas
    const enriched = [];
    for (const m of catMatches) {
      let nameA: string | null = null;
      let nameB: string | null = null;
      let clubA: string | null = null;
      let clubB: string | null = null;
      let wilayaA: string | null = null;
      let wilayaB: string | null = null;
      let wilayaCodeA: number | null = null;
      let wilayaCodeB: number | null = null;

      if (m.competitorAId) {
        const reg = await db.select({
          firstName: athletes.firstName,
          lastName: athletes.lastName,
          clubId: registrations.clubIdAtRegistration,
        })
          .from(registrations)
          .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
          .where(eq(registrations.id, m.competitorAId))
          .get();
        if (reg) {
          nameA = `${reg.firstName} ${reg.lastName}`;
          if (reg.clubId) {
            const club = await db.select().from(clubs).where(eq(clubs.id, reg.clubId)).get();
            clubA = club?.name ?? null;
            if (club?.wilayaId) {
              const w = await db.select().from(wilayas).where(eq(wilayas.id, club.wilayaId)).get();
              wilayaA = w?.nameFr ?? null;
              wilayaCodeA = w?.code ?? null;
            }
          }
        }
      }

      if (m.competitorBId) {
        const reg = await db.select({
          firstName: athletes.firstName,
          lastName: athletes.lastName,
          clubId: registrations.clubIdAtRegistration,
        })
          .from(registrations)
          .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
          .where(eq(registrations.id, m.competitorBId))
          .get();
        if (reg) {
          nameB = `${reg.firstName} ${reg.lastName}`;
          if (reg.clubId) {
            const club = await db.select().from(clubs).where(eq(clubs.id, reg.clubId)).get();
            clubB = club?.name ?? null;
            if (club?.wilayaId) {
              const w = await db.select().from(wilayas).where(eq(wilayas.id, club.wilayaId)).get();
              wilayaB = w?.nameFr ?? null;
              wilayaCodeB = w?.code ?? null;
            }
          }
        }
      }

      let winnerName: string | null = null;
      if (m.winnerRegistrationId) {
        const reg = await db.select({
          firstName: athletes.firstName,
          lastName: athletes.lastName,
        })
          .from(registrations)
          .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
          .where(eq(registrations.id, m.winnerRegistrationId))
          .get();
        if (reg) winnerName = `${reg.firstName} ${reg.lastName}`;
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
        wilayaCodeA,
        wilayaCodeB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        resultType: m.resultType,
        winnerRegistrationId: m.winnerRegistrationId,
        winnerName,
        status: m.status,
      });
    }

    // Compute detailed audit for round 1
    const audit = await computeDetailedAudit(enriched.filter((m) => m.round === 1), db);

    res.json({
      categoryId: catId,
      ageCategoryName: cat.ageCategoryId,
      gender: cat.gender,
      format: cat.format,
      rngSeed: cat.rngSeed,
      drawGeneratedAt: cat.drawGeneratedAt,
      drawLockedAt: cat.drawLockedAt,
      matches: enriched,
      audit,
      rounds: Math.max(...enriched.map((m) => m.round), 0),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/lock-draw ────────────────────────────────────────────────
// Lock the draw (DRAW_GENERATED → DRAW_CONFIRMED).

drawRouter.post('/:id/lock-draw', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Competition not found' });
    if (!canTransition(comp.status as CompetitionStatus, 'DRAW_CONFIRMED')) {
      return res.status(400).json({ error: `Cannot lock draw from status ${comp.status}` });
    }

    await db.transaction(async (tx) => {
      const catsWithDraw = (await tx.select().from(competitionCategories)
        .where(and(
          eq(competitionCategories.competitionId, compId),
          eq(competitionCategories.enabled, true),
        ))
        .all())
        .filter((c) => c.drawGeneratedAt != null);

      for (const cat of catsWithDraw) {
        await tx.update(competitionCategories)
          .set({ drawLockedAt: new Date().toISOString() })
          .where(eq(competitionCategories.id, cat.id))
          .run();
      }

      await tx.update(competitions)
        .set({ status: 'DRAW_CONFIRMED' })
        .where(eq(competitions.id, compId))
        .run();
    });

    res.json({ ok: true, status: 'DRAW_CONFIRMED' });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/categories/:catId/swap ───────────────────────────────────
// Swap two athletes in round 1 of a category.

drawRouter.post('/:id/categories/:catId/swap', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const catId = Number(req.params.catId);
    const { regIdA, regIdB } = req.body ?? {};
    if (!regIdA || !regIdB) return res.status(400).json({ error: 'regIdA and regIdB are required' });

    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Competition not found' });
    if (comp.status !== 'DRAW_GENERATED') {
      return res.status(400).json({ error: 'Draw must be in DRAW_GENERATED status to swap' });
    }

    const cat = await db.select().from(competitionCategories)
      .where(and(eq(competitionCategories.id, catId), eq(competitionCategories.competitionId, compId)))
      .get();
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    // Find round 1 matches containing these athletes
    const r1Matches = await db.select().from(matches)
      .where(and(
        eq(matches.competitionCategoryId, catId),
        eq(matches.round, 1),
      ))
      .all();

    const matchA = r1Matches.find((m) => m.competitorAId === regIdA || m.competitorBId === regIdA);
    const matchB = r1Matches.find((m) => m.competitorAId === regIdB || m.competitorBId === regIdB);

    if (!matchA || !matchB) {
      return res.status(400).json({ error: 'One or both athletes not found in round 1' });
    }
    if (matchA.id === matchB.id) {
      return res.status(400).json({ error: 'Cannot swap athletes in the same match' });
    }
    if (matchA.isBronze || matchB.isBronze) {
      return res.status(400).json({ error: 'Cannot swap athletes in bronze matches' });
    }

    const sideA = matchA.competitorAId === regIdA ? 'A' : 'B';
    const sideB = matchB.competitorAId === regIdB ? 'A' : 'B';

    await db.transaction(async (tx) => {
      await tx.update(matches)
        .set({ [sideA === 'A' ? 'competitorAId' : 'competitorBId']: regIdB })
        .where(eq(matches.id, matchA.id))
        .run();
      await tx.update(matches)
        .set({ [sideB === 'A' ? 'competitorAId' : 'competitorBId']: regIdA })
        .where(eq(matches.id, matchB.id))
        .run();

      await syncRound1ByeAdvancements(tx, catId);
    });

    const updatedR1 = await db.select().from(matches)
      .where(and(eq(matches.competitionCategoryId, catId), eq(matches.round, 1)))
      .all();
    const audit = await computeDetailedAudit(updatedR1, db);

    res.json({ ok: true, audit });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/categories/:catId/move ──────────────────────────────────
// Move an athlete from round 1 to an empty/bye slot in round 1.

drawRouter.post('/:id/categories/:catId/move', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const catId = Number(req.params.catId);
    const { regId, targetOrdinal, targetSide } = req.body ?? {};
    if (!regId || !targetOrdinal || !targetSide) {
      return res.status(400).json({ error: 'regId, targetOrdinal, and targetSide (A|B) are required' });
    }
    if (targetSide !== 'A' && targetSide !== 'B') {
      return res.status(400).json({ error: 'targetSide must be A or B' });
    }

    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Competition not found' });
    if (comp.status !== 'DRAW_GENERATED') {
      return res.status(400).json({ error: 'Draw must be in DRAW_GENERATED status to move' });
    }

    const r1Matches = await db.select().from(matches)
      .where(and(eq(matches.competitionCategoryId, catId), eq(matches.round, 1)))
      .all();

    const sourceMatch = r1Matches.find((m) => m.competitorAId === regId || m.competitorBId === regId);
    if (!sourceMatch) {
      return res.status(400).json({ error: 'Athlete not found in round 1' });
    }
    if (sourceMatch.isBronze) {
      return res.status(400).json({ error: 'Cannot move from a bronze match' });
    }

    const targetMatch = r1Matches.find((m) => m.ordinal === targetOrdinal);
    if (!targetMatch) {
      return res.status(400).json({ error: 'Target match not found' });
    }
    if (targetMatch.isBronze) {
      return res.status(400).json({ error: 'Cannot move into a bronze match' });
    }

    const targetSlot = targetSide === 'A' ? targetMatch.competitorAId : targetMatch.competitorBId;
    if (targetSlot != null) {
      return res.status(400).json({ error: 'Target slot is not empty' });
    }

    if (sourceMatch.id === targetMatch.id) {
      return res.status(400).json({ error: 'Source and target are the same match' });
    }

    const sourceSide = sourceMatch.competitorAId === regId ? 'A' : 'B';
    const sourceCol = sourceSide === 'A' ? 'competitorAId' : 'competitorBId';
    const targetCol = targetSide === 'A' ? 'competitorAId' : 'competitorBId';

    await db.transaction(async (tx) => {
      await tx.update(matches).set({ [sourceCol]: null }).where(eq(matches.id, sourceMatch.id)).run();
      await tx.update(matches).set({ [targetCol]: regId }).where(eq(matches.id, targetMatch.id)).run();
      await syncRound1ByeAdvancements(tx, catId);
    });

    const updatedR1 = await db.select().from(matches)
      .where(and(eq(matches.competitionCategoryId, catId), eq(matches.round, 1)))
      .all();
    const audit = await computeDetailedAudit(updatedR1, db);

    res.json({ ok: true, audit });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/start ────────────────────────────────────────────────────
// Transition to IN_PROGRESS.

drawRouter.post('/:id/start', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Competition not found' });
    if (!canTransition(comp.status as CompetitionStatus, 'IN_PROGRESS')) {
      return res.status(400).json({ error: `Cannot start from status ${comp.status}` });
    }
    await db.update(competitions).set({ status: 'IN_PROGRESS' }).where(eq(competitions.id, compId)).run();
    res.json({ ok: true, status: 'IN_PROGRESS' });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/matches/:matchId/result ──────────────────────────────────
// Enter match result.

drawRouter.post('/:id/matches/:matchId/result', async (req, res, next) => {
  try {
    const compId = Number(req.params.id);
    const matchId = Number(req.params.matchId);
    const { scoreA, scoreB, resultType, winnerRegistrationId } = req.body ?? {};
    if (scoreA == null || scoreB == null) return res.status(400).json({ error: 'scoreA and scoreB are required' });

    const db = getDb();
    const comp = await db.select().from(competitions).where(eq(competitions.id, compId)).get();
    if (!comp) return res.status(404).json({ error: 'Competition not found' });

    const match = await db.select().from(matches).where(eq(matches.id, matchId)).get();
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status === 'COMPLETED') return res.status(400).json({ error: 'Match already completed' });
    if (match.status === 'BYE') return res.status(400).json({ error: 'Cannot enter result for a bye' });
    if (!match.competitorAId || !match.competitorBId) {
      return res.status(400).json({ error: 'Both competitors must be set' });
    }

    const sA = Number(scoreA);
    const sB = Number(scoreB);
    let winnerId: number | null = null;
    if (
      winnerRegistrationId != null &&
      (Number(winnerRegistrationId) === match.competitorAId || Number(winnerRegistrationId) === match.competitorBId)
    ) {
      winnerId = Number(winnerRegistrationId);
    } else {
      winnerId = sA > sB ? match.competitorAId : sB > sA ? match.competitorBId : match.competitorAId;
    }

    await db.transaction(async (tx) => {
      await tx.update(matches).set({
        scoreA: sA,
        scoreB: sB,
        resultType: resultType ?? 'REGULAR',
        winnerRegistrationId: winnerId,
        status: 'COMPLETED',
      }).where(eq(matches.id, matchId)).run();

      // Advance winner to next round
      if (!match.isBronze) {
        const nextOrd = Math.ceil(match.ordinal / 2);
        const nextSlot = match.ordinal % 2 === 1 ? 'competitorAId' : 'competitorBId';
        await tx.update(matches)
          .set({ [nextSlot]: winnerId, status: 'PENDING' })
          .where(and(
            eq(matches.competitionCategoryId, match.competitionCategoryId),
            eq(matches.round, match.round + 1),
            eq(matches.ordinal, nextOrd),
          ))
          .run();
      }

      // Bronze match: create when both semis are complete (if bronze enabled)
      const catAllNonBronze = await tx.select().from(matches)
        .where(and(
          eq(matches.competitionCategoryId, match.competitionCategoryId),
          eq(matches.isBronze, false),
        ))
        .all();
      const maxRound = Math.max(...catAllNonBronze.map((m) => m.round), 1);
      const semiRound = maxRound - 1;

      if (maxRound >= 2 && match.round === semiRound && !match.isBronze) {
        const semis = catAllNonBronze.filter((m) => m.round === semiRound);
        const bothComplete = semis.length === 2 && semis.every((s) => s.status === 'COMPLETED' || s.id === matchId);
        if (bothComplete) {
          const existingBronze = await tx.select().from(matches)
            .where(and(
              eq(matches.competitionCategoryId, match.competitionCategoryId),
              eq(matches.isBronze, true),
            ))
            .get();

          if (!existingBronze && comp.bronzeMatchEnabled) {
            const losers = semis.map((s) => {
              const smWinner = s.id === matchId ? winnerId : s.winnerRegistrationId;
              const loserId = smWinner === s.competitorAId ? s.competitorBId : s.competitorAId;
              return loserId;
            }).filter((id): id is number => id != null);

            if (losers.length === 2) {
              await tx.insert(matches).values({
                competitionCategoryId: match.competitionCategoryId,
                round: semiRound,
                form: 'Match pour la 3e place',
                ordinal: 3,
                isBronze: true,
                competitorAId: losers[0],
                competitorBId: losers[1],
                status: 'PENDING',
              }).run();
            }
          }
        }
      }
    });

    res.json({ ok: true, winnerId });
  } catch (err) {
    next(err);
  }
});
