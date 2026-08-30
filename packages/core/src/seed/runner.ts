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
} from '../db/schema.ts';
import { SEED_WILAYAS } from './wilayas.ts';
import { SEED_COMMUNES } from './communes.ts';
import { SEED_TEMPLATES } from './templates.ts';
import { SEED_CLUBS, SEED_ATHLETES } from './demo-data.ts';

// ── Reference data ────────────────────────────────────────────────────────

function seedReferenceData(): boolean {
  const db = getDb();
  const wilayaCount = db.select({ n: count() }).from(wilayas).get()?.n ?? 0;
  let seeded = false;

  if (wilayaCount === 0) {
    db.transaction((tx) => {
      for (const w of SEED_WILAYAS) {
        const inserted = tx
          .insert(wilayas)
          .values({ code: w.code, nameAr: w.nameAr, nameFr: w.nameFr })
          .returning()
          .get();
        const communes = SEED_COMMUNES[w.code] ?? [];
        for (const c of communes) {
          tx.insert(cities).values({ wilayaId: inserted.id, nameAr: c.nameAr, nameFr: c.nameFr }).run();
        }
      }
    });
    seeded = true;
    const totalCommunes = Object.values(SEED_COMMUNES).reduce((s, arr) => s + arr.length, 0);
    console.log(`[seed] inserted ${SEED_WILAYAS.length} wilayas + ${totalCommunes} communes`);
  }

  const templateCount = db.select({ n: count() }).from(sportTemplates).get()?.n ?? 0;
  if (templateCount === 0) {
    db.transaction((tx) => {
      for (const tmpl of SEED_TEMPLATES) {
        const inserted = tx
          .insert(sportTemplates)
          .values({ name: tmpl.name, slug: tmpl.slug, builtin: true, settings: JSON.stringify(tmpl.settings) })
          .returning()
          .get();

        const ageIdByName = new Map<string, number>();
        tmpl.ageCategories.forEach((ac, i) => {
          const row = tx
            .insert(ageCategories)
            .values({ templateId: inserted.id, name: ac.name, minAge: ac.minAge, maxAge: ac.maxAge, orderIndex: i })
            .returning()
            .get();
          ageIdByName.set(ac.name, row.id);
        });

        tmpl.weightDivisions.forEach((wd, i) => {
          const ageCategoryId = ageIdByName.get(wd.ageName);
          if (ageCategoryId == null) return;
          tx.insert(weightDivisions)
            .values({
              templateId: inserted.id,
              ageCategoryId,
              name: wd.name,
              minKg: wd.minKg,
              maxKg: wd.maxKg,
              orderIndex: i,
            })
            .run();
        });
      }
    });
    seeded = true;
    console.log(`[seed] inserted ${SEED_TEMPLATES.length} sport templates`);
  }

  return seeded;
}

// ── Clubs ─────────────────────────────────────────────────────────────────

export function seedClubs(): boolean {
  const db = getDb();
  const clubCount = db.select({ n: count() }).from(clubs).get()?.n ?? 0;
  if (clubCount > 0) return false;

  // Build wilaya lookup (code → id)
  const allWilayas = db.select().from(wilayas).all();
  const wilayaIdByCode = new Map(allWilayas.map((w) => [w.code, w.id]));

  // Build city lookup (wilayaId + nameFr → id)
  const allCities = db.select().from(cities).all();
  const cityIdByKey = new Map(allCities.map((c) => [`${c.wilayaId}:${c.nameFr.toLowerCase()}`, c.id]));

  db.transaction((tx) => {
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
      tx.insert(clubs).values({
        name: seed.name,
        wilayaId,
        cityId,
        phone: seed.phone ?? null,
      }).run();
    }
  });

  const inserted = db.select({ n: count() }).from(clubs).get()?.n ?? 0;
  console.log(`[seed] inserted ${inserted} clubs`);
  return true;
}

// ── Athletes ──────────────────────────────────────────────────────────────

export function seedAthletes(): boolean {
  const db = getDb();
  const athleteCount = db.select({ n: count() }).from(athletes).get()?.n ?? 0;
  if (athleteCount > 0) return false;

  // Build club lookup (index → id)
  const allClubs = db.select().from(clubs).all();

  db.transaction((tx) => {
    for (const seed of SEED_ATHLETES) {
      const clubId = allClubs[seed.clubIndex]?.id ?? null;
      tx.insert(athletes).values({
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

  const inserted = db.select({ n: count() }).from(athletes).get()?.n ?? 0;
  console.log(`[seed] inserted ${inserted} athletes`);
  return true;
}

// ── Main entry point ──────────────────────────────────────────────────────

/** Seed reference data (wilayas/cities + built-in templates) if the DB is empty. Returns true if seeded. */
export function seedIfEmpty(): boolean {
  const refSeeded = seedReferenceData();
  return refSeeded;
}

/** True when the wilaya table has rows at all. */
export function isSeeded(): boolean {
  const n = getDb().select({ n: count() }).from(wilayas).get()?.n ?? 0;
  return n > 0;
}

/** Look up a wilaya id by code. */
export function wilayaByCode(code: number): number | undefined {
  return getDb().select({ id: wilayas.id }).from(wilayas).where(eq(wilayas.code, code)).get()?.id;
}
