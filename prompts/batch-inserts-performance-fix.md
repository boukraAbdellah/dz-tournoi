# Feature: Batch Bulk Inserts for Cloud Database Performance (Turso)

## Goal
Eliminate the 10+ second latency on `POST /api/competitions` and draw generation by replacing sequential `for` loop `await insert(...).run()` calls with single-query batch bulk inserts (`db.insert(...).values(array).run()`).

---

## Root Cause Analysis (Database vs API)
- **Database Engine**: Turso Cloud (libSQL in AWS Frankfurt `eu-west-1`).
- **Network Latency**: Each HTTPS request from the local machine to AWS Frankfurt takes ~120ms - 180ms round-trip.
- **The Bug**:
  In `POST /api/competitions` (lines 166-182 in `packages/api/src/routes/competitions.ts`):
  When a competition is created with the Karate template, it has 32 weight divisions × 2 genders = **64 categories**.
  The code runs:
  ```ts
  for (const age of ages) {
    for (const weight of weights) {
      for (const gender of ['M', 'F']) {
        await tx.insert(competitionCategories).values(...).run(); // Individual network call!
      }
    }
  }
  ```
  This performs **64 consecutive round-trips** over the public internet to Turso Cloud:
  `64 calls × ~165ms = 10,630ms (~10.6 seconds)`.
- **Similar Bottlenecks Found**:
  - `POST /api/competitions/:id/generate-draw`: Loops through all rounds and matches, executing `await tx.insert(matches)...run()` individually (causing 15-20s draw generation times).
  - `POST /api/competitions/:id/categories/:catId/regenerate-draw`: Same match insertion loop.
  - `POST /api/competitions/:id/categories/:catId/register-matched`: Sequential registrations in a loop.

---

## Architecture References
- **Drizzle ORM & SQLite / libSQL**:
  Drizzle natively supports bulk inserts:
  `await tx.insert(table).values(itemsArray).run();`
  This constructs a single multi-row `INSERT INTO ... VALUES (...), (...), ...` statement and executes it in **one single round-trip (~150ms)** instead of 64 round-trips (10,600ms).

---

## Files Expected to Change
- **[MODIFY]** `packages/api/src/routes/competitions.ts`:
  - In `POST /`: Collect all 64 `competitionCategories` in memory and insert them in a single batch.
  - In `register-matched`: Bulk insert matched registrations.
- **[MODIFY]** `packages/api/src/routes/draw.ts`:
  - In `generate-draw`: Collect all generated `matches` across all categories and rounds and insert them in bulk batches.
  - In `regenerate-draw`: Bulk insert regenerated matches for the category.

---

## Acceptance Criteria
- [ ] `POST /api/competitions` execution time drops from ~10.6s to under 300ms.
- [ ] All 64 categories (M & F) are properly created and linked.
- [ ] Draw generation execution time drops from multiple seconds to under 400ms.
- [ ] All matches and bracket links remain 100% intact and verified by tests.

---

## Validation Steps
1. Run `npm run typecheck` across all packages.
2. Run `npm test` across packages.
3. Measure execution time of `POST /api/competitions` using a benchmark script to verify latency < 350ms.
