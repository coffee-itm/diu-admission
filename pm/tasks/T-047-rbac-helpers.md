# T-047 · RBAC: `authenticate`, `requireRole`, `programScope` + the matrix test

Status: 👀 Review
Sprint: S3 · Role: backend-dev · Model: build · Size: S
Tier rationale: an authorization bug is the definition of a silent, high-cost failure (PROCESS §2.3)
Depends on: T-046
Implements: P2-03, FR-AUTH-08, NFR-07

## Goal
Reusable guards every later module will depend on, plus the RBAC matrix test skeleton from `context/18`.

## Context to read
- `context/16-backend-architecture.md` §5 (last paragraph: `requireRole`, `programScope`), §4
- `context/18-testing-strategy.md` the **RBAC matrix** row
- `context/13-srs.md` FR-AUTH-08

## Files
- `server/src/plugins/auth.js` (create, `fastify-plugin`): decorates `fastify.authenticate` (verifies the bearer JWT → `req.user`), `fastify.requireRole(...roles)`, and `fastify.programScope(req)` returning the reviewer's `programCodes` filter (empty array = all programs).
- `server/src/modules/health/routes.js` (modify): add a tiny guarded probe route **only if** the card's tests need one; otherwise leave untouched and test the guards through the auth routes.
- `server/test/rbac.test.js` (create): the matrix for {anon, candidate, reviewer(CSE), admin} × the endpoint groups that exist today, written so later sprints add rows rather than rewrite it.

## Acceptance criteria
1. [x] A missing, malformed, expired or wrong-signature token each yields 401 with the standard envelope — four separate assertions.
2. [x] `requireRole('admin')` returns **403** for an authenticated candidate and 401 for anon. The distinction is tested.
3. [x] `programScope` returns `[]` (meaning all) for admin, and the reviewer's own `programCodes` for a reviewer.
4. [x] A token whose `sub` no longer exists, or whose user is `status: 'disabled'`, is rejected.
5. [x] The matrix test is table-driven, so a new endpoint group is one added row.
6. [x] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm --filter @diu/server test && pnpm lint && pnpm build
```

## Out of scope
- Applying `programScope` to real queries (S6, when admin result endpoints exist).

## Agent log
- `server/src/plugins/auth.js` (fp): `authenticate`, `requireRole(...roles)` (throws at startup on none/unknown role), `programScope(req)` (admin → `[]`, reviewer → own codes, candidate → 403, never "all").
- Single token path: new `authenticateBearer` in `auth/service.js` (verify → load user → must exist + `active`). `/auth/me` now uses `app.authenticate`; `requireBearer` deleted. Grep over `server/src`: `verifyAccessToken`/`createVerifier`/`JWT_ACCESS_SECRET` only in `service.js` (+ config.js definition); the only `authorization` reader outside is the plugin handing the header to the service.
- Decision: `req.user = { sub, role, programCodes }` comes from the DB, not the token, so a demoted/re-scoped/disabled user loses access immediately (costs one indexed read per request). Token `role`/`pc` claims are ignored on read.
- No probe route in production code: `buildApp` takes `extraRoutes` (tests only; `startTestApp({ extraRoutes })`), the matrix registers its probes there.
- `server/test/rbac.test.js`: `MATRIX` rows × {anon,candidate,reviewer(CSE),admin}, one `describe.each/it.each`; adding a group = one row. Plus 4 separate token-failure tests, 401-vs-403, programScope, deleted/never-valid-sub/disabled/demoted.
- Mutation-checked: dropping the `status` check or trusting the token role makes tests fail. Gotcha: fast-jwt reads a bare `expiresIn` number as ms (hit it in my own test signer; use '15m').
- Verify: server 179 passed (49 new), lint clean, test:all 225 root + 40 shared + 179 server passed, build ok (existing chunk-size notice only).


## Review
