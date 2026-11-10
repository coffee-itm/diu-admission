# T-050 · `authService` on the real API, `authStore` rework, token in memory

Status: 👀 Review
Sprint: S3 · Role: frontend-dev · Model: build · Size: M
Tier rationale: token handling and logout state-clearing are security behaviour with silent failure modes; touches persisted state (PROCESS §2.3)
Depends on: T-049
Implements: P2-05 (auth half), FR-AUTH-02/03/04/09, closes D-22 on the client side

## Goal
With `VITE_USE_MOCKS=false` the SPA authenticates against the Fastify server: real register/login/logout/me, the access token in memory only, silent refresh, and a logout that leaves nothing behind.

## Context to read
- `context/17-frontend-spec.md` §3 (authStore row: `user` persisted, **token never**), §4
- `context/15-api-spec.md` §2 · `context/13-srs.md` FR-AUTH-02/03/04/09
- `src/features/auth/useAuth.js`, `src/store/authStore.js`, `src/features/auth/ProtectedRoute.jsx`

## Files
- `src/services/authService.js` (modify): real `register`, `login`, `logout`, `me`, `refresh` through `api()`.
  **Carry-forward from T-049 review (reviewer-pro)**: `tryRefresh()` in `src/services/api.js` posts
  `/auth/refresh` directly and only checks the HTTP status — it does **not** call `setAccessToken()`
  with the refreshed token from that response body, unlike `real/authService.js:refresh()` which does.
  Today this is inert (nothing calls real auth yet), but once this card wires the real path, a silent
  refresh triggered by a 401 inside `api()` would rotate the server-side session without the client's
  in-memory token ever being updated — the retried request would then reuse the stale token. Either
  make `tryRefresh()` capture and set the new token from its own response, or have it call
  `realAuthService.refresh()` instead of raw `api()`. Add a test asserting the token used on the
  retried request is the new one, not the pre-refresh one.
- `src/store/authStore.js` (modify): `user`, `status: 'unknown'|'authed'|'guest'`, access token **in memory only**; persist `user` alone under `diu-auth`. Needs a `merge`/migration so an existing persisted blob from the prototype doesn't resurrect a stale token (the S1 retro rule).
- `src/features/auth/useAuth.js` (modify): `resetAll()` on logout — auth + test + anti-cheat stores **and** the react-query cache.
- `src/features/auth/AuthProvider.jsx` (modify): on mount, if `status === 'unknown'`, try `refresh` then `me` to restore the session; render nothing decisive until it settles so `ProtectedRoute` can't bounce an authenticated user to `/login`.
- `src/features/auth/ProtectedRoute.jsx` (modify): handle `status: 'unknown'` explicitly.
- Tests: `src/features/auth/useAuth.test.js` (extend), `src/store/authStore.test.js` (create).

## Acceptance criteria
1. [x] After login, `localStorage['diu-auth']` contains the user but **no token** — assert on the raw string, with a repo-wide grep proving no code writes a token to storage.
2. [x] A reload with a valid refresh cookie restores the session without a visible bounce to `/login`.
3. [x] Logout clears auth, test and anti-cheat state and the query cache; a second user on the same browser sees nothing of the first (FR-AUTH-04 — the T-024 privacy fix must still hold, keep its regression test green).
4. [x] Login honours `location.state.from` when the role allows it, else the role dashboard (FR-AUTH-09, D-14 regression test stays green).
5. [x] A persisted `diu-auth` written by the old prototype shape loads without crashing and without restoring a token.
6. [x] With `VITE_USE_MOCKS=true` everything still works offline against mocks.
7. [x] `pnpm lint` (0 warnings), `pnpm test:all`, `pnpm build` pass — SPA leg only; see Agent log for the server leg.

## Verify
```bash
pnpm lint && pnpm test:all && pnpm build
# manual: docker compose up -d mongo; pnpm dev:server; VITE_USE_MOCKS=false pnpm dev
```

## Out of scope
- Moving test sessions, questions or results to the API (S4/S5). OTP UI (P6).

## Agent log
- `api.js`: `tryRefresh()` now captures `{accessToken}` from its own `/auth/refresh` response and calls `setAccessToken` before the retry (carry-forward fix); new `api.test.js` case asserts the retry uses the new bearer token, not the stale one.
- `authStore.js`: added `status: 'unknown'|'authed'|'guest'`; `isAuthenticated` kept as a plain field (not a getter) so Header/useTestEngine/Login+RegisterPage (not in this card's files) stay correct unchanged. `partialize` writes only `user`; a custom `merge` drops everything else from a persisted blob (old `isAuthenticated`, any future token field), `status` always restarts `'unknown'`. `mock/authService.js` gained `refresh`/`logout`/`me` so the restore flow is mode-agnostic.
- `useAuth.js`: added standalone `resetAll()` (auth+test+anti-cheat + `queryClient.clear()`); `logout()` clears local state synchronously first, then best-effort fires `authService.logout()`. New `src/lib/queryClient.js` module singleton so `resetAll` needs no `QueryClientProvider` (`Header.test.jsx`, untouchable, renders `<Header/>` with none); `main.jsx` now imports that same singleton — smallest out-of-list change, needed for AC3 (main.jsx's own comment had deferred D-15 to this card).
- `AuthProvider.jsx`: restore-on-mount (`refresh` then `me`), `<PageSpinner/>` while `status==='unknown'`. **Found + fixed a real bug verifying AC2 live**: StrictMode double-invokes the mount effect in dev, firing two concurrent `/auth/refresh` calls; since refresh tokens rotate and are single-use (FR-AUTH-03), the second reused the already-rotated cookie and the server revoked the whole token family — every reload bounced to `/login`. Fixed with a module-level single-flight promise (mirrors `api.js`'s own `tryRefresh()` dedup).
- `ProtectedRoute.jsx` now checks `status` (`'unknown'`→spinner, not `'authed'`→`/login`) instead of the old boolean.
- Tests: extended `useAuth.test.js` (status/query-cache/best-effort-revoke/standalone `resetAll`) and created `authStore.test.js` (status transitions, AC1 raw-string + repo-wide `setItem`/token grep, AC5 old-blob + malformed-blob rehydration).
- Verify (SPA): `pnpm lint` 0 err/warn; `npx vitest run` 257/257 incl. unmodified `Header.test.jsx` (T-024), `LoginPage`/`RegisterPage.test.jsx` (D-14); `pnpm build` OK.
- Verify (manual, real server via Paseo `browser` tab per Main's instruction): `docker compose up -d mongo` + `pnpm dev:server` + `VITE_USE_MOCKS=false pnpm dev`. Registered+logged in a real candidate: `diu-auth` raw string held only `user`, no token substring. Reload → exactly one `/auth/refresh`(200)+`/auth/me`(200), stayed on `/candidate/dashboard`, no `/login` flash. Logout → one `/auth/logout`(204), `diu-auth`→`{user:null}`, a follow-up refresh returned 401 (server revoke confirmed).
- **Not verified by me**: `pnpm test:all`'s server leg — fails in this sandbox with `MongoServerError: No space left on device`/`MongoMemoryServer` crashes; `/tmp` tmpfs is 100% full from concurrent sibling agents, unrelated to any file this card touches (no `server/` files modified). A separate task (`MarvellousMarten`) was already investigating it.
- Noted, not fixed (out of file list): `RegisterPage.jsx`'s form is missing `sscGpa`/`hscGpa`/`hscGroup`, which the real `/auth/register` requires; I registered the manual-verify candidate directly against the API instead.

## Review
