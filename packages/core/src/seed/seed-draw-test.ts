#!/usr/bin/env node
// Seed a Karate competition with 32 male cadets for draw testing.
// Usage: npm run seed:draw-test

import { eq, count } from 'drizzle-orm';
import { getDb, getRawDb, initDb } from '../db/connection.ts';
import { runMigrations } from '../db/migrate.ts';
import {
  athletes, clubs, competitions, competitionCategories,
  registrations, sportTemplates, ageCategories, weightDivisions,
} from '../db/schema.ts';
import { seedClubs, seedAthletes } from './runner.ts';
import { dbPath, ensureDataDir } from '../../../api/src/config.ts';

// ── Init ──────────────────────────────────────────────────────────────────

ensureDataDir();
initDb(dbPath());
await runMigrations(getRawDb());
await seedClubs();
await seedAthletes();

const db = getDb();

// ── Club lookup ───────────────────────────────────────────────────────────

const CLUB_NAMES = ['AS Kabyle', 'MC Alger', 'ES Sétif', 'MC Oran'];
const clubRows = await db.select().from(clubs).all();
const clubIdByName = new Map(clubRows.map((c) => [c.name, c.id]));

for (const name of CLUB_NAMES) {
  if (!clubIdByName.has(name)) {
    console.error(`[seed] Club "${name}" not found. Available: ${clubRows.map((c) => c.name).join(', ')}`);
    process.exit(1);
  }
}

// ── Athlete data ──────────────────────────────────────────────────────────

interface AthleteSeed {
  firstName: string;
  lastName: string;
  birthDate: string;
  weightKg: number;
  clubName: string;
}

const CADETS_55: AthleteSeed[] = [
  { firstName: 'Anis', lastName: 'Belkacem', birthDate: '2011-05-10', weightKg: 51, clubName: 'AS Kabyle' },
  { firstName: 'Tarek', lastName: 'Ait Slimane', birthDate: '2012-03-25', weightKg: 53, clubName: 'MC Alger' },
  { firstName: 'Mehdi', lastName: 'Bouzid', birthDate: '2011-07-02', weightKg: 50, clubName: 'ES Sétif' },
  { firstName: 'Adam', lastName: 'Mebarki', birthDate: '2012-01-15', weightKg: 54, clubName: 'MC Oran' },
  { firstName: 'Khaled', lastName: 'Ait Yahia', birthDate: '2011-09-18', weightKg: 52, clubName: 'AS Kabyle' },
  { firstName: 'Samy', lastName: 'Bouzian', birthDate: '2012-06-30', weightKg: 55, clubName: 'MC Alger' },
  { firstName: 'Younes', lastName: 'Mansouri', birthDate: '2011-11-12', weightKg: 51, clubName: 'ES Sétif' },
  { firstName: 'Islam', lastName: 'Boumiza', birthDate: '2012-04-05', weightKg: 53, clubName: 'MC Oran' },
  { firstName: 'Ryad', lastName: 'Charef', birthDate: '2011-02-20', weightKg: 50, clubName: 'AS Kabyle' },
  { firstName: 'Abderrahmane', lastName: 'Djamel', birthDate: '2012-08-14', weightKg: 54, clubName: 'MC Alger' },
  { firstName: 'Walid', lastName: 'Ghezali', birthDate: '2011-12-01', weightKg: 52, clubName: 'ES Sétif' },
  { firstName: 'Bilal', lastName: 'Hadj', birthDate: '2012-05-18', weightKg: 55, clubName: 'MC Oran' },
  { firstName: 'Nassim', lastName: 'Idir', birthDate: '2011-08-09', weightKg: 51, clubName: 'AS Kabyle' },
  { firstName: 'Karim', lastName: 'Khelifi', birthDate: '2012-02-28', weightKg: 53, clubName: 'MC Alger' },
  { firstName: 'Ayoub', lastName: 'Lounis', birthDate: '2011-06-14', weightKg: 50, clubName: 'ES Sétif' },
  { firstName: 'Rami', lastName: 'Madani', birthDate: '2012-07-22', weightKg: 54, clubName: 'MC Oran' },
];

const CADETS_60: AthleteSeed[] = [
  { firstName: 'Sofiane', lastName: 'Nedjar', birthDate: '2011-04-30', weightKg: 58, clubName: 'AS Kabyle' },
  { firstName: 'Amine', lastName: 'Ould Ali', birthDate: '2012-09-11', weightKg: 60, clubName: 'MC Alger' },
  { firstName: 'Reda', lastName: 'Rahmani', birthDate: '2011-10-05', weightKg: 57, clubName: 'ES Sétif' },
  { firstName: 'Zinedine', lastName: 'Saadi', birthDate: '2012-04-19', weightKg: 59, clubName: 'MC Oran' },
  { firstName: 'Hocine', lastName: 'Tabet', birthDate: '2011-01-25', weightKg: 56, clubName: 'AS Kabyle' },
  { firstName: 'Farid', lastName: 'Yahi', birthDate: '2012-10-02', weightKg: 60, clubName: 'MC Alger' },
  { firstName: 'Chamseddine', lastName: 'Zitouni', birthDate: '2011-07-17', weightKg: 58, clubName: 'ES Sétif' },
  { firstName: 'Djamel', lastName: 'Amara', birthDate: '2012-03-08', weightKg: 57, clubName: 'MC Oran' },
  { firstName: 'Fares', lastName: 'Bensalem', birthDate: '2011-11-29', weightKg: 59, clubName: 'AS Kabyle' },
  { firstName: 'Ghiles', lastName: 'Cherif', birthDate: '2012-06-12', weightKg: 56, clubName: 'MC Alger' },
  { firstName: 'Ilyes', lastName: 'Dahmani', birthDate: '2011-08-23', weightKg: 60, clubName: 'ES Sétif' },
  { firstName: 'Lotfi', lastName: 'Ferhat', birthDate: '2012-01-04', weightKg: 58, clubName: 'MC Oran' },
  { firstName: 'Mourad', lastName: 'Gacem', birthDate: '2011-05-16', weightKg: 57, clubName: 'AS Kabyle' },
  { firstName: 'Nadir', lastName: 'Hamdi', birthDate: '2012-08-07', weightKg: 59, clubName: 'MC Alger' },
  { firstName: 'Oussama', lastName: 'Kaci', birthDate: '2011-03-12', weightKg: 56, clubName: 'ES Sétif' },
  { firstName: 'Rabah', lastName: 'Larbi', birthDate: '2012-05-31', weightKg: 60, clubName: 'MC Oran' },
];

async function insertAthletes(seeds: AthleteSeed[]): Promise<number[]> {
  const ids: number[] = [];
  await db.transaction(async (tx) => {
    for (const s of seeds) {
      const clubId = clubIdByName.get(s.clubName)!;
      const existing = await tx.select({ id: athletes.id, birthDate: athletes.birthDate })
        .from(athletes)
        .where(eq(athletes.firstName, s.firstName))
        .all();
      const dup = existing.find((e) => e.birthDate === s.birthDate);
      if (dup) {
        ids.push(dup.id);
        continue;
      }
      const [row] = await tx.insert(athletes).values({
        firstName: s.firstName,
        lastName: s.lastName,
        birthDate: s.birthDate,
        gender: 'M',
        weightKg: s.weightKg,
        clubId,
      }).returning();
      if (row) ids.push(row.id);
    }
  });
  return ids;
}

console.log('[seed] Inserting 32 cadet athletes...');
const ids55 = await insertAthletes(CADETS_55);
const ids60 = await insertAthletes(CADETS_60);
console.log(`[seed]   -55 kg: ${ids55.length} athletes`);
console.log(`[seed]   -60 kg: ${ids60.length} athletes`);

// ── Create competition ────────────────────────────────────────────────────

const karateTemplate = await db.select().from(sportTemplates)
  .where(eq(sportTemplates.slug, 'karate')).get();
if (!karateTemplate) {
  console.error('[seed] Karate template not found');
  process.exit(1);
}

// Check if competition already exists
let comp = await db.select().from(competitions)
  .where(eq(competitions.name, 'Test Cadets Karate')).get();

if (!comp) {
  const [createdComp] = await db.insert(competitions).values({
    name: 'Test Cadets Karate',
    date: '2026-10-15',
    location: 'Salle omnisports - Alger',
    description: 'Compétition de test pour le tirage au sort (Cadets -55kg et -60kg)',
    sportTemplateId: karateTemplate.id,
    bronzeMatchEnabled: true,
    clubRankingEnabled: true,
    wilayaRankingEnabled: false,
    rankPoints: '{"gold":5,"silver":3,"bronze":1}',
    status: 'DRAFT',
  }).returning();
  comp = createdComp;
  console.log(`[seed] Created competition "${comp!.name}" (id: ${comp!.id})`);

  // Materialize categories from template
  const ages = await db.select().from(ageCategories)
    .where(eq(ageCategories.templateId, karateTemplate.id)).all();
  const weights = await db.select().from(weightDivisions)
    .where(eq(weightDivisions.templateId, karateTemplate.id)).all();

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
  console.log('[seed] Materialized competition categories from template');
} else {
  console.log(`[seed] Competition "${comp.name}" already exists (id: ${comp.id})`);
}

// ── Find target categories ────────────────────────────────────────────────

const cats = await db.select({
  id: competitionCategories.id,
  ageCategoryName: ageCategories.name,
  weightDivisionName: weightDivisions.name,
  gender: competitionCategories.gender,
  minAge: ageCategories.minAge,
  maxAge: ageCategories.maxAge,
  minKg: weightDivisions.minKg,
  maxKg: weightDivisions.maxKg,
})
  .from(competitionCategories)
  .innerJoin(ageCategories, eq(competitionCategories.ageCategoryId, ageCategories.id))
  .innerJoin(weightDivisions, eq(competitionCategories.weightDivisionId, weightDivisions.id))
  .where(eq(competitionCategories.competitionId, comp!.id))
  .all();

// Disable all categories, then enable only the 2 we need
await db.transaction(async (tx) => {
  for (const c of cats) {
    const isTarget =
      c.gender === 'M' &&
      c.ageCategoryName === 'U15' &&
      ((c.weightDivisionName === '-55 kg') || (c.weightDivisionName === '-60 kg'));

    await tx.update(competitionCategories)
      .set({ enabled: isTarget })
      .where(eq(competitionCategories.id, c.id))
      .run();
  }
});

const cat55 = cats.find((c) => c.gender === 'M' && c.ageCategoryName === 'U15' && c.weightDivisionName === '-55 kg');
const cat60 = cats.find((c) => c.gender === 'M' && c.ageCategoryName === 'U15' && c.weightDivisionName === '-60 kg');

if (!cat55 || !cat60) {
  console.error('[seed] Could not find U15 -55kg or -60kg category');
  process.exit(1);
}

console.log(`[seed] Target categories:`);
console.log(`[seed]   U15 -55 kg (M): id=${cat55.id}`);
console.log(`[seed]   U15 -60 kg (M): id=${cat60.id}`);

// ── Register athletes ─────────────────────────────────────────────────────

async function registerAthletes(athleteIds: number[], categoryId: number): Promise<number> {
  let registered = 0;
  await db.transaction(async (tx) => {
    for (const athleteId of athleteIds) {
      const athlete = await tx.select().from(athletes).where(eq(athletes.id, athleteId)).get();
      if (!athlete) continue;

      const existing = await tx.select().from(registrations)
        .where(eq(registrations.competitionId, comp!.id))
        .all();
      if (existing.some((r) => r.athleteId === athleteId)) continue;

      await tx.insert(registrations).values({
        competitionId: comp!.id,
        athleteId,
        weightKg: athlete.weightKg,
        clubIdAtRegistration: athlete.clubId,
        subDepartmentId: categoryId,
        status: 'REGISTERED',
      }).run();
      registered++;
    }
  });
  return registered;
}

console.log('[seed] Registering athletes...');
const reg55 = await registerAthletes(ids55, cat55.id);
const reg60 = await registerAthletes(ids60, cat60.id);
console.log(`[seed]   Registered ${reg55} in Cadets -55 kg`);
console.log(`[seed]   Registered ${reg60} in Cadets -60 kg`);

// ── Transition status ─────────────────────────────────────────────────────

await db.update(competitions)
  .set({ status: 'REGISTRATION_OPEN' })
  .where(eq(competitions.id, comp!.id))
  .run();

await db.update(competitions)
  .set({ status: 'REGISTRATION_CLOSED' })
  .where(eq(competitions.id, comp!.id))
  .run();

console.log('[seed] Status: DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED');

// ── Summary ───────────────────────────────────────────────────────────────

const totalRegs = (await db.select({ n: count() }).from(registrations)
  .where(eq(registrations.competitionId, comp!.id)).get())?.n ?? 0;

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log(`  Competition: ${comp!.name}`);
console.log(`  Date:        ${comp!.date}`);
console.log(`  Status:      REGISTRATION_CLOSED`);
console.log(`  Total:       ${totalRegs} athletes registered`);
console.log(`  Categories:  Cadets M -55 kg → ${reg55} athletes`);
console.log(`               Cadets M -60 kg → ${reg60} athletes`);
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('Ready for Phase 4 draw generation!');
process.exit(0);
