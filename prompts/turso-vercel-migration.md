# Turso & Vercel Migration Specification: Cloud Database, Serverless Deployment, RBAC & Public Portal

## Goal
Migrate the Sports Competition Management Platform from local-only SQLite to **Turso (Cloud libSQL)** and deploy as a **zero-cost, zero-maintenance serverless application on Vercel**. 

Simultaneously introduce **Authentication & Role-Based Access Control (RBAC)** tailored to Algerian combat sport leagues:
1. **Public Viewers (Unauthenticated)**: Instant, login-free public access to view competitions, registered participants, and interactive visual draw brackets (athletes knowing their match-ups).
2. **League Managers (Wilaya Scoped)**: Logged in (or via secure shared registration links) to register athletes exclusively belonging to their assigned Wilaya into open competitions.
3. **Super Admin**: Master organizer control over competition creation, bracket draw generation, match scoring, podiums, and league manager account management.

---

## Existing Code Inspected
- `packages/core/src/db/connection.ts`: Currently initializes `better-sqlite3` and `drizzle-orm/better-sqlite3`.
- `packages/core/src/db/schema.ts`: SQLite Drizzle schema (`sqliteTable`, `wilayas`, `cities`, `clubs`, `athletes`, `competitions`, `matches`, `registrations`).
- `packages/api/src/app.ts`: Express application mounting routes (`/api/competitions`, `/api/draw`, `/api/documents`, etc.).
- `packages/api/src/services/pdf.ts`: PDF generation relying on local `msedge.exe`/`chrome.exe` (requires browser-based print/PDF fallback in serverless environment).
- `packages/web/src/api.ts`: Fetch client with `VITE_API_BASE`.
- `packages/web/src/pages/CompetitionDetail.tsx`: Tabs for Categories, Participants, Draw, Matches, Rankings, Documents.
- `packages/web/vite.config.ts`: Vite build configuration.

---

## Architecture & Technology Decisions

### 1. Database: Turso (libSQL)
- Retain the exact same SQLite table definitions in `packages/core/src/db/schema.ts` (`sqliteTable`).
- Replace `better-sqlite3` with `@libsql/client` and `drizzle-orm/libsql`.
- Hybrid runtime support:
  - If `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set, connect to Turso Cloud over HTTP.
  - If not set, fallback gracefully to local `file:data/sport.db` for offline local development.

### 2. Backend & Deployment: Vercel Serverless
- Unified monorepo deployment on Vercel Hobby Tier ($0/month, 1,000,000 function calls/month, 100 GB bandwidth).
- `vercel.json` configures:
  - Frontend SPA routing: `packages/web/dist` served on `/`.
  - Backend API: `packages/api/src/serverless.ts` or root `api/index.ts` routing `/api/*` to Express.

### 3. Authentication & Authorization Model
- **No external auth service needed** (keeps it 100% free with no vendor lock-in).
- Passwords hashed with `bcryptjs`.
- Stateless JSON Web Tokens (JWT) signed via `JWT_SECRET`.
- Access Levels:
  - **`PUBLIC`**: Read-only access to competition metadata, participants, brackets, and rankings (`GET /api/public/competitions/...`).
  - **`LEAGUE_MANAGER`**: Can manage clubs/athletes within their `wilayaId` and submit registrations for their wilaya.
  - **`ADMIN`**: Full permissions to create competitions, run draw engine, score matches, and generate certificates.
- **Direct Registration Links (Token-based)**:
  - Admin can generate a shareable registration link for a specific wilaya (e.g. `/register/:competitionId?token=<signed-token>`).
  - League managers can open the link directly on mobile/desktop without an advance account setup to enter their wilaya's roster before the deadline.

---

## Business Rules

1. **Draw Visibility**: Brackets become publicly visible once the competition status reaches `DRAW_GENERATED`, `DRAW_CONFIRMED`, `IN_PROGRESS`, or `COMPLETED`.
2. **Registration Isolation**: A League Manager assigned to Wilaya X can **only** register athletes whose club belongs to Wilaya X. Attempts to register athletes from other wilayas must fail with `403 Forbidden`.
3. **Registration Lifecycle**: Registrations can only be submitted or modified while competition status is `REGISTRATION_OPEN`. Once `REGISTRATION_CLOSED`, all registration endpoints reject modifications.
4. **Draw Engine Integrity**: Generating, regenerating, swapping, or locking brackets remains restricted strictly to `ADMIN`.
5. **Deterministic Storage**: Snapshot fields (`athleteSnapshotName`, `clubSnapshotName`, `seed`) remain strictly preserved on registration and draw generation.
6. **PDF in Serverless**: In Vercel serverless functions, HTML document preview (`format=html`) is returned for printing via `window.print()` / save-as-PDF in the user's browser, preventing headless browser binary crashes on Lambda.

---

## Files Expected to Change

### 1. `packages/core`
- **[MODIFY]** `package.json`: Add `@libsql/client`, remove/optionalize `better-sqlite3`.
- **[MODIFY]** `src/db/connection.ts`: Support `@libsql/client` with `drizzle-orm/libsql` (connecting to Turso Cloud or local file).
- **[MODIFY]** `src/db/schema.ts`:
  - Add `users` table:
    ```typescript
    export const users = sqliteTable('users', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      email: text('email').notNull().unique(),
      passwordHash: text('password_hash').notNull(),
      name: text('name').notNull(),
      role: text('role', { enum: ['ADMIN', 'LEAGUE_MANAGER'] }).notNull().default('LEAGUE_MANAGER'),
      wilayaId: integer('wilaya_id').references(() => wilayas.id),
      createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    });
    ```
  - Add `registrationTokens` table (for direct wilaya registration links):
    ```typescript
    export const registrationTokens = sqliteTable('registration_tokens', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      token: text('token').notNull().unique(),
      competitionId: integer('competition_id').notNull().references(() => competitions.id),
      wilayaId: integer('wilaya_id').notNull().references(() => wilayas.id),
      expiresAt: text('expires_at').notNull(),
      createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    });
    ```

### 2. `packages/api`
- **[MODIFY]** `package.json`: Add `jsonwebtoken`, `bcryptjs`, and types (`@types/jsonwebtoken`, `@types/bcryptjs`).
- **[NEW]** `src/middleware/auth.ts`:
  - `authenticate`: Extracts and verifies JWT from `Authorization: Bearer <token>`.
  - `requireAdmin`: Ensures `req.user.role === 'ADMIN'`.
  - `requireLeagueOrAdmin`: Checks role and attaches `req.user.wilayaId`.
- **[NEW]** `src/routes/auth.ts`:
  - `POST /api/auth/login`: Authenticate with email/password.
  - `GET /api/auth/me`: Fetch current user profile and role.
  - `POST /api/auth/users`: Admin creates league manager account with `wilayaId`.
- **[NEW]** `src/routes/public.ts`:
  - Public read-only endpoints (no auth required):
    - `GET /api/public/competitions`: List public active/completed competitions.
    - `GET /api/public/competitions/:id`: Get competition details, categories.
    - `GET /api/public/competitions/:id/participants`: Public participant roster.
    - `GET /api/public/competitions/:id/bracket`: Public interactive bracket tree.
    - `GET /api/public/competitions/:id/rankings`: Public podium results.
- **[NEW]** `src/routes/league.ts`:
  - `POST /api/league/register-with-token`: Register athletes using a direct shareable registration link token.
  - `GET /api/league/token-info`: Validate direct registration token and return competition + wilaya metadata.
- **[MODIFY]** `src/app.ts`: Mount `authRouter`, `publicRouter`, and `leagueRouter`.
- **[NEW]** `src/serverless.ts`: Serverless Express handler export for Vercel.

### 3. `packages/web`
- **[NEW]** `src/context/AuthContext.tsx`: Manages auth token, logged-in user state, logout, and role inspection.
- **[NEW]** `src/pages/Login.tsx`: Login page for Admins and League Managers.
- **[NEW]** `src/pages/PublicTournamentView.tsx`: Dedicated clean, public, responsive tournament viewer:
  - Header with tournament title, location, date, badge.
  - Tab 1: **Interactive Bracket Tree** (shows fighter names, wilaya/club, match scores, winners advancing).
  - Tab 2: **Participants** (grouped by category and weight).
  - Tab 3: **Podiums & Rankings** (1st, 2nd, 3rd places).
- **[NEW]** `src/pages/LeagueRegistrationPortal.tsx`: Direct registration view (accessed via shared link or league login) allowing the wilaya manager to add fighters to open categories before deadline.
- **[MODIFY]** `src/App.tsx`: Routing updates:
  - `/` -> Competitions dashboard (with Public view option).
  - `/public/competitions/:id` -> `PublicTournamentView` (accessible by anyone).
  - `/register/:competitionId` -> `LeagueRegistrationPortal` (token or login).
  - `/login` -> `Login`.
  - Protected admin routes for tournament management, draws, and scoring.

### 4. Root & Deployment Files
- **[NEW]** `vercel.json`:
  ```json
  {
    "version": 2,
    "builds": [
      {
        "src": "packages/web/package.json",
        "use": "@vercel/static-build",
        "config": { "distDir": "dist" }
      },
      {
        "src": "api/index.ts",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      { "src": "/api/(.*)", "dest": "api/index.ts" },
      { "src": "/(.*)", "dest": "packages/web/$1" }
    ]
  }
  ```
- **[NEW]** `api/index.ts`: Entrypoint wrapping `packages/api/src/app.ts` for Vercel Serverless.

---

## Step-by-Step Implementation Plan

### Phase 1: Database Migration to Turso (libSQL)
1. Install `@libsql/client` in `packages/core`.
2. Update `packages/core/src/db/connection.ts` to instantiate `drizzle(createClient({ url, authToken }))`.
3. Keep fallback logic: If `process.env.TURSO_DATABASE_URL` is empty, connect locally using SQLite file.
4. Add `users` and `registrationTokens` to `packages/core/src/db/schema.ts`.
5. Run migrations/seed to populate Turso cloud database (58 Wilayas, sport templates, initial Super Admin account).

### Phase 2: Authentication & RBAC API
1. Implement JWT helper utilities (`signToken`, `verifyToken`).
2. Implement auth middlewares (`authenticate`, `requireAdmin`, `requireWilayaScope`).
3. Create `/api/auth` endpoints (`login`, `me`, `create-league-account`).
4. Create `/api/public` routes serving read-only data for public visitors.
5. Create `/api/league` routes for wilaya-scoped athlete entries and direct link validation.

### Phase 3: Public Viewer & League Registration Portal UI
1. Create `PublicTournamentView.tsx` with clean Ant Design tabs:
   - High-contrast, mobile-friendly bracket visualizer.
   - Live match status and participant lists.
   - Zero login prompts or clutter.
2. Create `LeagueRegistrationPortal.tsx`:
   - Validates registration token or authenticated Wilaya session.
   - Displays Wilaya name and competition countdown timer.
   - Allows selecting or adding athletes belonging to that Wilaya and assigning them to categories.
3. Update `App.tsx` navigation bar with quick "Share Public Link" and "Generate League Registration Link" buttons.

### Phase 4: Vercel Serverless Packaging & Deployment
1. Create `api/index.ts` connecting the Express app to Vercel.
2. Add `vercel.json` and configure monorepo build outputs.
3. Test locally using `vercel dev` or standard npm scripts.
4. Provide environment variable setup instructions (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Serverless Cold Start** | First API request takes ~200ms | Lightweight Turso HTTP client ensures cold start is imperceptible (<300ms). |
| **PDF Generation on Vercel** | Serverless lacks local `msedge.exe` | Return styled HTML document for `/api/competitions/:id/documents/*` and trigger client-side `window.print()` / save as PDF. |
| **Token Expiry on Tournament Day** | League manager cannot submit last-minute roster | Admin can regenerate token or configure custom expiration window (e.g. 7 days). |
| **Accidental Cross-Wilaya Registration** | Athletes assigned to wrong league | API strictly verifies `club.wilaya_id === user.wilaya_id` before inserting registration. |

---

## Security Considerations
1. Passwords hashed using `bcryptjs` with salt round >= 10.
2. `JWT_SECRET` must be set via secure environment variable.
3. Public endpoints are strictly `GET` operations; no mutation or private contact info (passwords, admin notes) is exposed.
4. Direct registration tokens use cryptographically random strings (`crypto.randomBytes(32).toString('hex')`) and are checked against `expiresAt`.

---

## Acceptance Criteria
- [ ] Database successfully queries Turso cloud database using `@libsql/client`.
- [ ] Fallback to local SQLite file works when Turso environment variables are omitted.
- [ ] Any visitor can open `/public/competitions/:id` and inspect the interactive draw bracket without logging in.
- [ ] Super Admin can log in and manage competitions, generate draws, and score matches.
- [ ] Admin can generate a shareable registration link for a specific Wilaya.
- [ ] League Manager accessing the registration link can only add athletes belonging to their Wilaya.
- [ ] Vercel configuration files (`vercel.json`, `api/index.ts`) build and route both web app and API correctly.

---

## Validation & Manual Testing Steps
1. **Turso Connection**:
   - Run seed script with Turso credentials: verify all 58 Wilayas and sports templates exist in Turso Cloud.
2. **Public Bracket Access**:
   - In an incognito browser window, open `/public/competitions/1`.
   - Verify bracket tree renders completely with athlete names, round numbers, and scores.
3. **League Registration Link**:
   - As Admin, generate link for Wilaya 31 (Oran).
   - In an incognito window, open the generated link.
   - Verify the portal displays "Ligue de Wilaya d'Oran" and only permits registering athletes from Oran clubs.
4. **Draw Engine Protection**:
   - Attempt to call `POST /api/competitions/1/draw/generate` without token or with League token: verify `401 / 403` response.
5. **Build & Typecheck**:
   - Run `npm run typecheck` across all packages to guarantee zero TypeScript errors.
