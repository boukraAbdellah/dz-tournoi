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
import { config, dbPath, ensureDataDir } from '../../../api/src/config.ts';

// ── Init ──────────────────────────────────────────────────────────────────

ensureDataDir();
initDb(dbPath());
runMigrations(getRawDb());
seedClubs();
seedAthletes();

const db = getDb();

// ── Club lookup ───────────────────────────────────────────────────────────

const CLUB_NAMES = ['AS Kabyle', 'MC Alger', 'ES Sétif', 'MC Oran'];
const clubRows = db.select().from(clubs).all();
const clubIdByName = new Map(clubRows.map((c) => [c.name, c.id]));

for (const name of CLUB_NAMES) {
  if (!clubIdByName.has(name)) {
    console.error(`[seed] Club "${name}" not found. Available: ${clubRows.map((c) => c.name).join(', ')}`);
    process.exit(1);
  }
}

// ── Athlete data ──────────────────────────────────────────────────────────
// Competition date: 2026-10-15
// Cadets age = 14-15 on that date → born 2011-04-16 to 2012-10-15

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
  { firstName: 'Bilal', lastName: 'Zeroual', birthDate: '2012-07-18', weightKg: 55, clubName: 'MC Oran' },
  { firstName: 'Yacine', lastName: 'Bensemmane', birthDate: '2011-04-22', weightKg: 51, clubName: 'AS Kabyle' },
  { firstName: 'Imed', lastName: 'Taleb', birthDate: '2012-10-08', weightKg: 53, clubName: 'MC Alger' },
  { firstName: 'Salim', lastName: 'Aoudia', birthDate: '2011-08-30', weightKg: 50, clubName: 'ES Sétif' },
  { firstName: 'Hichem', lastName: 'Khelifi', birthDate: '2012-02-14', weightKg: 54, clubName: 'MC Oran' },
];

const CADETS_60: AthleteSeed[] = [
  { firstName: 'Rayan', lastName: 'Hadj', birthDate: '2011-06-15', weightKg: 57, clubName: 'MC Alger' },
  { firstName: 'Nassim', lastName: 'Cherif', birthDate: '2012-09-03', weightKg: 59, clubName: 'AS Kabyle' },
  { firstName: 'Redouane', lastName: 'Bouziane', birthDate: '2011-01-28', weightKg: 56, clubName: 'ES Sétif' },
  { firstName: 'Zakaria', lastName: 'Mansouri', birthDate: '2012-05-10', weightKg: 60, clubName: 'MC Oran' },
  { firstName: 'Ahmed', lastName: 'Benaissa', birthDate: '2011-10-22', weightKg: 58, clubName: 'AS Kabyle' },
  { firstName: 'Fouad', lastName: 'Hamdi', birthDate: '2012-03-14', weightKg: 57, clubName: 'MC Alger' },
  { firstName: 'Rachid', lastName: 'Slimani', birthDate: '2011-07-05', weightKg: 59, clubName: 'ES Sétif' },
  { firstName: 'Omar', lastName: 'Aoudia', birthDate: '2012-11-19', weightKg: 56, clubName: 'MC Oran' },
  { firstName: 'Karim', lastName: 'Bouzid', birthDate: '2011-03-08', weightKg: 60, clubName: 'AS Kabyle' },
  { firstName: 'Adel', lastName: 'Bensemmane', birthDate: '2012-06-25', weightKg: 58, clubName: 'MC Alger' },
  { firstName: 'Sofiane', lastName: 'Ait Ali', birthDate: '2011-12-12', weightKg: 57, clubName: 'ES Sétif' },
  { firstName: 'Farid', lastName: 'Zeroual', birthDate: '2012-08-01', weightKg: 59, clubName: 'MC Oran' },
  { firstName: 'Samir', lastName: 'Bouzian', birthDate: '2011-05-18', weightKg: 56, clubName: 'AS Kabyle' },
  { firstName: 'Abdelkader', lastName: 'Mebarki', birthDate: '2012-01-30', weightKg: 60, clubName: 'MC Alger' },
  { firstName: 'Mounir', lastName: 'Khelifi', birthDate: '2011-09-14', weightKg: 58, clubName: 'ES Sétif' },
  { firstName: 'Nassim', lastName: 'Djamel', birthDate: '2012-04-28', weightKg: 57, clubName: 'MC Oran' },
];

// ── Insert athletes ───────────────────────────────────────────────────────

function insertAthletes(seeds: AthleteSeed[]): number[] {
  const ids: number[] = [];
  db.transaction((tx) => {
    for (const s of seeds) {
      const clubId = clubIdByName.get(s.clubName)!;
      // Skip if athlete already exists (same name + birthDate)
      const existing = tx.select({ id: athletes.id })
        .from(athletes)
        .where(eq(athletes.firstName, s.firstName))
        .all();
      const dup = existing.find((e) => {
        const row = tx.select({ bd: athletes.birthDate }).from(athletes).where(eq(athletes.id, e.id)).get();
        return row?.bd === s.birthDate;
      });
      if (dup) {
        ids.push(dup.id);
        continue;
      }
      const row = tx.insert(athletes).values({
        firstName: s.firstName,
        lastName: s.lastName,
        birthDate: s.birthDate,
        gender: 'M',
        weightKg: s.weightKg,
        clubId,
      }).returning().get();
      ids.push(row.id);
    }
  });
  return ids;
}

console.log('[seed] Inserting 32 cadet athletes...');
const ids55 = insertAthletes(CADETS_55);
const ids60 = insertAthletes(CADETS_60);
console.log(`[seed]   -55 kg: ${ids55.length} athletes`);
console.log(`[seed]   -60 kg: ${ids60.length} athletes`);

// ── Create competition ────────────────────────────────────────────────────

const karateTemplate = db.select().from(sportTemplates)
  .where(eq(sportTemplates.slug, 'karate')).get();
if (!karateTemplate) {
  console.error('[seed] Karate template not found');
  process.exit(1);
}

// Check if competition already exists
let comp = db.select().from(competitions)
  .where(eq(competitions.name, 'Test Cadets Karate')).get();

if (!comp) {
  comp = db.insert(competitions).values({
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
  }).returning().get();
  console.log(`[seed] Created competition "${comp.name}" (id: ${comp.id})`);

  // Materialize categories from template
  const ages = db.select().from(ageCategories)
    .where(eq(ageCategories.templateId, karateTemplate.id)).all();
  const weights = db.select().from(weightDivisions)
    .where(eq(weightDivisions.templateId, karateTemplate.id)).all();

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
  console.log('[seed] Materialized competition categories from template');
} else {
  console.log(`[seed] Competition "${comp.name}" already exists (id: ${comp.id})`);
}

// ── Find target categories ────────────────────────────────────────────────

const cats = db.select({
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
  .where(eq(competitionCategories.competitionId, comp.id))
  .all();

// Disable all categories, then enable only the 2 we need
db.transaction((tx) => {
  for (const c of cats) {
    const isTarget =
      c.gender === 'M' &&
      c.ageCategoryName === 'Cadets' &&
      ((c.weightDivisionName === '-55 kg') || (c.weightDivisionName === '-60 kg'));

    tx.update(competitionCategories)
      .set({ enabled: isTarget })
      .where(eq(competitionCategories.id, c.id))
      .run();
  }
});

const cat55 = cats.find((c) => c.gender === 'M' && c.ageCategoryName === 'Cadets' && c.weightDivisionName === '-55 kg');
const cat60 = cats.find((c) => c.gender === 'M' && c.ageCategoryName === 'Cadets' && c.weightDivisionName === '-60 kg');

if (!cat55 || !cat60) {
  console.error('[seed] Could not find Cadets -55kg or -60kg category');
  console.error('[seed] Available categories:', cats.map((c) => `${c.ageCategoryName} ${c.weightDivisionName} (${c.gender})`));
  process.exit(1);
}

console.log(`[seed] Target categories:`);
console.log(`[seed]   Cadets -55 kg (M): id=${cat55.id}`);
console.log(`[seed]   Cadets -60 kg (M): id=${cat60.id}`);

// ── Register athletes ─────────────────────────────────────────────────────

function registerAthletes(athleteIds: number[], categoryId: number): number {
  let registered = 0;
  db.transaction((tx) => {
    for (const athleteId of athleteIds) {
      const athlete = tx.select().from(athletes).where(eq(athletes.id, athleteId)).get();
      if (!athlete) continue;

      // Skip if already registered
      const existing = tx.select().from(registrations)
        .where(eq(registrations.competitionId, comp!.id))
        .all();
      if (existing.some((r) => r.athleteId === athleteId)) continue;

      tx.insert(registrations).values({
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
const reg55 = registerAthletes(ids55, cat55.id);
const reg60 = registerAthletes(ids60, cat60.id);
console.log(`[seed]   Registered ${reg55} in Cadets -55 kg`);
console.log(`[seed]   Registered ${reg60} in Cadets -60 kg`);

// ── Transition status ─────────────────────────────────────────────────────

function transitionStatus(target: string) {
  db.update(competitions)
    .set({ status: target as any })
    .where(eq(competitions.id, comp!.id))
    .run();
}

transitionStatus('REGISTRATION_OPEN');
transitionStatus('REGISTRATION_CLOSED');
console.log('[seed] Status: DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED');

// ── Summary ───────────────────────────────────────────────────────────────

const totalRegs = db.select({ n: count() }).from(registrations)
  .where(eq(registrations.competitionId, comp.id)).get()?.n ?? 0;

const regsByCat = db.select({
  catName: weightDivisions.name,
  n: count(),
})
  .from(registrations)
  .innerJoin(competitionCategories, eq(competitionCategories.id, registrations.subDepartmentId))
  .innerJoin(weightDivisions, eq(weightDivisions.id, competitionCategories.weightDivisionId))
  .where(eq(registrations.competitionId, comp.id))
  .all();

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log(`  Competition: ${comp.name}`);
console.log(`  Date:        ${comp.date}`);
console.log(`  Status:      REGISTRATION_CLOSED`);
console.log(`  Total:       ${totalRegs} athletes registered`);
console.log(`  Categories:  Cadets M -55 kg → ${reg55} athletes`);
console.log(`               Cadets M -60 kg → ${reg60} athletes`);
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('Ready for Phase 4 draw generation!');
console.log(`Open http://127.0.0.1:5175/competitions/${comp.id} to test.`);
