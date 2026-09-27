# Implementation Plan: Seed Tournament Multi-Club Distribution & "Championnat Karaté"

## Goal
Update `packages/core/src/seed/seed-tournament.ts` to:
1. Keep the existing tournament ("Championnat National de Karaté 2026", ID 6) intact without deleting or overwriting it.
2. Seed a new competition named `"Championnat Karaté"` (with status `REGISTRATION_CLOSED`, ready for draw generation).
3. Distribute athletes across all distinct existing clubs/leagues in the database (e.g., *League Alger*, *League Oran*, *League bejaia*, *League SKikda*, *league ain temouchent*, *League Sidi bel Abbes*) rather than defaulting all athletes to a single club.

---

## Existing Code Inspected
* [`packages/core/src/seed/seed-tournament.ts`](file:///c:/Dev/Projects/sport-competition/packages/core/src/seed/seed-tournament.ts):
  * Lines 30–45: Looks up hardcoded club names (`AS Kabyle`, `MC Alger`, etc.) and falls back to `allClubs[0]?.id ?? 1` when not found.
  * Lines 54–62: Deletes existing competition matching `compName = 'Championnat National de Karaté 2026'`, which would wipe ID 6.
  * Lines 116–168: Fixed roster mapping to the 6 club constants.
  * Lines 221–256: Registers athletes with `clubIdAtRegistration: item.clubId`.

---

## Architecture References
* `AGENTS.md` - Section 3 (Deterministic Results, Preserve Simplicity), Section 4 (Architecture Boundaries: seed scripts in core), Section 6 (Business Rules).
* [`packages/core/src/db/schema.ts`](file:///c:/Dev/Projects/sport-competition/packages/core/src/db/schema.ts):
  * `clubs`, `athletes`, `competitions`, `competitionCategories`, `registrations`.

---

## Business Rules
* Every registered athlete must have a valid `clubId` and `clubIdAtRegistration`.
* Draw generation and club rankings depend on athletes being affiliated with different clubs to test inter-club separation and club leaderboard points.
* Competition lifecycle progresses from `DRAFT` → `REGISTRATION_OPEN` → `REGISTRATION_CLOSED`.
* Existing competitions in the database must not be unintentionally modified or deleted.

---

## Files Expected to Change
* [`packages/core/src/seed/seed-tournament.ts`](file:///c:/Dev/Projects/sport-competition/packages/core/src/seed/seed-tournament.ts)

---

## Technical Details & Solution
1. **Dynamic Club Mapping:**
   Instead of falling back to `allClubs[0]` when named demo clubs are absent:
   ```typescript
   const allClubs = await db.select().from(clubs).all();
   // Map the 6 roster slots cyclically to all available clubs in DB
   const slotClub = (index: number) => allClubs[index % allClubs.length]?.id ?? 1;
   ```
   If demo clubs (`AS Kabyle`, `MC Alger`, etc.) exist by name in `clubMap`, use them; otherwise, use `slotClub(0)`, `slotClub(1)`, etc., ensuring all 6 existing leagues receive athletes.

2. **Competition Name & Non-destructive Seeding:**
   * Target name: `'Championnat Karaté'` (or customizable via CLI arg `process.argv[2] ?? 'Championnat Karaté'`).
   * Delete *only* prior runs of `'Championnat Karaté'`, leaving `'Championnat National de Karaté 2026'` (ID 6) and other competitions untouched.

3. **Athlete Update / Club Assignment:**
   * Ensure the athlete record in `athletes` and the registration snapshot in `registrations` reflect the assigned club ID.

---

## Risks
* Low risk: Standalone seed script. It does not affect production API routes or frontend code.
* Potential risk of duplicate athlete name collisions in the global athlete pool: Handled cleanly by finding existing athlete and updating club affiliation or registering them for this competition.

---

## Security Considerations
* No auth or API exposure concerns (local CLI seed script).
* Uses Drizzle ORM parameterized queries for safe DB operations against Turso.

---

## Acceptance Criteria
1. Running `npm run seed:tournament` creates a new competition named `"Championnat Karaté"`.
2. Existing competition ID 6 ("Championnat National de Karaté 2026") remains intact in the database.
3. The 40 registered athletes are distributed across multiple clubs/leagues in Turso.
4. The competition status is `REGISTRATION_CLOSED`, ready for draw generation.

---

## Validation Steps
1. Run `npm run seed:tournament`.
2. Query Turso to verify:
   * Competition `"Championnat Karaté"` exists with status `REGISTRATION_CLOSED`.
   * Competition `"Championnat National de Karaté 2026"` still exists.
   * Query `SELECT club_id_at_registration, COUNT(*) FROM registration WHERE competition_id = <new_id> GROUP BY club_id_at_registration` to verify multiple distinct clubs are represented.
3. Run `npm run typecheck` to ensure type correctness.

---

## Manual Testing Steps
1. Navigate to the web app (`http://127.0.0.1:5175/competitions/<new_id>`).
2. Verify in the category lists that athletes display different club/league badges.
3. Generate draws for categories (e.g. U15 M -55 kg, Seniors M -68 kg) and check that athletes from different leagues are paired properly.
