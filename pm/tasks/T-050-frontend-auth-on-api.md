# T-050 · `authService` on the real API, `authStore` rework, token in memory

Status: ✅ Ready
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
1. [ ] After login, `localStorage['diu-auth']` contains the user but **no token** — assert on the raw string, with a repo-wide grep proving no code writes a token to storage.
2. [ ] A reload with a valid refresh cookie restores the session without a visible bounce to `/login`.
3. [ ] Logout clears auth, test and anti-cheat state and the query cache; a second user on the same browser sees nothing of the first (FR-AUTH-04 — the T-024 privacy fix must still hold, keep its regression test green).
4. [ ] Login honours `location.state.from` when the role allows it, else the role dashboard (FR-AUTH-09, D-14 regression test stays green).
5. [ ] A persisted `diu-auth` written by the old prototype shape loads without crashing and without restoring a token.
6. [ ] With `VITE_USE_MOCKS=true` everything still works offline against mocks.
7. [ ] `pnpm lint` (0 warnings), `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm lint && pnpm test:all && pnpm build
# manual: docker compose up -d mongo; pnpm dev:server; VITE_USE_MOCKS=false pnpm dev
```

## Out of scope
- Moving test sessions, questions or results to the API (S4/S5). OTP UI (P6).

## Agent log

## Review
