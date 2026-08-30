import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Reference: wilaya / city
// ---------------------------------------------------------------------------

export const wilayas = sqliteTable('wilaya', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: integer('code_58').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
});

export const cities = sqliteTable('city', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  wilayaId: integer('wilaya_id')
    .notNull()
    .references(() => wilayas.id),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
});

// ---------------------------------------------------------------------------
// Directory: club / athlete
// ---------------------------------------------------------------------------

export const clubs = sqliteTable('club', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  wilayaId: integer('wilaya_id')
    .notNull()
    .references(() => wilayas.id),
  cityId: integer('city_id')
    .notNull()
    .references(() => cities.id),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
});

export const athletes = sqliteTable('athlete', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date').notNull(), // ISO yyyy-mm-dd
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  weightKg: real('weight_kg'),
  clubId: integer('club_id').references(() => clubs.id),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Sport templates
// ---------------------------------------------------------------------------

export const sportTemplates = sqliteTable('sport_template', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  builtin: integer('builtin', { mode: 'boolean' }).notNull().default(false),
  settings: text('settings').notNull().default('{}'), // JSON
});

export const ageCategories = sqliteTable('age_category', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  templateId: integer('template_id')
    .notNull()
    .references(() => sportTemplates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  minAge: integer('min_age').notNull(),
  maxAge: integer('max_age'), // NULL = open
  orderIndex: integer('order_index').notNull().default(0),
});

export const weightDivisions = sqliteTable('weight_division', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  templateId: integer('template_id')
    .notNull()
    .references(() => sportTemplates.id, { onDelete: 'cascade' }),
  ageCategoryId: integer('age_category_id')
    .notNull()
    .references(() => ageCategories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  minKg: real('min_kg'), // NULL = open
  maxKg: real('max_kg'), // NULL = open
  orderIndex: integer('order_index').notNull().default(0),
});

// ---------------------------------------------------------------------------
// Competition
// ---------------------------------------------------------------------------

export const competitionStatus = [
  'DRAFT',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'DRAW_GENERATED',
  'DRAW_CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
] as const;
export type CompetitionStatus = (typeof competitionStatus)[number];

export const competitions = sqliteTable('competition', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  date: text('date').notNull(), // ISO yyyy-mm-dd
  location: text('location'),
  description: text('description'),
  sportTemplateId: integer('sport_template_id')
    .notNull()
    .references(() => sportTemplates.id),
  bronzeMatchEnabled: integer('bronze_match_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  clubRankingEnabled: integer('club_ranking_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  wilayaRankingEnabled: integer('wilaya_ranking_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  rankPoints: text('rank_points').notNull().default('{"gold":5,"silver":3,"bronze":1}'), // JSON
  status: text('status', { enum: competitionStatus }).notNull().default('DRAFT'),
});

export const competitionCategories = sqliteTable('competition_category', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  competitionId: integer('competition_id')
    .notNull()
    .references(() => competitions.id, { onDelete: 'cascade' }),
  ageCategoryId: integer('age_category_id')
    .notNull()
    .references(() => ageCategories.id),
  weightDivisionId: integer('weight_division_id')
    .notNull()
    .references(() => weightDivisions.id),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  format: text('format', { enum: ['SINGLE_ELIM'] }).notNull().default('SINGLE_ELIM'),
  rngSeed: integer('rng_seed'),
  drawGeneratedAt: text('draw_generated_at'),
  drawLockedAt: text('draw_locked_at'),
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export const registrationStatus = ['REGISTERED', 'WITHDRAWN'] as const;
export type RegistrationStatus = (typeof registrationStatus)[number];

export const registrations = sqliteTable('registration', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  competitionId: integer('competition_id')
    .notNull()
    .references(() => competitions.id, { onDelete: 'cascade' }),
  athleteId: integer('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  subDepartmentId: integer('sub_department_id').references(() => competitionCategories.id),
  weightKg: real('weight_kg'),
  clubIdAtRegistration: integer('club_id_at_registration').references(() => clubs.id),
  status: text('status', { enum: registrationStatus }).notNull().default('REGISTERED'),
});

// ---------------------------------------------------------------------------
// Matches (bracket)
// ---------------------------------------------------------------------------

export const matchStatus = ['PENDING', 'COMPLETED', 'BYE'] as const;
export type MatchStatus = (typeof matchStatus)[number];

export const matches = sqliteTable('match', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  competitionCategoryId: integer('competition_category_id')
    .notNull()
    .references(() => competitionCategories.id, { onDelete: 'cascade' }),
  round: integer('round').notNull(), // 1 = first round
  form: text('form').notNull(), // display name, e.g. "Round of 16"
  ordinal: integer('ordinal').notNull(), // 1-based match number in the round
  isBronze: integer('is_bronze', { mode: 'boolean' }).notNull().default(false),
  competitorAId: integer('competitor_a_id').references(() => registrations.id),
  competitorBId: integer('competitor_b_id').references(() => registrations.id),
  scoreA: integer('score_a'),
  scoreB: integer('score_b'),
  resultType: text('result_type').notNull().default('REGULAR'),
  winnerRegistrationId: integer('winner_registration_id').references(() => registrations.id),
  status: text('status', { enum: matchStatus }).notNull().default('PENDING'),
});

// Unique: one slot per (category, round, ordinal)
export type Wilaya = typeof wilayas.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type Athlete = typeof athletes.$inferSelect;
export type SportTemplate = typeof sportTemplates.$inferSelect;
export type AgeCategory = typeof ageCategories.$inferSelect;
export type WeightDivision = typeof weightDivisions.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type CompetitionCategory = typeof competitionCategories.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Match = typeof matches.$inferSelect;