# Implementation Plan: Fix Vercel Deployment & SPA Routing

## Goal
Fix the Vercel deployment build errors and the "Page does not exist" (404) routing issue when accessing the deployed application on Vercel. Ensure both the Vite React SPA and the Serverless Express API deploy and route seamlessly.

---

## Root Cause Analysis
1. **Deprecated `"builds"` & Monorepo Static Path Mismatch**:
   - `vercel.json` previously used `"version": 2` with `"builds": [{ "src": "packages/web/package.json", "use": "@vercel/static-build" }]`.
   - Vercel's legacy `@vercel/static-build` routes static outputs under `/packages/web/`, causing the root domain `/` and all subroutes (`/login`, `/competitions`, etc.) to return 404 ("The page could not be found" / "Page does not exist").
   - `packages/web/vite.config.ts` outputted to `packages/web/dist` instead of the root `dist/` directory that Vercel expects.

2. **Serverless Function Build Errors & Conflicting Entrypoints**:
   - `api/index.ts` had unbundled TypeScript imports (`import from '../packages/api/src/app.ts'` and `@sport-competition/core`).
   - When deploying to Vercel, having unbundled TypeScript imports across a monorepo workspace causes `@vercel/node` runtime crashes (`Cannot find module`, `.ts` unknown file extension).
   - Furthermore, having both `api/index.ts` and `api/index.js` in `/api` causes build/routing conflicts on Vercel.

3. **Native Build Dependency in `packages/core`**:
   - `packages/core/package.json` still contained `"better-sqlite3"`. During `npm install` on Vercel's Linux Lambda environment, `node-gyp` attempts native C++ compilation, risking build failures.
   - Core is now 100% powered by `@libsql/client` (pure JavaScript/WASM), so `better-sqlite3` is obsolete.

4. **Missing Graceful Fallback in Serverless Migrations**:
   - `packages/core/src/db/migrate.ts` ran `readdirSync` on the migrations directory relative to `import.meta.url`. In a bundled serverless function, raw `.sql` files are not on disk at that relative path, risking `ENOENT` during initialization.

---

## Existing Code Inspected
- `vercel.json`: Legacy `builds` configuration and path routing.
- `package.json`: Workspace build scripts and dev dependencies.
- `packages/web/vite.config.ts`: Output directory and dev proxy.
- `packages/web/src/App.tsx`: Client-side routing and auth redirects.
- `packages/core/package.json`: Legacy `better-sqlite3` dependency.
- `packages/core/src/db/migrate.ts`: Migration folder scanner.
- `packages/api/src/config.ts`: Static files path resolution.
- `api/index.ts`: Current serverless handler entrypoint.

---

## Architecture References
- Monorepo structure with `@sport-competition/core`, `@sport-competition/api`, and `@sport-competition/web`.
- Vercel Serverless Function specification: files in root `/api/*.js` serve as serverless handlers.
- Vite SPA History API fallback for client-side routing.

---

## Business Rules
- Unauthenticated visitors accessing `/` or protected routes are redirected to `/login`.
- Public tournament views (`/public/competitions/:id`) and league registration portals (`/register/:competitionId`) remain publicly accessible.
- All `/api/*` requests must route to the Express Serverless API.

---

## Files Expected to Change
1. `packages/core/package.json`:
   - Remove `better-sqlite3` and `@types/better-sqlite3`.
2. `packages/core/src/db/migrate.ts`:
   - Add existence check for `migrationsDir` to avoid `ENOENT` in serverless bundles.
3. `packages/web/vite.config.ts`:
   - Set `outDir: '../../dist'` so the frontend builds directly into the root `dist/` directory.
4. `packages/api/src/serverless.ts`:
   - New clean source entry for the Serverless Function handler.
5. `api/index.ts`:
   - Remove to avoid duplicate `index.ts` / `index.js` conflict on Vercel.
6. `package.json`:
   - Add `esbuild` to `devDependencies`.
   - Add `"build:api": "esbuild packages/api/src/serverless.ts --bundle --platform=node --format=esm --target=node20 --outfile=api/index.js --external:@libsql/client"`.
   - Update `"build"`: `"npm run build:web && npm run build:api"`.
7. `vercel.json`:
   - Replace legacy `version: 2` and `builds` with modern Vercel configuration:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [
       { "source": "/api", "destination": "/api/index.js" },
       { "source": "/api/(.*)", "destination": "/api/index.js" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
8. `packages/api/src/config.ts`:
   - Support `dist/` at the project root for local `npm start`.

---

## Risks & Mitigation
- **Risk**: Stale `api/index.js` or bundling errors.
  - **Mitigation**: Bundle `api/index.js` with `esbuild` on every build step and verify it imports cleanly in Node 20/22.
- **Risk**: Cold start latency on Turso Cloud.
  - **Mitigation**: Lazy initialization with promise memoization (`ensureInitialized()`).

---

## Acceptance Criteria
- `npm run build` succeeds locally, generating `dist/index.html`, `dist/assets/*`, and `api/index.js`.
- Root `/` and client routes (`/login`, `/competitions`, `/public/...`) serve the React app without 404s.
- `/api/health` returns `{ ok: true, serverless: true }` when deployed.
- No `better-sqlite3` native build failures during deployment.

---

## Validation Steps
1. Run `npm run build`.
2. Verify `dist/index.html` exists and contains correct asset references.
3. Verify `api/index.js` is generated and loads via `node -e "import('./api/index.js')"`.
4. Run `npm run typecheck` across all packages.
