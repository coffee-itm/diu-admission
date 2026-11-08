# T-048 · Admin user management + audit log

Status: ✅ Ready
Sprint: S3 · Role: backend-dev · Model: build · Size: M
Tier rationale: privilege escalation surface; the "last admin" rule is a silent-failure invariant (PROCESS §2.3)
Depends on: T-047
Implements: P2-04, FR-AUTH-10

## Goal
Admins can create and manage `reviewer`/`admin` accounts and scope reviewers to programs. Every write is audited.

## Context to read
- `context/15-api-spec.md` the admin users section · `context/14-database-schema.md` §3.9 (`auditLogs`)
- `context/13-srs.md` FR-AUTH-10

## Files
- `server/src/modules/users/routes.js` (create): list (filter by role, paginated), create reviewer/admin, update role and `reviewer.programCodes`, disable/enable. All behind `requireRole('admin')`.
- `server/src/modules/users/service.js` (create): includes the **last-admin guard**.
- `server/src/modules/audit/model.js` + `service.js` (create): `auditLogs` per 14 §3.9; a `record(actorId, action, target, meta)` helper called by every write here.
- `server/test/users.routes.test.js` (create).

## Acceptance criteria
1. [ ] An admin can create a reviewer with `programCodes: ['CSE']`; the response contains no `passwordHash`.
2. [ ] **You cannot demote or disable the last remaining active admin** — 409 with a clear code. Tested with exactly one admin present.
3. [ ] A candidate and a reviewer both get 403 on every endpoint in this module.
4. [ ] Every successful write inserts exactly one `auditLogs` row naming the actor, the action and the target.
5. [ ] List is paginated with a stable sort and supports `role=` filtering.
6. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm --filter @diu/server test && pnpm lint && pnpm build
```

## Out of scope
- The `/admin/users` SPA page (P5-07, S6). Password reset for staff (P6).

## Agent log

## Review
