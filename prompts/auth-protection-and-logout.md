# Feature: Authentication Route Guards & Backend API Protection

## Goal
Fix authentication leaks where logging out does not redirect to `/login`, unauthenticated users can still access the dashboard/admin pages, and backend mutations (such as deleting or modifying clubs, athletes, competitions) can be performed without authentication.

---

## Existing Code Inspected
- `packages/web/src/context/AuthContext.tsx`: `logout()` clears `localStorage.getItem('token')` and sets `user = null`, but does not navigate or trigger route redirection.
- `packages/web/src/App.tsx`: Renders `<Dashboard />`, `<ClubsPage />`, etc., inside `<Routes>` unconditionally without checking `user` or authentication state. The logout button in the header does not trigger navigation to `/login`.
- `packages/web/src/api.ts`: When a 401 Unauthorized response is received, it throws an error but does not automatically purge invalid credentials or redirect to login.
- `packages/api/src/app.ts`: Mounts `app.use(authenticate)` which only parses the Bearer token into `req.user`, but does NOT block unauthenticated requests. Routes `/api/clubs`, `/api/athletes`, `/api/stats`, `/api/competitions`, etc., have no `requireAuth` middleware attached.
- `packages/api/src/middleware/auth.ts`: Already contains `requireAuth`, `requireAdmin`, and `requireLeagueOrAdmin`, but they are not hooked into the management routes.

---

## Architecture References
- **packages/api**:
  - `app.ts`: Protect core management routes with `requireAuth` middleware:
    - `/api/clubs` -> `requireAuth`
    - `/api/athletes` -> `requireAuth`
    - `/api/stats` -> `requireAuth`
    - `/api/import` & `/api/export` -> `requireAuth`
    - `/api/templates` -> `requireAuth`
    - `/api/competitions` (lifecycle, draw, documents) -> `requireAuth`
  - Keep public endpoints unrestricted:
    - `/api/auth/login`
    - `/api/public/*` (public spectator bracket and ranking views)
    - `/api/league/*` (token-validated league manager portals)
    - `/api/wilayas` & `/api/cities` (public reference data)
    - `/api/health`
- **packages/web**:
  - `App.tsx`:
    - Add authentication route guards: If `loading`, show a clean loading indicator; if `!user`, render only `/login`, `/public/*`, and `/register/*` routes, redirecting all other requests to `/login`.
    - Update logout action to invoke `logout()` and navigate immediately to `/login`.
  - `api.ts`:
    - If any request receives a `401 Unauthorized`, remove the stale token and notify the application or redirect to `/login`.

---

## Business Rules
1. **Organizer Privacy & Security**: Management dashboards, clubs, athletes, and competition administrative controls must be accessible only to authenticated users (Admin or League Manager).
2. **Immediate Session Termination**: Clicking logout must immediately destroy the local session, clear tokens, and transition the UI to the login screen.
3. **API Defense-in-Depth**: The API must never rely solely on frontend hiding; any mutation or sensitive query without a valid JWT token must be rejected with HTTP 401.
4. **Public Access Invariant**: Public spectators viewing brackets (`/public/competitions/:id`) and league managers registering fighters via one-time tokens (`/register/:competitionId`) must remain accessible without requiring an admin login.

---

## Files Expected to Change

### 1. `packages/api`
- **[MODIFY]** `packages/api/src/app.ts`: Attach `requireAuth` to `/api/clubs`, `/api/athletes`, `/api/stats`, `/api/templates`, `/api/competitions`, and import/export routes.

### 2. `packages/web`
- **[MODIFY]** `packages/web/src/App.tsx`: Add route guard for unauthenticated state; redirect unauthenticated users to `/login`; update logout handler to navigate to `/login`.
- **[MODIFY]** `packages/web/src/api.ts`: Handle 401 Unauthorized responses by clearing stored credentials and redirecting to `/login`.

---

## Risks
- **Public Tournament & League Portal Breakage**: If `requireAuth` is inadvertently placed on `/api/public` or `/api/league` or `/api/wilayas`, public viewers and league managers would be blocked.
  *Mitigation*: Explicitly verify that public routes remain separate and tested.

---

## Security Considerations
- Prevents unauthorized data access, club deletion, athlete manipulation, and draw tampering.
- Ensures all administrative mutations require a verified cryptographic JWT.

---

## Acceptance Criteria
- [ ] Clicking "logout" in the header immediately redirects the user to `/login`.
- [ ] Attempting to access `/`, `/clubs`, `/athletes`, `/competitions`, or `/templates` while logged out immediately redirects to `/login`.
- [ ] Unauthenticated API requests to `DELETE /api/clubs/:id`, `POST /api/clubs`, etc., return HTTP 401 Unauthorized.
- [ ] Public brackets (`/public/competitions/:id`) and league registration (`/register/:competitionId`) continue to function without requiring login.
- [ ] Logging in as Super Admin restores full access to the dashboard and management pages.

---

## Validation Steps
1. Run `npm run typecheck` across all packages.
2. Run `npm test` across packages.
3. Test unauthenticated API requests via curl or fetch to verify 401 Unauthorized response on `/api/clubs`.
4. Test that public routes (`/api/public/*` and `/api/wilayas`) respond with 200 without tokens.

---

## Manual Testing Steps
1. Log in to the application.
2. Click the Logout icon in the header -> Verify immediate transition to `/login`.
3. Try typing `http://localhost:5173/` or `http://localhost:5173/clubs` into the address bar -> Verify automatic redirection to `/login`.
4. Attempt to delete or edit a club without logging in -> Verify action is blocked both in UI and with HTTP 401 on the API.
5. Visit a public competition link `/public/competitions/1` -> Verify it renders correctly without requiring login.
