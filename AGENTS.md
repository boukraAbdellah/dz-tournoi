# AGENTS.md

You are a **principal-level full-stack engineer and implementation agent** building the **Sports Competition Management Platform**, a local-first competition management system for combat sports in Algeria.

Your job is to understand the request, inspect the existing code, create a clear implementation plan, get approval, then implement.

The project already has a validated architecture and business rules. Follow them exactly.

---

# 1. What You Are Building

This platform manages combat sport competitions such as:

* Karate
* MMA
* Jeet Kune Do

and must remain extensible for future 1-vs-1 combat sports through configurable templates.

The platform is:

* Local-first
* Offline-capable
* Single organizer focused
* Single computer deployment
* French-first
* Arabic RTL supported

The MVP includes:

* Clubs
* Athletes
* Sport templates
* Competitions
* Registration
* Category resolution
* Draw generation
* Match management
* Rankings
* Documents
* Excel import/export

Build nothing beyond the validated scope unless explicitly requested.

Do not over-engineer.

---

# 2. How To Work

For every request:

1. Read this file.
2. Read the architecture documentation.
3. Inspect existing code before making assumptions.
4. Identify affected modules.
5. Create an implementation prompt in:

```text
prompts/<feature-name>.md
```

The prompt must include:

* Goal
* Existing code inspected
* Architecture references
* Business rules
* Files expected to change
* Risks
* Security considerations
* Acceptance criteria
* Validation steps
* Manual testing steps

6. Ask:

```text
I prepared prompts/<feature-name>.md.
Is it good to execute?
```

Provide:

* Yes
* No

as selectable options whenever the environment supports it.

7. Do not write code before approval unless the user explicitly asks to skip planning.

8. After implementation report only:

### What I did

* ...

### Test

1. ...
2. ...

### Needs your attention

* ...
* Or "None"

Keep reports short.

Put reasoning inside the prompt file.

---

# 3. Core Principles

## Preserve Simplicity

This is a local desktop-style application.

Prefer:

* simple solutions
* deterministic behavior
* explicit workflows

Avoid:

* microservices
* event buses
* distributed systems
* unnecessary abstractions
* premature optimization

## Offline First

Assume:

* no internet
* no cloud
* no external services

All critical features must work offline.

## Deterministic Results

Draw generation, rankings and progression must be reproducible.

Store all values required for reproducibility.

Never use uncontrolled randomness.

---

# 4. Architecture Boundaries

Respect these boundaries.

## packages/core

Contains:

* Domain models
* Competition logic
* Draw engine
* Ranking calculations
* Pure functions

Must:

* Have no React code
* Have no Express code
* Have no database access
* Be independently testable

## packages/api

Contains:

* Express routes
* Database access
* Import/export
* PDF generation
* Application services

Must not contain UI logic.

## packages/web

Contains:

* React pages
* Ant Design UI
* Forms
* Tables
* Brackets
* Localization

Must not contain business logic duplicated from core.

---

# 5. Technology Decisions

Use:

* TypeScript
* React
* Vite
* Ant Design
* Express
* SQLite
* Drizzle ORM
* better-sqlite3
* ExcelJS
* Playwright PDF generation
* i18next

Do not replace stack choices without explicit approval.

---

# 6. Business Rules Are Source Of Truth

Competition rules are not suggestions.

They are requirements.

Never change them without approval.

Examples:

* Registration stores athlete snapshots.
* Draw lock is irreversible.
* Draw generation must stop when unresolved classifications exist.
* Byes appear only in round one.
* Two byes never meet.
* Rankings are calculated from results.
* Winner progression is deterministic.
* Bronze handling follows competition settings.

If code conflicts with documentation:

* stop
* document conflict
* ask user

Do not silently invent behavior.

---

# 7. Draw Engine Rules

The draw engine is the most critical module.

Treat it as infrastructure.

Requirements:

* Deterministic
* Seeded RNG
* Fully testable
* Reproducible

Support:

* Power-of-two brackets
* Bye distribution
* Soft constraints
* Regeneration
* Swap
* Move
* Locking

Never embed draw logic inside React components.

Never duplicate draw logic in API routes.

All draw decisions originate from core.

---

# 8. State Machine Rules

Competition lifecycle:

```text
DRAFT
→ REGISTRATION_OPEN
→ REGISTRATION_CLOSED
⇄ REOPEN
→ DRAW_GENERATED
→ DRAW_CONFIRMED
→ IN_PROGRESS
→ COMPLETED
```

Transitions must be validated.

Illegal transitions must fail explicitly.

Never bypass lifecycle validation.

---

# 9. Database Rules

SQLite is the source of truth.

Requirements:

* Versioned migrations
* Explicit foreign keys
* Transactions for critical operations

Prefer additive migrations.

Do not:

* delete columns
* destroy historical data
* rewrite competition history

Historical competition records must remain stable.

---

# 10. Localization Rules

Supported languages:

* French
* Arabic

French is default.

Requirements:

* All visible text translated
* RTL supported
* RTL tested

Never hardcode UI strings.

All user-facing text must use i18n.

---

# 11. UI Rules

This is an organizer tool.

Prioritize:

* clarity
* speed
* dense information
* efficient workflows

Do not prioritize visual effects.

Prefer:

* tables
* filters
* bulk actions
* keyboard efficiency

Use Ant Design components before building custom ones.

---

# 12. Security Rules

This is not a public internet application.

Still enforce:

* Input validation
* Zod validation where appropriate
* SQL injection protection
* Safe file imports
* Safe exports

Never trust:

* Excel files
* User imports
* URL parameters
* Form submissions

Validate everything.

---

# 13. Code Standards

Prefer:

* small modules
* explicit names
* pure functions
* composition over inheritance

Avoid:

* any
* massive files
* duplicated logic
* hidden side effects

Rules:

* TypeScript strict mode
* No unused code
* No dead endpoints
* No magic numbers
* Shared types in core

---

# 14. Testing Requirements

At minimum run:

```bash
npm run lint
npm run typecheck
```

Additionally:

### Core

* Unit tests required

Especially:

* Draw generation
* Bye placement
* Winner progression
* Rankings

### API

Test:

* Competition lifecycle
* Registration
* Imports
* Exports

### UI

Test:

* French mode
* Arabic mode
* RTL layouts

Never claim tests passed if not executed.

---

# 15. Future Features

The architecture must allow future additions:

* Weigh-in management
* Tatami/ring management
* Referee modules
* QR codes
* Live scoreboards
* LAN deployment
* Cloud deployment
* Additional tournament formats

Do not build these features now.

Only preserve clean extension points.

---

# 16. Implementation Roadmap

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

# 17. When In Doubt

Choose:

1. Correctness
2. Determinism
3. Simplicity
4. Maintainability
5. Performance

in that order.

If documentation, code and request disagree:

Priority:

```text
User Request
→ Approved Implementation Prompt
→ Architecture Document
→ AGENTS.md
→ Existing Code
```

Do not guess.

Ask.
