
# Phase 07: Document Generation Implementation Plan

## Goal
Implement Phase 07 (Documents) of the Sports Competition Management Platform.
This includes generation of all official tournament documents in printable HTML and downloadable PDF formats:
1. Participant List (Liste des participants)
2. Category & Division List (Liste des catégories)
3. Brackets (Tableaux de compétition / Arbres)
4. Match Sheets (Feuilles de match pour arbitres / scoreurs)
5. Official Rankings & Podiums (Classement officiel, podiums par catégorie, clubs, wilayas)
6. Certificates & Diplomas (Attestations de participation et Diplômes de podium) in both French and Arabic (RTL)

---

## Existing Code Inspected
- `AGENTS.md`: Core principles, roadmap (Phase 7: Documents: lists, brackets, match sheets, certificate templates), architecture boundaries, French-first + Arabic RTL, local-first / offline.
- `docs/architecture.md`: Document requirements (U13 Generate documents), HTML templates + Playwright print-to-PDF, offline PC browser fallback strategy (`msedge.exe`).
- `docs/UI-STYLE-GUIDE.md`: Section 16 (Documents view layout, faux PDF thumbnail cards, preview and download actions).
- `packages/core/src/db/schema.ts`: Database entities (`competitions`, `competitionCategories`, `registrations`, `athletes`, `clubs`, `wilayas`, `matches`, `sportTemplates`, `ageCategories`, `weightDivisions`).
- `packages/core/src/draw/bracket.ts` & `rankings.ts`: Pure draw logic, bracket representation, deterministic ranking calculation.
- `packages/api/src/routes/competitions.ts` & `draw.ts`: Existing API endpoints for competitions, categories, matches, and rankings.
- `packages/web/src/pages/CompetitionDetail.tsx` & `App.tsx`: UI layout, competition tabs, navigation.
- `packages/web/src/i18n.ts`: Localization dictionaries (`fr` and `ar`).

---

## Architecture References
- **packages/core**: Pure document data structures, pure HTML generators with print CSS, typography, Arabic RTL support, and multi-language dictionary. No Express, no React, no database access.
- **packages/api**: PDF generation service via `playwright-core` with automatic Chromium/system Edge fallback (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), document data aggregation, and REST endpoints for HTML preview and PDF download.
- **packages/web**: Documents tab in `CompetitionDetail.tsx` and documents view adhering to `docs/UI-STYLE-GUIDE.md` Section 16 with preview modal, PDF download, category filters, and French/Arabic toggle.

---

## Business Rules
1. **Offline Capability**: Generation must function with 0 internet connection. PDF generation uses local Chromium / Microsoft Edge. HTML preview is always available and printable directly via browser `window.print()`.
2. **Deterministic Data**: Document contents reflect stored competition snapshots (athlete name, club at registration, category, match results, calculated rankings).
3. **Dual Language**: All documents support French (`fr`) and Arabic RTL (`ar` with `dir="rtl"`).
4. **Lifecycle Sensitivity**:
   - Participant & Category lists are available from `REGISTRATION_OPEN` onwards.
   - Brackets and Match sheets are available once `DRAW_GENERATED` or later.
   - Rankings and Winner Certificates are available once `IN_PROGRESS` or `COMPLETED`.
   - Participation Certificates are available once registrations are closed or draws generated.
5. **Print Layout Standards**: Self-contained CSS with `@page` rules (A4 portrait / landscape), page breaks (`page-break-inside: avoid`), high-contrast print typography, official signature boxes.

---

## Files Expected to Change

### 1. `packages/core`
- **[NEW]** `packages/core/src/documents/types.ts`: Document data contracts and options.
- **[NEW]** `packages/core/src/documents/templates.ts`: Pure HTML document templates (participants, categories, brackets, match sheets, rankings, certificates).
- **[NEW]** `packages/core/src/documents/i18n.ts`: Multilingual strings for document templates in French and Arabic.
- **[MODIFY]** `packages/core/src/index.ts`: Export document types and template generators.

### 2. `packages/api`
- **[MODIFY]** `packages/api/package.json`: Add `playwright-core` dependency.
- **[NEW]** `packages/api/src/services/pdf.ts`: PDF generation engine using `playwright-core` with system Edge / Chrome discovery.
- **[NEW]** `packages/api/src/routes/documents.ts`: API endpoints:
  - `GET /api/competitions/:id/documents`: Document catalog with status & metadata
  - `GET /api/competitions/:id/documents/participants`: Participant list (HTML or PDF)
  - `GET /api/competitions/:id/documents/categories`: Categories list (HTML or PDF)
  - `GET /api/competitions/:id/documents/brackets`: Brackets per category or all (HTML or PDF)
  - `GET /api/competitions/:id/documents/match-sheets`: Match sheets for category/match (HTML or PDF)
  - `GET /api/competitions/:id/documents/rankings`: Official rankings & podiums (HTML or PDF)
  - `GET /api/competitions/:id/documents/certificates`: Participation & Winner certificates (HTML or PDF)
- **[MODIFY]** `packages/api/src/app.ts`: Mount document routes.

### 3. `packages/web`
- **[NEW]** `packages/web/src/components/competition/DocumentsView.tsx`: UI for document cards conforming to UI style guide Section 16.
- **[NEW]** `packages/web/src/components/competition/DocumentPreviewModal.tsx`: In-app preview modal with print button & download.
- **[MODIFY]** `packages/web/src/pages/CompetitionDetail.tsx`: Add "Documents" tab.
- **[MODIFY]** `packages/web/src/i18n.ts`: Add translations for documents UI and metadata.

---

## Risks
- **Chromium availability on Windows**: If Playwright Chromium binaries are not downloaded, the system must detect `msedge.exe` (installed on every modern Windows system) or Chrome automatically.
- **Arabic Text Shaping & RTL in PDF**: Pure canvas/canvas-based PDF generators struggle with Arabic letter shaping. Using HTML + Chromium's built-in Blink engine guarantees 100% accurate Arabic ligature shaping and BiDi layout.
- **Bracket print layout**: Wide brackets (e.g. 16/32 athletes) can overflow standard portrait A4. Solution: Use landscape orientation and scalable flex/grid bracket layout with responsive print styles.

---

## Security Considerations
- Input validation: Competition ID, category ID, registration ID must be validated integers.
- Safe filename sanitization for HTTP `Content-Disposition`.
- No arbitrary HTML injection from user input: All user strings (names, clubs, notes) are properly escaped in HTML templates.

---

## Acceptance Criteria
- [ ] Participant list can be viewed and downloaded as PDF/HTML.
- [ ] Category list shows all categories with athlete counts.
- [ ] Brackets are generated with correct visual layout for single-elimination tournament categories.
- [ ] Match sheets have complete competitor information, score boxes, and signature spaces.
- [ ] Rankings document displays category podiums, club standings, and wilaya standings.
- [ ] Certificates (Participation & Winner) are generated with decorative borders, official styling, and support both French and Arabic RTL.
- [ ] PDF download generates valid, well-formatted A4 PDFs.
- [ ] HTML preview allows immediate in-browser viewing and printing.
- [ ] Documents tab integrated in Competition Details view.

---

## Validation Steps
1. Run `npm run typecheck` across all packages (`core`, `api`, `web`).
2. Run automated tests in `packages/core` (`npm run test -w packages/core`).
3. Generate sample documents for an existing seeded competition and verify PDF outputs.
4. Verify both French and Arabic outputs.

---

## Manual Testing Steps
1. Navigate to an existing competition in `http://localhost:5173/competitions/1`.
2. Open the "Documents" tab.
3. Verify cards for Participants, Categories, Brackets, Match Sheets, Rankings, and Certificates.
4. Click "Aperçu" (Preview) on each document and verify rendering in modal.
5. Click "Télécharger" (Download PDF) and verify PDF is received and opens in PDF reader.
6. Switch document language to Arabic (العربية) and verify RTL alignment, Arabic headers, and correct font rendering.
