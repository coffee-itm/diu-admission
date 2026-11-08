# T-047 · RBAC: `authenticate`, `requireRole`, `programScope` + the matrix test

Status: ✅ Ready
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
1. [ ] A missing, malformed, expired or wrong-signature token each yields 401 with the standard envelope — four separate assertions.
2. [ ] `requireRole('admin')` returns **403** for an authenticated candidate and 401 for anon. The distinction is tested.
3. [ ] `programScope` returns `[]` (meaning all) for admin, and the reviewer's own `programCodes` for a reviewer.
4. [ ] A token whose `sub` no longer exists, or whose user is `status: 'disabled'`, is rejected.
5. [ ] The matrix test is table-driven, so a new endpoint group is one added row.
6. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm --filter @diu/server test && pnpm lint && pnpm build
```

## Out of scope
- Applying `programScope` to real queries (S6, when admin result endpoints exist).

## Agent log

## Review
