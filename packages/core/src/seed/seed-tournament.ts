#!/usr/bin/env node
// Seeds a full multi-category tournament covering bracket sizes n=2, 3, 4, 7, 8, 16.
// Usage: npm run seed:tournament

import { eq, and } from 'drizzle-orm';
import { getDb, getRawDb, initDb } from '../db/connection.ts';
import { runMigrations } from '../db/migrate.ts';
import {
  athletes,
  clubs,
  competitions,
  competitionCategories,
  registrations,
  sportTemplates,
  ageCategories,
  weightDivisions,
} from '../db/schema.ts';
import { seedIfEmpty, seedClubs } from './runner.ts';
import { dbPath, ensureDataDir } from '../../../api/src/config.ts';

ensureDataDir();
initDb(dbPath());
await runMigrations(getRawDb());
await seedIfEmpty();
await seedClubs();

const db = getDb();

// ── Ensure standard test clubs ───────────────────────────────────────────
const allClubs = await db.select().from(clubs).all();
const clubMap = new Map(allClubs.map((c) => [c.name, c.id]));

function getClubId(name: string): number {
  const id = clubMap.get(name);
  if (id) return id;
  return allClubs[0]?.id ?? 1;
}

const CLUB_AS_KABYLE = getClubId('AS Kabyle');
const CLUB_MC_ALGER = getClubId('MC Alger');
const CLUB_ES_SETIF = getClubId('ES Sétif');
const CLUB_MC_ORAN = getClubId('MC Oran');
const CLUB_CS_CONSTANTINE = getClubId('CS Constantine');
const CLUB_CRB_CHLEF = getClubId('CRB Chlef');

// ── Template lookup ───────────────────────────────────────────────────────
const karateTemplate = await db.select().from(sportTemplates).where(eq(sportTemplates.slug, 'karate')).get();
if (!karateTemplate) {
  console.error('[seed] Karate template not found');
  process.exit(1);
}

// ── Create Competition ────────────────────────────────────────────────────
const compDate = '2026-10-15';
const compName = 'Championnat National de Karaté 2026';

let comp = await db.select().from(competitions).where(eq(competitions.name, compName)).get();

if (comp) {
  await db.delete(competitions).where(eq(competitions.id, comp.id)).run();
}

const [insertedComp] = await db.insert(competitions).values({
  name: compName,
  date: compDate,
  location: 'Coupole du Complexe Olympique Mohamed Boudiaf - Alger',
  description: 'Tournoi officiel regroupant les catégories Minimes, Cadets, Juniors et Seniors pour tests complets.',
  sportTemplateId: karateTemplate.id,
  bronzeMatchEnabled: true,
  clubRankingEnabled: true,
  wilayaRankingEnabled: true,
  rankPoints: '{"gold":5,"silver":3,"bronze":1}',
  status: 'DRAFT',
}).returning();

if (!insertedComp) {
  console.error('Failed to create competition');
  process.exit(1);
}
comp = insertedComp;

console.log(`[seed] Created competition "${comp.name}" (id: ${comp.id})`);

// ── Materialize Categories from Template ──────────────────────────────────
const ages = await db.select().from(ageCategories).where(eq(ageCategories.templateId, karateTemplate.id)).all();
const weights = await db.select().from(weightDivisions).where(eq(weightDivisions.templateId, karateTemplate.id)).all();

await db.transaction(async (tx) => {
  for (const age of ages) {
    for (const weight of weights) {
      if (weight.ageCategoryId !== age.id) continue;
      for (const gender of ['M', 'F'] as const) {
        await tx.insert(competitionCategories).values({
          competitionId: comp!.id,
          ageCategoryId: age.id,
          weightDivisionId: weight.id,
          gender,
          enabled: true,
          format: 'SINGLE_ELIM',
        }).run();
      }
    }
  }
});

interface AthleteSeedDef {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F';
  weightKg: number;
  clubId: number;
  targetCategoryKey: string;
}

const SEED_ROSTER: AthleteSeedDef[] = [
  // ── 1. U13 M -45 kg (2 athletes) ──────────────────────────────────
  { firstName: 'Yanis', lastName: 'Benali', birthDate: '2013-03-10', gender: 'M', weightKg: 43.5, clubId: CLUB_MC_ALGER, targetCategoryKey: 'U13:-45 kg:M' },
  { firstName: 'Nassim', lastName: 'Idir', birthDate: '2013-07-22', gender: 'M', weightKg: 44.0, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'U13:-45 kg:M' },

  // ── 2. U13 M -50 kg (3 athletes) ──────────────────────────────────
  { firstName: 'Ayoub', lastName: 'Lounis', birthDate: '2013-02-14', gender: 'M', weightKg: 48.0, clubId: CLUB_ES_SETIF, targetCategoryKey: 'U13:-50 kg:M' },
  { firstName: 'Rami', lastName: 'Bouzid', birthDate: '2013-05-19', gender: 'M', weightKg: 49.2, clubId: CLUB_MC_ORAN, targetCategoryKey: 'U13:-50 kg:M' },
  { firstName: 'Zinedine', lastName: 'Saadi', birthDate: '2013-09-08', gender: 'M', weightKg: 47.5, clubId: CLUB_CS_CONSTANTINE, targetCategoryKey: 'U13:-50 kg:M' },

  // ── 3. U15 M -55 kg (4 athletes) ───────────────────────────────────
  { firstName: 'Anis', lastName: 'Belkacem', birthDate: '2011-05-10', gender: 'M', weightKg: 51.5, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'U15:-55 kg:M' },
  { firstName: 'Tarek', lastName: 'Ait Slimane', birthDate: '2012-03-25', gender: 'M', weightKg: 53.0, clubId: CLUB_MC_ALGER, targetCategoryKey: 'U15:-55 kg:M' },
  { firstName: 'Mehdi', lastName: 'Bouzid', birthDate: '2011-07-02', gender: 'M', weightKg: 50.5, clubId: CLUB_ES_SETIF, targetCategoryKey: 'U15:-55 kg:M' },
  { firstName: 'Adam', lastName: 'Mebarki', birthDate: '2012-01-15', gender: 'M', weightKg: 54.0, clubId: CLUB_MC_ORAN, targetCategoryKey: 'U15:-55 kg:M' },

  // ── 4. U15 M -60 kg (7 athletes) ───────────────────────────────────
  { firstName: 'Khaled', lastName: 'Ait Yahia', birthDate: '2011-09-18', gender: 'M', weightKg: 58.0, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'U15:-60 kg:M' },
  { firstName: 'Samy', lastName: 'Bouzian', birthDate: '2012-06-30', gender: 'M', weightKg: 59.5, clubId: CLUB_MC_ALGER, targetCategoryKey: 'U15:-60 kg:M' },
  { firstName: 'Younes', lastName: 'Mansouri', birthDate: '2011-11-12', gender: 'M', weightKg: 57.0, clubId: CLUB_ES_SETIF, targetCategoryKey: 'U15:-60 kg:M' },
  { firstName: 'Islam', lastName: 'Boumiza', birthDate: '2012-04-05', gender: 'M', weightKg: 58.5, clubId: CLUB_MC_ORAN, targetCategoryKey: 'U15:-60 kg:M' },
  { firstName: 'Ryad', lastName: 'Charef', birthDate: '2011-02-20', gender: 'M', weightKg: 56.5, clubId: CLUB_CS_CONSTANTINE, targetCategoryKey: 'U15:-60 kg:M' },
  { firstName: 'Abderrahmane', lastName: 'Djamel', birthDate: '2012-08-14', gender: 'M', weightKg: 59.0, clubId: CLUB_CRB_CHLEF, targetCategoryKey: 'U15:-60 kg:M' },
  { firstName: 'Walid', lastName: 'Ghezali', birthDate: '2011-12-01', gender: 'M', weightKg: 57.8, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'U15:-60 kg:M' },

  // ── 5. U17 M -68 kg (8 athletes) ──────────────────────────────────
  { firstName: 'Amine', lastName: 'Guerfi', birthDate: '2009-03-12', gender: 'M', weightKg: 64.0, clubId: CLUB_MC_ALGER, targetCategoryKey: 'U17:-68 kg:M' },
  { firstName: 'Bilel', lastName: 'Meziane', birthDate: '2009-08-25', gender: 'M', weightKg: 65.5, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'U17:-68 kg:M' },
  { firstName: 'Chamseddine', lastName: 'Khelil', birthDate: '2009-01-18', gender: 'M', weightKg: 63.0, clubId: CLUB_ES_SETIF, targetCategoryKey: 'U17:-68 kg:M' },
  { firstName: 'Djamel', lastName: 'Bensalem', birthDate: '2009-11-04', gender: 'M', weightKg: 66.0, clubId: CLUB_MC_ORAN, targetCategoryKey: 'U17:-68 kg:M' },
  { firstName: 'Elies', lastName: 'Rahmouni', birthDate: '2009-06-30', gender: 'M', weightKg: 62.5, clubId: CLUB_CS_CONSTANTINE, targetCategoryKey: 'U17:-68 kg:M' },
  { firstName: 'Fares', lastName: 'Hamdani', birthDate: '2009-09-15', gender: 'M', weightKg: 65.8, clubId: CLUB_CRB_CHLEF, targetCategoryKey: 'U17:-68 kg:M' },
  { firstName: 'Ghiles', lastName: 'Azzoug', birthDate: '2009-04-02', gender: 'M', weightKg: 64.2, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'U17:-68 kg:M' },
  { firstName: 'Houssam', lastName: 'Taibi', birthDate: '2009-10-20', gender: 'M', weightKg: 63.8, clubId: CLUB_MC_ALGER, targetCategoryKey: 'U17:-68 kg:M' },

  // ── 6. Seniors M -68 kg (16 athletes) ─────────────────────────────────
  { firstName: 'Yacine', lastName: 'Belkacem', birthDate: '1998-04-12', gender: 'M', weightKg: 66.5, clubId: CLUB_MC_ALGER, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Riad', lastName: 'Lounis', birthDate: '1999-09-20', gender: 'M', weightKg: 66.8, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Samir', lastName: 'Bencheikh', birthDate: '1997-02-15', gender: 'M', weightKg: 65.0, clubId: CLUB_ES_SETIF, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Mourad', lastName: 'Hamdi', birthDate: '2000-11-30', gender: 'M', weightKg: 66.0, clubId: CLUB_MC_ORAN, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Nadir', lastName: 'Zerouki', birthDate: '1996-06-18', gender: 'M', weightKg: 65.5, clubId: CLUB_CS_CONSTANTINE, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Oussama', lastName: 'Brahimi', birthDate: '1999-01-25', gender: 'M', weightKg: 67.0, clubId: CLUB_CRB_CHLEF, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Sofiane', lastName: 'Feghouli', birthDate: '1998-12-10', gender: 'M', weightKg: 66.2, clubId: CLUB_MC_ALGER, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Tewfik', lastName: 'Boudebouz', birthDate: '2001-03-05', gender: 'M', weightKg: 65.8, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Walid', lastName: 'Mesloub', birthDate: '1997-07-28', gender: 'M', weightKg: 66.4, clubId: CLUB_ES_SETIF, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Zakaria', lastName: 'Draoui', birthDate: '2000-08-14', gender: 'M', weightKg: 65.2, clubId: CLUB_MC_ORAN, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Akram', lastName: 'Bouras', birthDate: '1999-05-22', gender: 'M', weightKg: 66.9, clubId: CLUB_CS_CONSTANTINE, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Billel', lastName: 'Benhammouda', birthDate: '1998-10-17', gender: 'M', weightKg: 65.7, clubId: CLUB_CRB_CHLEF, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Chouaib', lastName: 'Keddad', birthDate: '1996-04-03', gender: 'M', weightKg: 66.1, clubId: CLUB_MC_ALGER, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Djaber', lastName: 'Naidji', birthDate: '2001-09-12', gender: 'M', weightKg: 65.4, clubId: CLUB_AS_KABYLE, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Farid', lastName: 'Chaouchi', birthDate: '1995-12-01', gender: 'M', weightKg: 66.7, clubId: CLUB_ES_SETIF, targetCategoryKey: 'Seniors:-68 kg:M' },
  { firstName: 'Hocine', lastName: 'Metref', birthDate: '1998-02-19', gender: 'M', weightKg: 65.9, clubId: CLUB_MC_ORAN, targetCategoryKey: 'Seniors:-68 kg:M' },
];

// ── Map category key to competition category ID ───────────────────────────
const compCats = await db.select({
  id: competitionCategories.id,
  ageCategoryName: ageCategories.name,
  weightDivisionName: weightDivisions.name,
  gender: competitionCategories.gender,
})
  .from(competitionCategories)
  .innerJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
  .innerJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
  .where(eq(competitionCategories.competitionId, comp.id))
  .all();

const catKeyToId = new Map<string, number>();
for (const c of compCats) {
  catKeyToId.set(`${c.ageCategoryName}:${c.weightDivisionName}:${c.gender}`, c.id);
}

// Enable only our 6 target categories
const targetKeys = new Set([
  'U13:-45 kg:M',
  'U13:-50 kg:M',
  'U15:-55 kg:M',
  'U15:-60 kg:M',
  'U17:-68 kg:M',
  'Seniors:-68 kg:M',
]);

await db.transaction(async (tx) => {
  for (const c of compCats) {
    const key = `${c.ageCategoryName}:${c.weightDivisionName}:${c.gender}`;
    await tx.update(competitionCategories)
      .set({ enabled: targetKeys.has(key) })
      .where(eq(competitionCategories.id, c.id))
      .run();
  }
});

// ── Insert Athletes and Registrations ─────────────────────────────────────
console.log(`[seed] Registering ${SEED_ROSTER.length} athletes across 6 target categories...`);

let regCountTotal = 0;

await db.transaction(async (tx) => {
  for (const item of SEED_ROSTER) {
    const categoryId = catKeyToId.get(item.targetCategoryKey);
    if (!categoryId) {
      console.warn(`[seed] Category not found for key: ${item.targetCategoryKey}`);
      continue;
    }

    // Insert or find athlete
    const existing = await tx.select().from(athletes)
      .where(and(
        eq(athletes.firstName, item.firstName),
        eq(athletes.lastName, item.lastName),
        eq(athletes.birthDate, item.birthDate),
      ))
      .get();

    let athleteId = existing?.id;
    if (!athleteId) {
      const [created] = await tx.insert(athletes).values({
        firstName: item.firstName,
        lastName: item.lastName,
        birthDate: item.birthDate,
        gender: item.gender,
        weightKg: item.weightKg,
        clubId: item.clubId,
      }).returning();
      if (!created) continue;
      athleteId = created.id;
    }

    // Register into competition
    await tx.insert(registrations).values({
      competitionId: comp!.id,
      athleteId,
      weightKg: item.weightKg,
      clubIdAtRegistration: item.clubId,
      subDepartmentId: categoryId,
      status: 'REGISTERED',
    }).run();

    regCountTotal++;
  }
});

// ── Transition Competition Status to REGISTRATION_CLOSED ──────────────────
await db.update(competitions)
  .set({ status: 'REGISTRATION_OPEN' })
  .where(eq(competitions.id, comp.id))
  .run();

await db.update(competitions)
  .set({ status: 'REGISTRATION_CLOSED' })
  .where(eq(competitions.id, comp.id))
  .run();

console.log('');
console.log('═════════════════════════════════════════════════════════════════════');
console.log(`  🏆 Competition: "${comp.name}" (ID: ${comp.id})`);
console.log(`  📅 Date:        ${comp.date}`);
console.log(`  📍 Location:    ${comp.location}`);
console.log(`  ⚙️ Status:      REGISTRATION_CLOSED (Ready for Draw Generation)`);
console.log(`  👥 Total:       ${regCountTotal} athletes registered`);
console.log('─────────────────────────────────────────────────────────────────────');
console.log('  🎯 Configured Categories for Testing:');
console.log('     1. U13 M -45 kg      → 2 athletes  (Instant Final, n=2)');
console.log('     2. U13 M -50 kg      → 3 athletes  (1 Bye + Semi + Final, n=3)');
console.log('     3. U15 M -55 kg      → 4 athletes  (2 Semis + Bronze + Final, n=4)');
console.log('     4. U15 M -60 kg      → 7 athletes  (1 Bye + Quarters, n=7)');
console.log('     5. U17 M -68 kg      → 8 athletes  (Full 8-bracket, n=8)');
console.log('     6. Seniors M -68 kg  → 16 athletes (Full 16-bracket, n=16)');
console.log('═════════════════════════════════════════════════════════════════════');
console.log(`\nOpen http://127.0.0.1:5175/competitions/${comp.id} to test draw generation!`);
process.exit(0);
