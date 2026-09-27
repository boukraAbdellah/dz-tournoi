# Implementation Plan: Fix Vercel Serverless Function Invocation Failure

## Goal
Resolve the `FUNCTION_INVOCATION_FAILED` error occurring when the deployed application invokes the Serverless API on Vercel.

---

## Root Cause Analysis
1. **Externalized `@libsql/client` Missing in Serverless Bundle**:
   - `package.json` ran `esbuild` with `--external:@libsql/client`.
   - In the monorepo, `@libsql/client` was only declared in `packages/core/package.json` (not in root `package.json`).
   - When deployed to AWS Lambda / Vercel, the unbundled `@libsql/client` was missing from Lambda's runtime node_modules, throwing an unhandled `Cannot find module '@libsql/client'` during function invocation.
   - Bundling `@libsql/client` directly into `api/index.js` (no externals) produces a 100% standalone, self-contained bundle that executes without any runtime dependency resolution.

2. **Express Serverless Export Format & Async Lifecycle**:
   - Vercel recommends exporting the Express `app` directly (`export default app`) rather than returning an Express callback from an `async` function (`return app(req, res)`).
   - In the prior async handler, returning callback-based `app(req, res)` caused the returned promise to resolve to `undefined` before Express finished writing response headers and data, causing Lambda container invocation failures.
   - By exporting `app` directly and using an Express async middleware for `ensureInitialized()`, Vercel natively handles the full request/response lifecycle.

3. **Missing Exception Handlers & Read-Only Filesystem Fallback**:
   - In `connection.ts`, if `TURSO_DATABASE_URL` was not configured in Vercel environment variables, `initDb()` defaulted to `file:data/sport.db`, which crashes on Lambda's read-only filesystem.
   - Adding a fallback to `/tmp/sport.db` and wrapping `ensureInitialized()` in a try/catch prevents uncaught exceptions from crashing the Lambda invocation.

4. **Middleware Ordering in `app.ts`**:
   - `app.use('/api', requireAuth, importExportRouter)` was registered ahead of `/api/health`, blocking health probes with a 401 response. Moving `/api/health` before authenticated middleware ensures health checks always succeed.

---

## Existing Code Inspected
- `packages/api/src/serverless.ts`: Serverless initialization and handler.
- `packages/api/src/app.ts`: Route registration and middleware ordering.
- `packages/core/src/db/connection.ts`: Database connection and fallback logic.
- `package.json`: `build:api` script and root dependencies.
- `vercel.json`: Rewrites and output directory.

---

## Files Expected to Change
1. `package.json`:
   - Remove `--external:@libsql/client` from `build:api` so `api/index.js` is fully self-contained.
   - Add `@libsql/client` to root `dependencies` for traceability.
2. `packages/core/src/db/connection.ts`:
   - When running on Vercel without cloud URL, fallback to `/tmp/sport.db` instead of `data/sport.db` to prevent read-only filesystem crashes.
3. `packages/api/src/app.ts`:
   - Move `/api/health` to the top of routes so it is never blocked by auth middleware.
   - Scope `importExportRouter` properly to avoid intercepting other `/api` routes.
4. `packages/api/src/serverless.ts`:
   - Use Express middleware for `ensureInitialized()`.
   - Export Express `app` directly (`export default app;`).
5. Rebuild `api/index.js` via `npm run build:api`.

---

## Risks & Mitigation
- **Risk**: Bundle size of `api/index.js`.
  - **Mitigation**: Verified at 4.3 MB, well within Vercel's 50 MB Serverless Function zip limit.
- **Risk**: Uncaught initialization errors.
  - **Mitigation**: Wrap initialization in try/catch and log to Vercel console; ensure clean HTTP 500 JSON response on database failure instead of crashing container.

---

## Acceptance Criteria
- `api/index.js` is bundled without external dependencies.
- Simulating invocation of `/api/health` returns `{ ok: true, serverless: true }` with status 200.
- `npm run build` succeeds cleanly.
- `npm run typecheck` passes with 0 errors across all workspaces.

---

## Validation Steps
1. Run `npm run build`.
2. Simulate `/api/health` request using Node against `api/index.js`.
3. Run `npm run typecheck`.
