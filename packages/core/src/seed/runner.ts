import { count, eq } from 'drizzle-orm';
import { getDb } from '../db/connection.ts';
import {
  ageCategories,
  athletes,
  cities,
  clubs,
  sportTemplates,
  weightDivisions,
  wilayas,
  users,
} from '../db/schema.ts';
import { SEED_WILAYAS } from './wilayas.ts';
import { SEED_COMMUNES } from './communes.ts';
import { SEED_TEMPLATES } from './templates.ts';
import { SEED_CLUBS, SEED_ATHLETES } from './demo-data.ts';

const DEFAULT_ADMIN_HASH = '$2b$10$6VR6V5sikDRfi.k/228I/.uDDqaazyHg9HJg0wIf81kCQl46G6zyW'; // 'admin123'

export async function seedUsers(): Promise<boolean> {
  const db = getDb();
  const userCount = (await db.select({ n: count() }).from(users).get())?.n ?? 0;
  if (userCount > 0) return false;

  await db.insert(users).values({
    name: 'Directeur Technique National (Super Admin)',
    email: 'admin@sport-competition.dz',
    passwordHash: DEFAULT_ADMIN_HASH,
    role: 'ADMIN',
    wilayaId: null,
  }).run();

  console.log('[seed] default super admin account created: admin@sport-competition.dz / admin123');
  return true;
}

// ── Reference data ────────────────────────────────────────────────────────

export async function seedReferenceData(): Promise<boolean> {
  const db = getDb();
  const wilayaCount = (await db.select({ n: count() }).from(wilayas).get())?.n ?? 0;
  let seeded = false;

  if (wilayaCount === 0) {
    for (const w of SEED_WILAYAS) {
      const [inserted] = await db
        .insert(wilayas)
        .values({ code: w.code, nameAr: w.nameAr, nameFr: w.nameFr })
        .returning();
      if (!inserted) continue;
      const communes = SEED_COMMUNES[w.code] ?? [];
      if (communes.length > 0) {
        await db.insert(cities).values(
          communes.map((c) => ({
            wilayaId: inserted.id,
            nameAr: c.nameAr,
            nameFr: c.nameFr,
          }))
        ).run();
      }
    }
    seeded = true;
    const totalCommunes = Object.values(SEED_COMMUNES).reduce((s, arr) => s + arr.length, 0);
    console.log(`[seed] inserted ${SEED_WILAYAS.length} wilayas + ${totalCommunes} communes`);
  }

  const templateCount = (await db.select({ n: count() }).from(sportTemplates).get())?.n ?? 0;
  if (templateCount === 0) {
    for (const tmpl of SEED_TEMPLATES) {
      const [inserted] = await db
        .insert(sportTemplates)
        .values({ name: tmpl.name, slug: tmpl.slug, builtin: true, settings: JSON.stringify(tmpl.settings) })
        .returning();
      if (!inserted) continue;

      const ageIdByName = new Map<string, number>();
      let i = 0;
      for (const ac of tmpl.ageCategories) {
        const [row] = await db
          .insert(ageCategories)
          .values({ templateId: inserted.id, name: ac.name, minAge: ac.minAge, maxAge: ac.maxAge, orderIndex: i++ })
          .returning();
        if (row) ageIdByName.set(ac.name, row.id);
      }

      const weightRows = [];
      let j = 0;
      for (const wd of tmpl.weightDivisions) {
        const ageCategoryId = ageIdByName.get(wd.ageName);
        if (ageCategoryId == null) continue;
        weightRows.push({
          templateId: inserted.id,
          ageCategoryId,
          name: wd.name,
          minKg: wd.minKg,
          maxKg: wd.maxKg,
          orderIndex: j++,
        });
      }
      if (weightRows.length > 0) {
        await db.insert(weightDivisions).values(weightRows).run();
      }
    }
    seeded = true;
    console.log(`[seed] inserted ${SEED_TEMPLATES.length} sport templates`);
  }

  await seedUsers();

  return seeded;
}

// ── Clubs ─────────────────────────────────────────────────────────────────

export async function seedClubs(): Promise<boolean> {
  const db = getDb();
  const clubCount = (await db.select({ n: count() }).from(clubs).get())?.n ?? 0;
  if (clubCount > 0) return false;

  // Build wilaya lookup (code → id)
  const allWilayas = await db.select().from(wilayas).all();
  const wilayaIdByCode = new Map(allWilayas.map((w) => [w.code, w.id]));

  // Build city lookup (wilayaId + nameFr → id)
  const allCities = await db.select().from(cities).all();
  const cityIdByKey = new Map(allCities.map((c) => [`${c.wilayaId}:${c.nameFr.toLowerCase()}`, c.id]));

  await db.transaction(async (tx) => {
    for (const seed of SEED_CLUBS) {
      const wilayaId = wilayaIdByCode.get(seed.wilayaCode);
      if (wilayaId == null) {
        console.warn(`[seed] wilaya code ${seed.wilayaCode} not found for club "${seed.name}", skipping`);
        continue;
      }
      const cityKey = `${wilayaId}:${seed.communeNameFr.toLowerCase()}`;
      const cityId = cityIdByKey.get(cityKey);
      if (cityId == null) {
        console.warn(`[seed] city "${seed.communeNameFr}" not found in wilaya ${seed.wilayaCode} for club "${seed.name}", skipping`);
        continue;
      }
      await tx.insert(clubs).values({
        name: seed.name,
        wilayaId,
        cityId,
        phone: seed.phone ?? null,
      }).run();
    }
  });

  const inserted = (await db.select({ n: count() }).from(clubs).get())?.n ?? 0;
  console.log(`[seed] inserted ${inserted} clubs`);
  return true;
}

// ── Athletes ──────────────────────────────────────────────────────────────

export async function seedAthletes(): Promise<boolean> {
  const db = getDb();
  const athleteCount = (await db.select({ n: count() }).from(athletes).get())?.n ?? 0;
  if (athleteCount > 0) return false;

  // Build club lookup (index → id)
  const allClubs = await db.select().from(clubs).all();

  await db.transaction(async (tx) => {
    for (const seed of SEED_ATHLETES) {
      const clubId = allClubs[seed.clubIndex]?.id ?? null;
      await tx.insert(athletes).values({
        firstName: seed.firstName,
        lastName: seed.lastName,
        birthDate: seed.birthDate,
        gender: seed.gender,
        weightKg: seed.weightKg,
        clubId,
        phone: seed.phone ?? null,
      }).run();
    }
  });

  const inserted = (await db.select({ n: count() }).from(athletes).get())?.n ?? 0;
  console.log(`[seed] inserted ${inserted} athletes`);
  return true;
}

// ── Main entry point ──────────────────────────────────────────────────────

/** Seed reference data (wilayas/cities + built-in templates) if the DB is empty. Returns true if seeded. */
export async function seedIfEmpty(): Promise<boolean> {
  const refSeeded = await seedReferenceData();
  return refSeeded;
}

/** True when the wilaya table has rows at all. */
export async function isSeeded(): Promise<boolean> {
  const n = (await getDb().select({ n: count() }).from(wilayas).get())?.n ?? 0;
  return n > 0;
}

/** Look up a wilaya id by code. */
export async function wilayaByCode(code: number): Promise<number | undefined> {
  const row = await getDb().select({ id: wilayas.id }).from(wilayas).where(eq(wilayas.code, code)).get();
  return row?.id;
}
