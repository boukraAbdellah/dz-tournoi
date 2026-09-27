# Feature: Caching and Request Deduplication for Reference Data & Sport Templates

## Goal
Resolve the issue where wilayas, communes (cities), sport templates, and other static data are repeatedly re-fetched on every page navigation and duplicated on component mounting. Implement multi-layered caching:
1. **Client-Side Request Deduplication & In-Memory / Session Storage Cache** in `packages/web/src/api.ts` so:
   - In-flight requests for the same GET endpoint are merged (eliminates React StrictMode double-fetch and concurrent component requests).
   - Reference data (wilayas, cities) is cached permanently for the user session (0ms instant resolution).
   - Sport templates are cached with a short TTL (e.g. 5 minutes) and automatically invalidated on mutations (`POST`, `PUT`, `DELETE`).
   - Callers can optionally control caching strategy via options (`cacheStrategy?: 'cache-first' | 'network-only' | 'no-store'`).
2. **Backend HTTP Cache-Control Headers** in `packages/api`:
   - `/wilayas` and `/cities`: Send `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` so browsers can serve from disk/memory cache.
   - `/templates`: Send `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
3. **Backend In-Memory Server Cache** for static reference data (wilayas & cities) in `packages/api/src/routes/reference.ts`:
   - Avoid querying Turso Cloud (600ms - 1200ms latency) on every non-cached or 304 request. Serve from server RAM in <1ms.
4. **Fix Endpoint Consistency**:
   - Support both `/wilayas` & `/reference/wilayas`, and `/cities` & `/reference/cities` to ensure components like `ShareLinksModal.tsx` resolve cleanly.

---

## Existing Code Inspected
- `packages/web/src/api.ts`: Base HTTP client wrapper around `fetch()`. Contains no request deduplication, no in-memory cache, and no cache-control handling.
- `packages/web/src/pages/Clubs.tsx`: Re-fetches `/clubs`, `/wilayas`, and `/cities` on every mount.
- `packages/web/src/pages/Competitions.tsx`: Re-fetches `/competitions` and `/templates` on every mount.
- `packages/web/src/pages/Templates.tsx`: Re-fetches `/templates` on every mount.
- `packages/web/src/components/competition/ShareLinksModal.tsx`: Attempts to fetch `/reference/wilayas` (which 404s because router is mounted at `/api` without `/reference` prefix).
- `packages/api/src/routes/reference.ts`: Queries Turso DB every request for 58 wilayas and ~1541 communes with zero caching headers or server memory cache.
- `packages/api/src/routes/templates.ts`: Queries Turso DB on every request without caching headers.
- `docs/architecture.md`: Local-first, deterministic, responsive design principles.
- `AGENTS.md`: Preservation of simplicity, offline-first, performance guidelines.

---

## Architecture References
- **packages/api**:
  - `routes/reference.ts`:
    - Add server-side in-memory caching for wilayas and cities.
    - Set `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` response headers.
    - Add route aliases `/reference/wilayas` and `/reference/cities`.
  - `routes/templates.ts`:
    - Set `Cache-Control: public, max-age=300, stale-while-revalidate=3600` on `GET /` and `GET /:id`.
    - Set `Cache-Control: no-store` on mutation endpoints (`PUT /:id`).
- **packages/web**:
  - `src/api.ts`:
    - Add `inFlight` promise map to deduplicate identical concurrent GET requests.
    - Add `cacheStore` (in-memory map + `sessionStorage` fallback) for static & semi-static routes.
    - Auto-detect static endpoints (`/wilayas`, `/cities`, `/reference/wilayas`, `/reference/cities`) and template endpoints (`/templates`).
    - Invalidate cache entries when mutation methods (`POST`, `PUT`, `DELETE`) are performed on relevant routes.
    - Expose `api.invalidateCache(pattern?: string)` and `api.clearCache()`.

---

## Business Rules
1. **Reference Data Immutability**: Algerian wilayas (58) and communes (~1541) do not change during an application session. Once loaded, they can be safely served from memory/sessionStorage indefinitely.
2. **Template Freshness**: Sport templates are configured by administrators. If a template is edited or created via `PUT` or `POST`, any cached template data must be immediately invalidated so the UI reflects changes instantly.
3. **Dynamic Competition & Match Data**: Competition brackets, match results, and scores must NEVER be cached long-term. Only static/reference endpoints and semi-static templates are cached by default.
4. **Offline & Low-Bandwidth Capability**: By caching reference data and templates in memory and session storage, page switches remain instant even on high-latency cloud connections (Turso in AWS eu-west-1).

---

## Files Expected to Change

### 1. `packages/api`
- **[MODIFY]** `packages/api/src/routes/reference.ts`:
  - Add in-memory cache for wilayas and cities rows.
  - Add `Cache-Control` headers for reference data.
  - Route aliases for `/reference/wilayas` and `/reference/cities`.
- **[MODIFY]** `packages/api/src/routes/templates.ts`:
  - Add `Cache-Control` headers for GET templates.
  - Ensure mutations bypass cache.

### 2. `packages/web`
- **[MODIFY]** `packages/web/src/api.ts`:
  - Implement concurrent GET request deduplication.
  - Implement client-side cache store with configurable TTLs and `sessionStorage` persistence for static reference data.
  - Implement cache invalidation on `POST`/`PUT`/`DELETE`.
  - Add cache management utilities (`invalidateCache`, `clearCache`).

---

## Risks
- **Stale Template Data**: If an admin updates a sport template, users might see stale data if caching is too aggressive.
  *Mitigation*: Template cache TTL is limited to 5 minutes, and any `PUT`/`POST`/`DELETE` call to `/templates` automatically purges the client cache for `/templates`.
- **SessionStorage Quota**: Storing 1541 communes in `sessionStorage`.
  *Mitigation*: The entire JSON representation of 1541 communes is ~100KB, well below the 5MB browser quota. Error handling will gracefully fall back to in-memory cache if `sessionStorage` is unavailable or full.

---

## Security Considerations
- Only public reference data (wilayas, communes) and templates receive `Cache-Control: public`.
- Authenticated endpoints (e.g. `/auth/me`, `/competitions`, `/league/tokens`) will never have public cache headers or persist sensitive auth tokens in shared cache.

---

## Acceptance Criteria
- [ ] Navigating to `/clubs` fetches wilayas and cities once. Navigating away and returning to `/clubs` displays wilayas and communes instantly (0ms) without triggering network calls.
- [ ] React StrictMode or concurrent page mounts do not produce duplicate parallel HTTP requests for the same GET endpoint in the Network tab.
- [ ] Navigating between `/templates` and `/competitions` reuses cached sport templates without repeated network round-trips.
- [ ] Modifying a template invalidates the cache so updated data is fetched on subsequent reads.
- [ ] Backend API endpoints for `/wilayas`, `/cities`, and `/templates` return appropriate `Cache-Control` headers.
- [ ] Server-side memory cache prevents repeated Turso DB round-trips for reference data.

---

## Validation Steps
1. Run `npm run typecheck` across all packages to ensure zero TypeScript errors.
2. Run `npm run lint` across all packages to verify linting standards.
3. Run existing tests (`npm test` / smoke tests) to ensure no regressions.

---

## Manual Testing Steps
1. Start the app: `npm run dev:api` and `npm run dev:web`.
2. Open browser DevTools on `http://localhost:5173/clubs` with Network tab open (disable "Disable cache").
3. Inspect network calls: wilayas and cities appear once without duplicate lines.
4. Navigate to `/templates`, then navigate back to `/clubs`:
   - Notice no network requests for `/wilayas` and `/cities` are fired.
   - The dropdowns for wilayas and communes populate instantly.
5. Navigate to `/competitions`: templates load instantly from cache.
6. Verify that creating or editing a template properly displays the latest data.
