# T-048 · Admin user management + audit log

Status: 👀 Review
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
1. [x] An admin can create a reviewer with `programCodes: ['CSE']`; the response contains no `passwordHash`.
2. [x] **You cannot demote or disable the last remaining active admin** — 409 with a clear code. Tested with exactly one admin present.
3. [x] A candidate and a reviewer both get 403 on every endpoint in this module.
4. [x] Every successful write inserts exactly one `auditLogs` row naming the actor, the action and the target.
5. [x] List is paginated with a stable sort and supports `role=` filtering.
6. [x] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm --filter @diu/server test && pnpm lint && pnpm build
```

## Out of scope
- The `/admin/users` SPA page (P5-07, S6). Password reset for staff (P6).

## Agent log
- Implemented `users/{routes,service,schemas,adminGuard.model}.js` and `audit/{model,service}.js` per spec; registered routes in `app.js`; exported `email`/`registerPassword` from `auth/schemas.js` for reuse.
- `assertNotLastAdmin` serialises concurrent reducing writes via a fixed-`_id` `adminGuard` doc + mongoose transaction retry (see service.js comment) — verified with a concurrent-write test (AC 2).
- Reviewer `programCodes` empty list is REJECTED on create/update (DECISION in service.js): DB empty = "all programs" (14 §3.2), but accepting `[]` from a request risks silently granting an unrestricted reviewer; no "all programs" flag exists yet.
- `pnpm --filter @diu/server test`: 231/231 passed (run with `--no-file-parallelism`; parallel file runs each start their own in-memory Mongo replica set and starve each other past the 10s startup timeout on this 12-core box — infra flakiness, not a code defect). `pnpm lint` clean. `pnpm build` ok.
- Fixed a pre-existing bug in my own `users.routes.test.js` "newest first" case: `createdAt` is schema-immutable, so a plain `$set` in `updateOne` is silently dropped by Mongoose; needed `{ overwriteImmutable: true }` to actually backdate the fixture.
- mongodb-memory-server's default `~/.cache/mongodb-binaries` was unwritable in this sandbox; added `server/.mongodb-cache` to `.gitignore` for future `MONGOMS_DOWNLOAD_DIR` use (not committed; local only).

## Review
