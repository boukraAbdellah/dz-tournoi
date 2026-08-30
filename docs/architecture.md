# Sports Competition Management Platform (Algeria) — Architecture & Design Document

Status: **Validated** (all open decisions confirmed by the organizer)
Date: 2026-08-13

---

## 1. Goals & Scope

Local-first platform for managing combat sports competitions in Algeria (Karate, MMA, Jeet Kune Do, extensible to any 1-vs-1 combat sport via configurable templates).

**MVP scope**
- Single organizer, single computer, no internet dependency at runtime.
- Bilingual UI: French (default) + Arabic (RTL toggle).
- Competition lifecycle, athlete registration (2 methods), automatic category resolution, draw generation with soft constraints, match result entry with automatic winner progression, rankings, documents & certificates, Excel import/export.

**Out of scope (architecture keeps them addable)**
- Club accounts, LAN/cloud deployment, weigh-in management, tatami/ring management, referee modules, accreditation cards, QR codes, live scoreboards, notifications, repechage/round-robin/pools/double-elimination formats.

---

## 2. Requirements Review

### 2.1 Confirmed decisions (organizer answers)

| # | Decision | Resolution |
|---|----------|------------|
| D1 | Tech stack | TypeScript full-stack (React + Ant Design + Node/Express + SQLite) |
| D2 | Local deployment | `npm run start` → server on `127.0.0.1:5175`, auto-opens browser |
| D3 | Weight division | Auto-map from registration weight snapshot + manual override in resolution screen |
| D4 | Rankings points | Configurable per competition; default Gold=5, Silver=3, Bronze=1 |
| D5 | Excel import | Fixed template `Athlete.xlsx` + sample file, manual entry always available |
| D6 | Language | French default, one-click Arabic (RTL) toggle, persisted per installation |

### 2.2 Working assumptions (defaults, revisit if reality differs)

- **Age category** = exact age on competition date, inclusive min/max (nullable = open). E.g. `U14` = ages 13 & 14.
- One (age × weight) division per athlete per competition.
- Both semi-final losers receive bronze when the bronze match is disabled.
- No historical seeds in MVP → random initial ordering, optimized by soft preferences.
- Draw preferences are soft constraints: minimized via weighted penalty, never hard-blocked.
- Match result types: Regular / Decision / TKO / Disqualification; MVP stores ScoreA/ScoreB + result type, no live scoring rules engine.
- Structured reference data (wilaya/city) bilingual fields; free-text names stored as entered.

### 2.3 Known spec issues → design responses

1. **Bye distribution** must place multiple byes in round 1 only, never meeting each other (standard power-of-two seeding). Engine test matrix covers `n = 1..64`.
2. **Draw preferences need a quantifiable optimizer** → weighted penalty `w_wilaya > w_city > w_club` (e.g. 8/4/2) + greedy placement with seeded RNG + local swap search; audit panel reports residual pairings.
3. **Regeneration vs manual edits coexist**: generate → re-generate any number of times → manual swap/move on current bracket → lock. Lock freezes everything.
4. **Registration re-open** transition added (never unlocks a locked draw).
5. **Weight is a snapshot at registration**, not a live read of the athlete record.
6. **Wilaya ranking requires club→city→wilaya non-null** when wilaya ranking is enabled.
7. **Category resolution report** + athlete-snapshot classifications block draw generation until resolved.

---

## 3. Database Design

RDBMS: **SQLite** (single file, transactional, zero-config). Versioned migrations.

### 3.1 Entities

```
wilaya (id, code_58 UNIQUE, name_ar, name_fr)
city   (id, wilaya_id FK, name_ar, name_fr)

club   (id, name, wilaya_id FK, city_id FK, email, phone, address, notes)

athlete(id, first_name, last_name, birth_date, gender ENUM(M,F), weight_kg,
        club_id FK, phone, notes, created_at)

sport_template       (id, name, slug, builtin BOOL, settings JSON)
  settings = { default_bronze: bool, result_types: [Regular, Decision, TKO, DQ], ... }
age_category         (id, template_id FK, name, min_age, max_age NULL, order_index)
weight_division      (id, template_id FK, age_category_id FK,
                      name, min_kg NULL, max_kg NULL, order_index)

competition          (id, name, date, location, description, sport_template_id FK,
                      bronze_match_enabled BOOL, club_ranking_enabled BOOL,
                      wilaya_ranking_enabled BOOL, rank_points JSON {gold, silver, bronze},
                      status ENUM(DRAFT, REGISTRATION_OPEN, REGISTRATION_CLOSED,
                                  DRAW_GENERATED, DRAW_CONFIRMED, IN_PROGRESS, COMPLETED))

competition_category (id, competition_id FK, age_category_id FK, weight_division_id FK,
                      format ENUM(SINGLE_ELIM) DEFAULT SINGLE_ELIM,   -- future formats plug here
                      rng_seed INT, draw_generated_at, draw_locked_at,
                      UNIQUE (competition_id, age_category_id, weight_division_id))

registration         (id, competition_id FK,athlete_id FK,
                      sub_department_id FK,        -- classification snapshot
                      weight_kg,                   -- weight snapshot
                      club_id_at_registration FK,
                      status ENUM(REGISTERED, WITHDRAWN),
                      UNIQUE (competition_id, athlete_id))

match                (id, competition_category_id FK,
                      round INT, form TEXT,        -- e.g. "Round of 16"
                      ordinal INT,                 -- match # in round (1-based)
                      is_bronze BOOL,
                      competitor_a_id FK->registration NULL,
                      competitor_b_id FK->registration NULL,  -- NULL = bye slot
                      score_a INT, score_b INT,
                      result_type TEXT NULL,       -- Regular / Decision / TKO / DQ
                      winner_registration_id FK->registration NULL,
                      status ENUM(PENDING, COMPLETED, BYE),
                      UNIQUE (competition_category_id, round, ordinal))
```

### 3.2 Key design decisions

1. **`registration` is the pivot.** Athletes are permanent master data; a competition snapshots classification, weight, and club. Editing the master never rewrites history.
2. **`competition_category` materializes active (age × weight) buckets** (copy-in from template at competition creation) — organizer can disable individual divisions without touching the template.
3. **Bracket = materialized `match` table** with explicit `round/ordinal` + nullable competitor cells. This enables swap/move/regenerate and 1:1 rendering. A slot is `(competition_category_id, round, ordinal, side)`.
4. **`winner_registration_id` denormalized** → winner progression is one deterministic UPDATE (see §5).
5. **`format` field + adapter interface** on `competition_category` keeps future formats pluggable; MVP implements only `SINGLE_ELIM`.
6. **Rankings are computed on demand** (pure function over matches); optionally snapshotted at COMPLETED for documents.
7. **Bilingual content**: wilaya/city carry `ar`+`fr`; free-text names stored as entered.
8. **Ranking points stored per competition** (`rank_points` JSON) → configurable D4.

---

## 4. User Stories & Workflows

### 4.1 User stories (Organizer)

- U1 Create a club (wilaya, city, contact).
- U2 Create / import athletes.
- U3 Create a competition from a sport template.
- U4 Open / close / reopen registration.
- U5 Register an existing athlete (Method 1).
- U6 Create an athlete inline from the competition page → auto-registered (Method 2).
- U7 View category-resolution report (all athletes mapped to age × weight buckets; unresolved listed).
- U8 Generate the draw for all divisions.
- U9 Review / edit / regenerate the draw; see pairing audit.
- U10 Confirm the draw (lock).
- U11 Enter match results → bracket advances automatically.
- U12 Generate individual / club / wilaya rankings.
- U13 Generate documents: participant list, category list, division list, brackets, match sheets, final rankings, certificates.
- U14 Re-run / duplicate a past competition as a new one.

### 4.2 Primary workflow

```
1. Draft                  create competition + pick template → competition_category rows created
2. Registration Open      add clubs/athletes; register individually (U5) or inline (U6) or by file
3. Registration Closed    resolution screen maps every athlete to (age × weight); unresolved → blocker
4. Draw Generated         per division: power-of-two bracket, byes, preference-optimized; swap/move/regenerate
5. Draw Confirmed         lock; generate match sheets
6. In Progress            enter scores → winner auto-advances → live bracket updates
7. Completed              final + bronze done → rankings → documents/certificates/export
```

### 4.3 State transitions

`DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED ⇄ (reopen) → DRAW_GENERATED → DRAW_CONFIRMED → IN_PROGRESS → COMPLETED`

---

## 5. Tournament & Draw Logic (single elimination)

### 5.1 Bracket build

1. Participants = registered, non-withdrawn athletes of a `competition_category`.
2. `size = nextPow2(n)`, `byes = size − n`.
3. Random initial ordering from seeded RNG (`rng_seed` stored).
4. **Byes**: standard power-of-two distribution — round 1 only, higher seeds first, two byes never feed the same later match.
5. **Preferences (soft)**: round-1 penalty = `8·[same_wilaya] + 4·[same_city] + 2·[same_club]`. Minimize via greedy slot filling + local swap search. Store residual counts → audit panel.
6. Staging: pending matches only. Organizer can **Swap** two athletes, **Move** into an empty/bye slot, or **Regenerate** (new seed). Status `DRAW_GENERATED`.
7. **Lock** → `DRAW_CONFIRMED`; no draw edits afterwards.

### 5.2 Winner progression (deterministic)

- When a match completes: winner of round-1 `match m` (1-based ordinal) goes into `⌈m/2⌉` of the next round; odd → slot A, even → slot B.
- **Bye** = pre-completed match with one null competitor; winner = the real athlete; same progression rule applies.
- **Bronze**: when bronze enabled, create the bronze match from both semifinal losers as soon as both semis complete. When disabled, both semifinal losers receive bronze automatically (no match).

### 5.3 Rankings (pure function)

- At COMPLETED (or on demand): gold/silver/bronze per participant; aggregate to club and wilaya rankings when enabled using configurable points (default 5/3/1).

---

## 6. Application Architecture

### 6.1 Recommended stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + **Ant Design** + `i18next` | AntD: built-in `direction="rtl"` + fr/ar locale packs + rich tables/forms for organizer dashboards |
| Backend | Node.js 20 + Express + TypeScript | single process serves API + built UI; trivial `npm run start` |
| Database | SQLite via `better-sqlite3`, migrations + Drizzle ORM | zero-config single file; backup = file copy |
| Excel | ExcelJS | full read/write .xlsx with styling for sheets |
| PDF | HTML templates + Playwright (bundled Chromium) print-to-PDF | Arabic shaping/RTL for free; reused for certificates & brackets |
| Draw engine | pure TypeScript module, seeded RNG, unit-tested | offline, deterministic, exhaustively tested `n=1..64` |

### 6.2 Why not alternatives

- Electron/Tauri: packaging weight not needed for a single-organizer MVP; node + browser is simpler and LAN-ready later.
- Python/FastAPI: equally viable Excel/PDF, but TS keeps one language across API + frontend + draw engine + shared types.

### 6.3 Local deployment (MVP)

`npm run start` → API on `127.0.0.1:5175`, auto-opens browser. Data + exports under `./data` (user picks folder at first run). No internet after install. Extensible later to Tauri / packaged EXE / LAN / cloud.

### 6.4 Repository layout

```
packages/core    domain model + draw engine (pure, testable)
packages/api     Express services, imports/exports, PDF generation
packages/web     React + Ant Design + i18n (fr/ar, RTL)
```

Future features (weigh-in check-in, tatami/mats, referee app, QR, live board, LAN sync) are additive modules; nothing blocks them.

---

## 7. Implementation Roadmap

Highest-risk piece = draw engine → built early, unit-tested against edge cases.

| Phase | Scope |
|---|---|
| 0 | Foundation: TS workspace, Express + Vite, SQLite migrations, i18n scaffold (fr default / ar RTL), lint/CI |
| 1 | Reference data: seed 58 wilayas + cities (ar/fr); Club CRUD; Athlete CRUD; Excel import/export skeleton |
| 2 | Sport templates: entities + CRUD + seed Karate / MMA / JKD templates |
| 3 | Competition & registration: lifecycle state machine; both registration methods; category resolution + blocker report |
| 4 | Draw engine (core): power-of-two, byes, optimizer, regenerate, swap/move, lock; exhaustive tests; bracket UI + audit panel |
| 5 | Match management: score entry, result types, auto-advance, bronze, live bracket view |
| 6 | Rankings: individual / club / wilaya; configurable points |
| 7 | Documents: lists, brackets, match sheets, certificate templates (participation / winner) |
| 8 | Hardening & packaging: import wizard, backups, portable start, final i18n/UX pass |

---

## Appendix A — Independent design decisions left to implementation

- RNG algorithm for draw generation (e.g. seeded xorshift/mulberry32) and exact weights tuned during Phase 4.
- Naming/bucket labels per template (free text) vs fixed; template settings schema details.
- Certificate layout & template modeling (HTML templates with placeholders).
- Exact `Athlete.xlsx` column set (finalized in Phase 1).
- Playwright browser download strategy for offline PCs (alternate system-Chrome fallback).