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

- **Review fix (round 2, new commit):** guards moved to `onRequest` (`authenticate` then `requireRole`), JSDoc at `auth.js:6-11` rewritten; probes in `rbac.test.js` register both in `onRequest` (the no-authenticate probe too). New matrix row `admin only write (body schema)`: POST `/_probe/admin-write` with `schema.body`, empty body, expects anon 401 / candidate 403 / reviewer 403 / admin 422.
  - Before (guards still in `preHandler`, new row added): `× candidate`, `× reviewer`: `expected 422 to be 403`; 2 failed | 51 passed (53).
  - After (guards in `onRequest`): 53 passed in rbac.test.js.
  - Verify: server 183 passed (179 + 4 new row cases), lint clean, test:all 225 root + 40 shared + 183 server, build ok.
  - **Note for T-048:** a reviewer saved with empty `programCodes` means "all programs" (context/14 §3.2), so T-048 must validate on write that this is not set by accident (e.g. require an explicit choice). Not implemented here.

## Review
Reviewer-pro, commit 75cc6bc. **Verdict: CHANGES REQUESTED** (one guard-ordering defect; everything else holds).

**Required changes**
1. `server/src/plugins/auth.js:6-8` (usage comment) and the probes in `server/test/rbac.test.js:20-27` put `requireRole` in `preHandler`. Fastify validates the body *before* `preHandler`, so an authenticated candidate who POSTs an invalid body to an admin-only route gets **422 with the route's schema details**, and malformed JSON gets **400**, instead of 403. Reproduced with a throwaway POST probe (`schema.body`): `preHandler` → candidate 422; `onRequest: [authenticate, requireRole('admin')]` → candidate 403. Not a bypass (handler never runs), but it leaks admin request schemas to any signed-in user and every later module will copy the documented pattern. Fix: document and use `onRequest: [app.authenticate, app.requireRole(...)]` (guard order: authenticate → role → validation), and add a matrix row for a POST probe with a body schema, sent an empty body, expecting anon 401 / candidate 403 / reviewer 403 / admin 422. The matrix is GET-only today, so it cannot catch this.
2. Spec note for the planner (not the builder's fault): `context/16-backend-architecture.md:130-131,152` shows `preHandler: requireRole` after schema validation. Correct it to match (1).

**Criteria**
1. ✅ 401 + envelope for missing/malformed/expired/wrong-key (`rbac.test.js:99-141`, `service.js:81-84`). Also tried (throwaway test, deleted): `alg:none`, HS512, non-string `sub` (number, array, `{$ne:null}`, null, true), 12-char string `sub`, `nbf` in the future, double-space and 8 kB bearer: all 401.
2. ✅ candidate → 403, anon → 401 (`auth.js:21-29`; `rbac.test.js:144-155`). Forged `role:'admin'` token for a real candidate → 403 (`rbac.test.js:211`, and I reproduced it on a POST probe).
3. ✅ admin `[]`, reviewer own codes, candidate 403 (`auth.js:36-41`). A reviewer with `programCodes: []` returns `[]`, which means ALL (matches context/14 §3.2 and the card), and is not deny-all; tested at `rbac.test.js:171`. Design note: a reviewer saved with an empty list is unrestricted, so T-048 must validate that on write.
4. ✅ missing / disabled / never-an-ObjectId `sub` rejected (`service.js:85-88`; `rbac.test.js:186-208`).
5. ✅ table-driven: a throwaway row ran for all 4 actors with no new body (53 passed, was 49). A row missing `reviewer` failed twice (`expected 403 to be undefined`, and the completeness guard). Reverted.
6. ✅ see verification.

**Probes 5 and 6**
- Single path: grep over `server/src` shows `verifyAccessToken`/`createVerifier` only in `service.js` (`:63-65`), read by `authenticateBearer`; the only `authorization` reader outside is `plugins/auth.js:18`. `/auth/me` handler and response schema are unchanged from T-046 (`routes.js:71-74`), still 401 without a token. Refresh tokens are opaque DB lookups, not JWTs. `Bearer` is now matched case-insensitively (`service.js:81`, was case-sensitive); harmless, RFC 7235.
- `extraRoutes`: `buildApp` callers are only `server.js` (`buildApp({ config })`) and `test/helpers/app.js`. No env var, config key or default feeds it (grep of `extraRoutes|_probe` over `server/src`, env files, compose, CI: only `app.js`).

**Mutation checks** (all reverted by `git checkout -- server/src`, tree clean; I also restored `rbac.test.js` from backup after the matrix experiments). Each broke an existing test:
candidate `programScope` → `[]` (1 fail); drop `algorithms:['HS256']` (1); drop `ObjectId.isValid` (1); `requireRole` lets reviewer through (2); drop the `!req.user` 401 (4); reviewer scope → `[]` (3).

**Verification** (main tree): server 179 passed; `pnpm lint` clean; `pnpm test:all` 225 root + 40 shared (2 todo) + 179 server passed; `pnpm build` ok (chunk-size notice only).
Not proved: behaviour under a real browser (n/a); a `sub` that is a 12-char string is accepted by `ObjectId.isValid`, but I confirmed it still 401s (no such user), and the token is server-signed anyway.
