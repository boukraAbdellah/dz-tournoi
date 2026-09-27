# Implementation Prompt: Core Logic, Utility Extractions & Type Safety Refactor

## 1. Goal

Execute 4 targeted architectural improvements requested by the user:
1. **Move `findCategory` to `@sport-competition/core`**: It is pure domain/business logic that determines athlete category assignment based on gender, age, and weight. Moving it to `packages/core` makes it fully testable without requiring the API/database layer, and reusable across both API and Web packages.
2. **Extract `ageAtDate` to `packages/api/src/utils.ts`**: Deduplicate identical age calculation implementations across `competitions.ts`, `draw.ts`, and `documents.ts` (where it was named `calculateAge`).
3. **Replace `any` types in registration modals with typed categories**: Define `CompetitionCategory` in `packages/web/src/components/competition/types.ts` and replace all `any[]` and `(c: any)` / `(w: any)` annotations across `BulkRegisterModal.tsx`, `RegisterExistingModal.tsx`, `InlineRegisterModal.tsx`, and `RegistrationsTable.tsx`.
4. **Extract `STATUS_LABEL` to shared web utility**: Create `packages/web/src/utils/statusLabels.ts` to consolidate the hardcoded status labels currently duplicated between `CompetitionDetail.tsx` and `LifecycleStepper.tsx`.
5. **Business Logic Audit**: After implementing the above changes, perform a thorough audit of remaining business logic gaps (e.g. competition lifecycle state machine guards, draw progression rules, score entry constraints) to identify logic misplaced in route handlers or UI.

---

## 2. Existing Code Inspected

### API Layer
- [`packages/api/src/routes/competitions.ts`](file:///c:/Dev/Projects/sport-competition/packages/api/src/routes/competitions.ts):
  - Lines 24–31: Local `ageAtDate(birthDate, compDate)`
  - Lines 34–62: Local `findCategory(cats, ageCatMap, weightMap, gender, age, weightKg)`
  - Lines 401–402, 458–459, 677–678, 754–755, 855: Usages of `ageAtDate` and `findCategory`
- [`packages/api/src/routes/draw.ts`](file:///c:/Dev/Projects/sport-competition/packages/api/src/routes/draw.ts):
  - Lines 25–32: Local copy of `ageAtDate(birthDate, compDate)`
- [`packages/api/src/routes/documents.ts`](file:///c:/Dev/Projects/sport-competition/packages/api/src/routes/documents.ts):
  - Lines 39–46: Local `calculateAge(birthDate, compDate)` (identical logic to `ageAtDate`)

### Core Layer
- [`packages/core/src/index.ts`](file:///c:/Dev/Projects/sport-competition/packages/core/src/index.ts):
  - Exports domain schemas, bracket logic, rankings logic, document templates, seeders.
- [`packages/core/src/draw/`](file:///c:/Dev/Projects/sport-competition/packages/core/src/draw/):
  - Existing unit tests: `bracket.test.ts` and `rankings.test.ts`.

### Web Layer
- [`packages/web/src/components/competition/types.ts`](file:///c:/Dev/Projects/sport-competition/packages/web/src/components/competition/types.ts):
  - `CompetitionDetail["categories"]` defines category shape: `{ id, ageCategoryId, ageCategoryName, minAge, maxAge, weightDivisionId, weightDivisionName, minKg, maxKg, gender, enabled, registrationCount }`.
- [`packages/web/src/components/competition/BulkRegisterModal.tsx`](file:///c:/Dev/Projects/sport-competition/packages/web/src/components/competition/BulkRegisterModal.tsx):
  - Line 9: `categories: any[]`
  - Lines 13, 15, 43: `(c: any)`, `weights: any[]`, `(w: any)`
- [`packages/web/src/components/competition/RegisterExistingModal.tsx`](file:///c:/Dev/Projects/sport-competition/packages/web/src/components/competition/RegisterExistingModal.tsx):
  - Lines 24, 59: `categories: any[]`
  - Lines 33, 68, 70, 98: `(c: any)`, `weights: any[]`, `(w: any)`
- [`packages/web/src/components/competition/InlineRegisterModal.tsx`](file:///c:/Dev/Projects/sport-competition/packages/web/src/components/competition/InlineRegisterModal.tsx):
  - Line 18: `categories: any[]`
  - Line 23: `(c: any)`
- [`packages/web/src/components/competition/RegistrationsTable.tsx`](file:///c:/Dev/Projects/sport-competition/packages/web/src/components/competition/RegistrationsTable.tsx):
  - Line 11: `categories: any[]`
  - Lines 15, 17, 44: `(c: any)`, `weights: any[]`, `(w: any)`
- [`packages/web/src/pages/CompetitionDetail.tsx`](file:///c:/Dev/Projects/sport-competition/packages/web/src/pages/CompetitionDetail.tsx):
  - Lines 15–23: `STATUS_LABEL: Record<string, string>`
- [`packages/web/src/components/competition/LifecycleStepper.tsx`](file:///c:/Dev/Projects/sport-competition/packages/web/src/components/competition/LifecycleStepper.tsx):
  - Lines 19–27: Duplicate `STATUS_LABEL: Record<string, string>`

---

## 3. Architecture References

- **AGENTS.md Section 4 (Architecture Boundaries)**:
  - `packages/core`: Domain models, competition logic, draw engine, ranking calculations, pure functions. No React, no Express, no database access. Independently testable.
  - `packages/api`: Express routes, database access, application services. Must not contain UI logic or untestable pure domain rules.
  - `packages/web`: UI components, forms, tables. Must not contain business logic duplicated from core.
- **AGENTS.md Section 6 (Business Rules Are Source Of Truth)**:
  - Category resolution logic must match rules deterministically.
- **AGENTS.md Section 14 (Testing Requirements)**:
  - Unit tests required in Core for domain logic.

---

## 4. Business Rules

### Category Resolution (`findCategory`)
An athlete matches a competition category if and only if all of the following hold:
1. `cat.enabled === true` (disabled categories cannot accept registrations).
2. `cat.gender === athlete.gender` (strict match: "M" or "F").
3. `athlete.age >= minAge` AND (`maxAge === null || athlete.age <= maxAge`). Both boundaries inclusive.
4. `athlete.weightKg != null`: If weight is null, category cannot be resolved (returns `null`).
5. `minKg === null || athlete.weightKg >= minKg` AND (`maxKg === null || athlete.weightKg <= maxKg`). Both boundaries inclusive.
6. Returns the first matching `cat.id`, or `null` if no category matches.

### Age at Date (`ageAtDate`)
Athlete's age in full completed years on the day of the competition:
- `age = compDate.year - birthDate.year`
- If competition month/day has not yet reached birth month/day, `age -= 1`.

---

## 5. Files Expected to Change

### Core Layer
- `packages/core/src/competition/categories.ts` (NEW): Domain interfaces (`CategoryDefinition`, `AgeCategoryCriteria`, `WeightDivisionCriteria`, `ResolvableCategory`) and pure functions:
  - `findCategory(cats, ageCatMap, weightMap, gender, age, weightKg)`: Direct drop-in for DB-mapped entities in API.
  - `findResolvableCategory(categories, gender, age, weightKg)`: Direct match for flattened categories.
- `packages/core/src/competition/categories.test.ts` (NEW): Comprehensive unit tests using `node:test`.
- `packages/core/src/index.ts`: Export new domain types and functions.
- `packages/core/package.json`: Include `categories.test.ts` in the `test` script.

### API Layer
- `packages/api/src/utils.ts` (NEW): Export `ageAtDate(birthDate: string, compDate: string): number`.
- `packages/api/src/routes/competitions.ts`: Import `findCategory` from `@sport-competition/core` and `ageAtDate` from `../utils.ts`. Remove local definitions.
- `packages/api/src/routes/draw.ts`: Import `ageAtDate` from `../utils.ts`. Remove local definition.
- `packages/api/src/routes/documents.ts`: Import `ageAtDate` from `../utils.ts` (replace `calculateAge`). Remove local definition.

### Web Layer
- `packages/web/src/components/competition/types.ts`: Export `CompetitionCategory = CompetitionDetail['categories'][number]`.
- `packages/web/src/utils/statusLabels.ts` (NEW): Export `STATUS_LABEL` and `getStatusLabel(status: string): string`.
- `packages/web/src/components/competition/BulkRegisterModal.tsx`: Use `CompetitionCategory` instead of `any`.
- `packages/web/src/components/competition/RegisterExistingModal.tsx`: Use `CompetitionCategory` instead of `any`.
- `packages/web/src/components/competition/InlineRegisterModal.tsx`: Use `CompetitionCategory` instead of `any`.
- `packages/web/src/components/competition/RegistrationsTable.tsx`: Use `CompetitionCategory` instead of `any`.
- `packages/web/src/pages/CompetitionDetail.tsx`: Import `STATUS_LABEL` from `../utils/statusLabels`.
- `packages/web/src/components/competition/LifecycleStepper.tsx`: Import `STATUS_LABEL` from `../../utils/statusLabels`.

---

## 6. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Breaking existing API category resolution behavior | Implement exact same signature and logic in core; verify with unit tests before wiring into API routes |
| Breaking web modals type checking | Use TypeScript strict mode (`npm run typecheck`) across all packages |
| Subtle off-by-one errors in age or weight boundary checks | Add dedicated unit test cases in `categories.test.ts` covering exact boundary values (`age == minAge`, `weightKg == minKg`, etc.) |

---

## 7. Security Considerations

- Pure functions with no external dependencies or side effects.
- No new external packages added.
- Input validation in API routes remains intact.

---

## 8. Acceptance Criteria

- [ ] `packages/core/src/competition/categories.ts` exists and implements `findCategory` and `findResolvableCategory`.
- [ ] `packages/core/src/competition/categories.test.ts` executes and passes with 100% coverage of category matching cases.
- [ ] `packages/core/src/index.ts` re-exports category functions and types.
- [ ] `packages/api/src/utils.ts` contains `ageAtDate`.
- [ ] `packages/api/src/routes/competitions.ts`, `draw.ts`, `documents.ts` import `ageAtDate` from `../utils.ts` with no local duplicates remaining.
- [ ] `packages/api/src/routes/competitions.ts` imports `findCategory` from `@sport-competition/core` with no local duplicate.
- [ ] `packages/web/src/components/competition/types.ts` exports `CompetitionCategory`.
- [ ] Zero instances of `categories: any[]` or `(c: any)` in `BulkRegisterModal.tsx`, `RegisterExistingModal.tsx`, `InlineRegisterModal.tsx`, `RegistrationsTable.tsx`.
- [ ] `packages/web/src/utils/statusLabels.ts` exports `STATUS_LABEL` and `getStatusLabel`; both `CompetitionDetail.tsx` and `LifecycleStepper.tsx` import from it.
- [ ] `npm run typecheck` passes with 0 errors across all 3 packages (`core`, `api`, `web`).
- [ ] `npm run test` passes with all tests green.

---

## 9. Validation Steps

1. Run `npm run test` -> verifies all unit tests in `@sport-competition/core` including new `categories.test.ts`.
2. Run `npm run typecheck` -> verifies strict TypeScript across all workspaces.

---

## 10. Manual Testing Steps

1. In the running application, open an active competition in the browser.
2. Open "Inscriptions" tab, click "Inscrire un athlète existant" and "Inscription directe".
3. Verify that category auto-matching works when changing birthdate, gender, or weight.
4. Verify that "Tout inscrire" (Bulk register) modal displays category options and athlete counts accurately.
5. Verify that status badge and lifecycle stepper display correct French labels (e.g. "Brouillon", "Inscriptions ouvertes").
