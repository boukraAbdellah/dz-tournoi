import { Router, type Request, type Response } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import {
  getDb,
  competitions,
  competitionCategories,
  registrations,
  athletes,
  clubs,
  wilayas,
  matches,
  sportTemplates,
  ageCategories,
  weightDivisions,
  computeCompetitionRankings,
  renderParticipantListHtml,
  renderCategoryListHtml,
  renderBracketHtml,
  renderBracketsDocumentHtml,
  renderMatchSheetsHtml,
  renderRankingsHtml,
  renderCertificateHtml,
  renderCertificatesDocumentHtml,
  type DocumentLanguage,
  type DocumentFormat,
  type CompetitionDocMeta,
  type ParticipantDocItem,
  type CategoryDocItem,
  type BracketDocCategory,
  type MatchSheetDocItem,
  type CertificateDocItem,
} from '@sport-competition/core';
import { generatePdfFromHtml } from '../services/pdf.ts';
import { ageAtDate } from '../utils.ts';

export const documentsRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCompDocMeta(comp: any, template: any): CompetitionDocMeta {
  return {
    id: comp.id,
    name: comp.name,
    date: comp.date,
    location: comp.location,
    sportName: template?.name || 'Sport de combat',
    organizer: 'Ligue / Fédération de Sport de Combat',
  };
}

// ── GET /:id/documents (Catalog) ─────────────────────────────────────────────

documentsRouter.get('/:id/documents', async (req: Request, res: Response) => {
  const compId = Number(req.params.id);
  const db = getDb();

  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });

  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, comp.sportTemplateId)).get();

  // Categories
  const rawCats = db
    .select({
      id: competitionCategories.id,
      gender: competitionCategories.gender,
      enabled: competitionCategories.enabled,
      ageCatName: ageCategories.name,
      weightDivName: weightDivisions.name,
    })
    .from(competitionCategories)
    .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
    .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
    .where(eq(competitionCategories.competitionId, compId))
    .all();

  const categories = rawCats
    .filter((c) => c.enabled)
    .map((c) => ({
      id: c.id,
      name: `${c.ageCatName} - ${c.weightDivName} (${c.gender})`,
      gender: c.gender as 'M' | 'F',
    }));

  // Registration count
  const allRegs = db.select().from(registrations).where(eq(registrations.competitionId, compId)).all();
  const registeredCount = allRegs.filter((r) => r.status === 'REGISTERED').length;

  const status = comp.status;
  const isDrawReady = ['DRAW_GENERATED', 'DRAW_CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(status);
  const isMatchReady = ['DRAW_CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(status);
  const isRankingsReady = ['IN_PROGRESS', 'COMPLETED'].includes(status);

  res.json({
    competition: getCompDocMeta(comp, template),
    status,
    registeredCount,
    categories,
    catalog: [
      {
        key: 'participants',
        titleFr: 'Liste des participants',
        titleAr: 'قائمة المشاركين',
        ready: true,
        itemCount: registeredCount,
      },
      {
        key: 'categories',
        titleFr: 'Liste des catégories & divisions',
        titleAr: 'قائمة الفئات والأوزان',
        ready: true,
        itemCount: categories.length,
      },
      {
        key: 'brackets',
        titleFr: 'Tableaux de compétition (Arbres)',
        titleAr: 'جداول المنافسة (القرعة)',
        ready: isDrawReady,
        itemCount: categories.length,
      },
      {
        key: 'match-sheets',
        titleFr: 'Feuilles de match',
        titleAr: 'استمارات المباريات',
        ready: isDrawReady || isMatchReady,
        itemCount: categories.length,
      },
      {
        key: 'rankings',
        titleFr: 'Classement officiel & Podiums',
        titleAr: 'الترتيب العام الرسمي والمنصات',
        ready: isRankingsReady,
        itemCount: categories.length,
      },
      {
        key: 'certificates-participation',
        titleFr: 'Attestations de participation',
        titleAr: 'شهادات المشاركة',
        ready: registeredCount > 0,
        itemCount: registeredCount,
      },
      {
        key: 'certificates-winner',
        titleFr: 'Diplômes de podium',
        titleAr: 'شهادات التتويج والتفوق',
        ready: isRankingsReady,
        itemCount: categories.length * 3,
      },
    ],
  });
});

// ── GET /:id/documents/participants ──────────────────────────────────────────

documentsRouter.get('/:id/documents/participants', async (req: Request, res: Response) => {
  const compId = Number(req.params.id);
  const lang = (req.query.lang as DocumentLanguage) || 'fr';
  const format = (req.query.format as DocumentFormat) || 'html';
  const db = getDb();

  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, comp.sportTemplateId)).get();

  const rawParticipants = db
    .select({
      id: registrations.id,
      athleteId: athletes.id,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
      birthDate: athletes.birthDate,
      gender: athletes.gender,
      regWeightKg: registrations.weightKg,
      athleteWeightKg: athletes.weightKg,
      status: registrations.status,
      clubName: clubs.name,
      wilayaName: wilayas.nameFr,
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
    .where(eq(registrations.competitionId, compId))
    .all();

  const participants: ParticipantDocItem[] = rawParticipants.map((p) => ({
    id: p.id,
    athleteId: p.athleteId,
    firstName: p.firstName,
    lastName: p.lastName,
    birthDate: p.birthDate,
    age: ageAtDate(p.birthDate, comp.date),
    gender: p.gender as 'M' | 'F',
    weightKg: p.regWeightKg ?? p.athleteWeightKg,
    clubName: p.clubName || '-',
    wilayaName: p.wilayaName || '-',
    categoryName: p.ageCatName && p.weightDivName ? `${p.ageCatName} ${p.weightDivName}` : '-',
    status: p.status,
  }));

  const html = renderParticipantListHtml(getCompDocMeta(comp, template), participants, lang);

  if (format === 'pdf') {
    try {
      const pdf = await generatePdfFromHtml(html, { landscape: false });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="participants-${comp.id}.pdf"`);
      return res.send(pdf);
    } catch (err: any) {
      return res.status(500).json({ error: `PDF generation failed: ${err.message}` });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ── GET /:id/documents/categories ───────────────────────────────────────────

documentsRouter.get('/:id/documents/categories', async (req: Request, res: Response) => {
  const compId = Number(req.params.id);
  const lang = (req.query.lang as DocumentLanguage) || 'fr';
  const format = (req.query.format as DocumentFormat) || 'html';
  const db = getDb();

  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, comp.sportTemplateId)).get();

  const rawCats = db
    .select({
      id: competitionCategories.id,
      gender: competitionCategories.gender,
      enabled: competitionCategories.enabled,
      format: competitionCategories.format,
      ageCatName: ageCategories.name,
      minAge: ageCategories.minAge,
      maxAge: ageCategories.maxAge,
      weightDivName: weightDivisions.name,
      minKg: weightDivisions.minKg,
      maxKg: weightDivisions.maxKg,
    })
    .from(competitionCategories)
    .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
    .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
    .where(eq(competitionCategories.competitionId, compId))
    .all();

  const allRegs = db.select().from(registrations).where(eq(registrations.competitionId, compId)).all();
  const allMatches = db.select().from(matches).all();

  const categories: CategoryDocItem[] = rawCats
    .filter((c) => c.enabled)
    .map((c) => {
      const pCount = allRegs.filter((r) => r.subDepartmentId === c.id && r.status === 'REGISTERED').length;
      const mCount = allMatches.filter((m) => m.competitionCategoryId === c.id).length;
      return {
        id: c.id,
        name: `${c.ageCatName} - ${c.weightDivName} (${c.gender})`,
        gender: c.gender as 'M' | 'F',
        minAge: c.minAge ?? 0,
        maxAge: c.maxAge,
        minKg: c.minKg,
        maxKg: c.maxKg,
        participantCount: pCount,
        matchesCount: mCount,
        format: c.format || 'SINGLE_ELIM',
      };
    });

  const html = renderCategoryListHtml(getCompDocMeta(comp, template), categories, lang);

  if (format === 'pdf') {
    try {
      const pdf = await generatePdfFromHtml(html, { landscape: false });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="categories-${comp.id}.pdf"`);
      return res.send(pdf);
    } catch (err: any) {
      return res.status(500).json({ error: `PDF generation failed: ${err.message}` });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ── GET /:id/documents/brackets ─────────────────────────────────────────────

documentsRouter.get('/:id/documents/brackets', async (req: Request, res: Response) => {
  const compId = Number(req.params.id);
  const lang = (req.query.lang as DocumentLanguage) || 'fr';
  const format = (req.query.format as DocumentFormat) || 'html';
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const db = getDb();

  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, comp.sportTemplateId)).get();

  // Find target categories
  let catQuery = db
    .select({
      id: competitionCategories.id,
      gender: competitionCategories.gender,
      enabled: competitionCategories.enabled,
      ageCatName: ageCategories.name,
      weightDivName: weightDivisions.name,
    })
    .from(competitionCategories)
    .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
    .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
    .where(eq(competitionCategories.competitionId, compId));

  let rawCats = catQuery.all().filter((c) => c.enabled);
  if (categoryId) {
    rawCats = rawCats.filter((c) => c.id === categoryId);
  }
  if (!rawCats.length) return res.status(404).json({ error: 'No categories found' });

  // Athletes lookup map
  const rawRegs = db
    .select({
      id: registrations.id,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
      clubName: clubs.name,
      wilayaName: wilayas.nameFr,
    })
    .from(registrations)
    .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
    .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
    .leftJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
    .where(eq(registrations.competitionId, compId))
    .all();

  const regMap = new Map<number, { name: string; club: string; wilaya: string }>();
  for (const r of rawRegs) {
    regMap.set(r.id, {
      name: `${r.lastName} ${r.firstName}`,
      club: r.clubName || '-',
      wilaya: r.wilayaName || '-',
    });
  }

  // Generate HTML for categories
  const bracketCats: BracketDocCategory[] = [];
  for (const c of rawCats) {
    const rawMatches = db
      .select()
      .from(matches)
      .where(eq(matches.competitionCategoryId, c.id))
      .all();

    const bracketMatches = rawMatches.map((m) => {
      const compA = m.competitorAId ? regMap.get(m.competitorAId) : null;
      const compB = m.competitorBId ? regMap.get(m.competitorBId) : null;
      const winner = m.winnerRegistrationId ? regMap.get(m.winnerRegistrationId)?.name : null;

      return {
        id: m.id,
        round: m.round,
        ordinal: m.ordinal,
        form: m.form,
        isBronze: m.isBronze,
        competitorA: compA,
        competitorB: compB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        winnerRegistrationId: m.winnerRegistrationId,
        winnerName: winner,
        status: m.status,
      };
    });

    bracketCats.push({
      id: c.id,
      name: `${c.ageCatName} - ${c.weightDivName} (${c.gender})`,
      gender: c.gender as 'M' | 'F',
      matches: bracketMatches,
      roundsCount: Math.max(...bracketMatches.map((m) => m.round), 1),
    });
  }

  const combinedHtml = renderBracketsDocumentHtml(getCompDocMeta(comp, template), bracketCats, lang);

  if (format === 'pdf') {
    try {
      const pdf = await generatePdfFromHtml(combinedHtml, { landscape: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="bracket-${comp.id}${categoryId ? `-${categoryId}` : ''}.pdf"`);
      return res.send(pdf);
    } catch (err: any) {
      return res.status(500).json({ error: `PDF generation failed: ${err.message}` });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(combinedHtml);
});

// ── GET /:id/documents/match-sheets ─────────────────────────────────────────

documentsRouter.get('/:id/documents/match-sheets', async (req: Request, res: Response) => {
  const compId = Number(req.params.id);
  const lang = (req.query.lang as DocumentLanguage) || 'fr';
  const format = (req.query.format as DocumentFormat) || 'html';
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const matchId = req.query.matchId ? Number(req.query.matchId) : undefined;
  const db = getDb();

  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, comp.sportTemplateId)).get();

  // Athletes lookup
  const rawRegs = db
    .select({
      id: registrations.id,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
      athleteWeightKg: athletes.weightKg,
      regWeightKg: registrations.weightKg,
      clubName: clubs.name,
      wilayaName: wilayas.nameFr,
    })
    .from(registrations)
    .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
    .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
    .leftJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
    .where(eq(registrations.competitionId, compId))
    .all();

  const regMap = new Map<number, { name: string; club: string; wilaya: string; weightKg?: number | null }>();
  for (const r of rawRegs) {
    regMap.set(r.id, {
      name: `${r.lastName} ${r.firstName}`,
      club: r.clubName || '-',
      wilaya: r.wilayaName || '-',
      weightKg: r.regWeightKg ?? r.athleteWeightKg,
    });
  }

  // Categories lookup
  const rawCats = db
    .select({
      id: competitionCategories.id,
      gender: competitionCategories.gender,
      ageCatName: ageCategories.name,
      weightDivName: weightDivisions.name,
    })
    .from(competitionCategories)
    .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
    .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
    .where(eq(competitionCategories.competitionId, compId))
    .all();

  const catMap = new Map<number, { name: string; gender: 'M' | 'F' }>();
  for (const c of rawCats) {
    catMap.set(c.id, {
      name: `${c.ageCatName} - ${c.weightDivName}`,
      gender: c.gender as 'M' | 'F',
    });
  }

  // Fetch matches
  let allMatches = db.select().from(matches).all();
  // Filter matches belonging to this competition's categories
  allMatches = allMatches.filter((m) => catMap.has(m.competitionCategoryId));

  if (categoryId) {
    allMatches = allMatches.filter((m) => m.competitionCategoryId === categoryId);
  }
  if (matchId) {
    allMatches = allMatches.filter((m) => m.id === matchId);
  }

  const sheets: MatchSheetDocItem[] = allMatches.map((m) => {
    const cat = catMap.get(m.competitionCategoryId);
    return {
      matchId: m.id,
      round: m.round,
      form: m.form,
      ordinal: m.ordinal,
      isBronze: m.isBronze,
      categoryName: cat?.name || 'Catégorie',
      gender: cat?.gender || 'M',
      competitorA: m.competitorAId ? regMap.get(m.competitorAId) : null,
      competitorB: m.competitorBId ? regMap.get(m.competitorBId) : null,
    };
  });

  const html = renderMatchSheetsHtml(getCompDocMeta(comp, template), sheets, lang);

  if (format === 'pdf') {
    try {
      const pdf = await generatePdfFromHtml(html, { landscape: false });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="match-sheets-${comp.id}.pdf"`);
      return res.send(pdf);
    } catch (err: any) {
      return res.status(500).json({ error: `PDF generation failed: ${err.message}` });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ── GET /:id/documents/rankings ─────────────────────────────────────────────

documentsRouter.get('/:id/documents/rankings', async (req: Request, res: Response) => {
  const compId = Number(req.params.id);
  const lang = (req.query.lang as DocumentLanguage) || 'fr';
  const format = (req.query.format as DocumentFormat) || 'html';
  const db = getDb();

  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, comp.sportTemplateId)).get();

  // Load categories
  const rawCats = db
    .select({
      id: competitionCategories.id,
      gender: competitionCategories.gender,
      enabled: competitionCategories.enabled,
      ageCatName: ageCategories.name,
      weightDivName: weightDivisions.name,
    })
    .from(competitionCategories)
    .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
    .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
    .where(eq(competitionCategories.competitionId, compId))
    .all();

  const formattedCats = rawCats
    .filter((c) => c.enabled)
    .map((c) => ({
      id: c.id,
      name: `${c.ageCatName} - ${c.weightDivName} (${c.gender})`,
      gender: c.gender,
    }));

  const catIds = new Set(formattedCats.map((c) => c.id));

  // Load registrations
  const rawRegs = db
    .select({
      id: registrations.id,
      athleteId: athletes.id,
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
    .where(eq(registrations.competitionId, compId))
    .all();

  const formattedRegs = rawRegs.map((r) => ({
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

  const allMatches = db.select().from(matches).all();
  const compMatches = allMatches.filter((m) => catIds.has(m.competitionCategoryId));

  let pointsConfig = { gold: 5, silver: 3, bronze: 1 };
  if (comp.rankPoints) {
    try {
      pointsConfig = { ...pointsConfig, ...JSON.parse(comp.rankPoints) };
    } catch {}
  }

  const rankings = computeCompetitionRankings(formattedCats, formattedRegs, compMatches, {
    bronzeMatchEnabled: comp.bronzeMatchEnabled,
    pointsConfig,
  });

  const html = renderRankingsHtml(getCompDocMeta(comp, template), rankings, lang);

  if (format === 'pdf') {
    try {
      const pdf = await generatePdfFromHtml(html, { landscape: false });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="rankings-${comp.id}.pdf"`);
      return res.send(pdf);
    } catch (err: any) {
      return res.status(500).json({ error: `PDF generation failed: ${err.message}` });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ── GET /:id/documents/certificates ─────────────────────────────────────────

documentsRouter.get('/:id/documents/certificates', async (req: Request, res: Response) => {
  const compId = Number(req.params.id);
  const lang = (req.query.lang as DocumentLanguage) || 'ar';
  const format = (req.query.format as DocumentFormat) || 'html';
  const certType = (req.query.certType as 'participation' | 'winner') || 'participation';
  const registrationId = req.query.registrationId ? Number(req.query.registrationId) : undefined;
  const db = getDb();

  const comp = db.select().from(competitions).where(eq(competitions.id, compId)).get();
  if (!comp) return res.status(404).json({ error: 'Competition not found' });
  const template = db.select().from(sportTemplates).where(eq(sportTemplates.id, comp.sportTemplateId)).get();

  const certItems: CertificateDocItem[] = [];

  if (certType === 'winner') {
    // Calculate rankings to get podium winners
    const rawCats = db
      .select({
        id: competitionCategories.id,
        gender: competitionCategories.gender,
        enabled: competitionCategories.enabled,
        ageCatName: ageCategories.name,
        weightDivName: weightDivisions.name,
      })
      .from(competitionCategories)
      .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
      .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
      .where(eq(competitionCategories.competitionId, compId))
      .all();

    const formattedCats = rawCats
      .filter((c) => c.enabled)
      .map((c) => ({
        id: c.id,
        name: `${c.ageCatName} - ${c.weightDivName} (${c.gender})`,
        gender: c.gender,
      }));

    const catIds = new Set(formattedCats.map((c) => c.id));

    const rawRegs = db
      .select({
        id: registrations.id,
        athleteId: athletes.id,
        firstName: athletes.firstName,
        lastName: athletes.lastName,
        gender: athletes.gender,
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
      .where(eq(registrations.competitionId, compId))
      .all();

    const formattedRegs = rawRegs.map((r) => ({
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

    const allMatches = db.select().from(matches).all();
    const compMatches = allMatches.filter((m) => catIds.has(m.competitionCategoryId));

    const rankings = computeCompetitionRankings(formattedCats, formattedRegs, compMatches, {
      bronzeMatchEnabled: comp.bronzeMatchEnabled,
    });

    for (const cat of rankings.categories) {
      for (const athlete of cat.podium) {
        if (registrationId && athlete.registrationId !== registrationId) continue;
        if (!athlete.rank || athlete.rank > 3) continue; // Only 1st, 2nd, 3rd place podium winners
        certItems.push({
          type: 'winner',
          athleteName: athlete.athleteName,
          clubName: athlete.clubName || '-',
          wilayaName: athlete.wilayaName || '-',
          categoryName: cat.categoryName,
          gender: (cat.gender as 'M' | 'F') || 'M',
          rank: athlete.rank,
          medal: athlete.medal || undefined,
          competitionName: comp.name,
          competitionDate: comp.date,
          competitionLocation: comp.location,
          sportName: template?.name || 'Sport de combat',
        });
      }
    }
  } else {
    // Participation certificates for registered athletes
    const rawRegs = db
      .select({
        id: registrations.id,
        firstName: athletes.firstName,
        lastName: athletes.lastName,
        gender: athletes.gender,
        clubName: clubs.name,
        wilayaName: wilayas.nameFr,
        ageCatName: ageCategories.name,
        weightDivName: weightDivisions.name,
        status: registrations.status,
      })
      .from(registrations)
      .innerJoin(athletes, eq(registrations.athleteId, athletes.id))
      .leftJoin(clubs, eq(registrations.clubIdAtRegistration, clubs.id))
      .leftJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
      .leftJoin(competitionCategories, eq(registrations.subDepartmentId, competitionCategories.id))
      .leftJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
      .leftJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
      .where(
        registrationId
          ? and(eq(registrations.competitionId, compId), eq(registrations.id, registrationId))
          : eq(registrations.competitionId, compId),
      )
      .all();

    for (const r of rawRegs) {
      if (r.status !== 'REGISTERED') continue;
      certItems.push({
        type: 'participation',
        athleteName: `${r.lastName} ${r.firstName}`,
        clubName: r.clubName || '-',
        wilayaName: r.wilayaName || '-',
        categoryName: r.ageCatName && r.weightDivName ? `${r.ageCatName} ${r.weightDivName}` : 'Toutes Catégories',
        gender: r.gender as 'M' | 'F',
        competitionName: comp.name,
        competitionDate: comp.date,
        competitionLocation: comp.location,
        sportName: template?.name || 'Sport de combat',
      });
    }
  }

  if (certItems.length === 0) {
    return res.status(404).json({ error: 'No certificate recipients found' });
  }

  const combinedHtml = renderCertificatesDocumentHtml(certItems, lang);

  if (format === 'pdf') {
    try {
      const pdf = await generatePdfFromHtml(combinedHtml, { landscape: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificates-${certType}-${comp.id}.pdf"`);
      return res.send(pdf);
    } catch (err: any) {
      return res.status(500).json({ error: `PDF generation failed: ${err.message}` });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(combinedHtml);
});
