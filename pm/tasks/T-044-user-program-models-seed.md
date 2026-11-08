# T-044 · `programs` + `users` models, indexes and the seed script

Status: 👀 Review
Sprint: S3 · Role: backend-dev · Model: lite · Size: M
Tier rationale: the schemas are given verbatim in context/14 §3.1–3.2; failures are loud (model/index tests) (PROCESS §2.3)
Depends on: —
Implements: P2-01, FR-AUTH-01, FR-AUTH-10

## Goal
`@diu/server` gets its first two Mongoose models exactly as specified, plus a seed script that loads the 13 programs and one admin account. No HTTP routes in this card.

## Context to read
- `context/14-database-schema.md` §3.1 (`programs`), §3.2 (`users`), §3.8 (`refreshTokens`), §5 (seeding)
- `context/16-backend-architecture.md` §1 (module layout), §10 (coding rules)
- `src/lib/constants.js` `PROGRAMS` (the 13 entries to seed)

## Files
- `server/src/modules/programs/model.js` (create): `ProgramSchema` exactly as 14 §3.1 (string `_id`, uppercase, faculty enum, `active`).
- `server/src/modules/users/model.js` (create): `UserSchema` exactly as 14 §3.2 — all four index declarations, `passwordHash` with `select: false`, and the `toJSON` transform that drops `passwordHash`, `failedLogins`, `__v` and renames `_id` → `id`.
- `server/src/modules/auth/refreshToken.model.js` (create): `RefreshTokenSchema` per 14 §3.8, including the TTL index on `expiresAt`.
- `server/scripts/seed.js` (create): idempotent upsert of the 13 programs and one admin (`admin@diu.edu`) whose password comes from env, never a literal. Refuse to run with `NODE_ENV=production` unless `SEED_ALLOW_PROD=true`.
- `server/package.json` (modify): add `argon2` (needed by the seed to hash the admin password) and a `seed` script so the existing root `pnpm seed` works.
- `server/test/models.test.js` (create): tests below, using the T-037 helper.

## Acceptance criteria
1. [ ] Saving a user persists an argon2id `passwordHash`, and `JSON.stringify(user)` contains **no** `passwordHash`, no `failedLogins` and no `__v`, and has `id` not `_id`.
2. [ ] A duplicate email is rejected by the unique index. Two users with no phone can both be saved (the partial index allows it).
3. [ ] `pnpm seed` run twice leaves exactly 13 programs and exactly 1 admin (idempotent), verified by a test or by pasted output against the docker Mongo.
4. [ ] The programs seeded match `PROGRAMS` in `src/lib/constants.js` one-for-one (ids, names, faculties).
5. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass with no new warnings.

## Verify
```bash
docker compose up -d mongo && pnpm --filter @diu/server test && pnpm seed && pnpm seed && pnpm lint && pnpm build
```

## Out of scope
- Any route or controller (T-045/T-046). OTP fields beyond what the schema declares. Question/cycle models (S4).

## Agent log
- Changed: `server/src/modules/{programs/model,users/model,auth/refreshToken.model}.js` (new), `server/scripts/seed.js` (new), `server/test/models.test.js` (new, 12 tests), `server/package.json` (+argon2 ^0.44.0, +`seed` script).
- **Out-of-list touch:** `pnpm add argon2` wrote a placeholder `argon2: set this to true or false` into `pnpm-workspace.yaml` `allowBuilds`; set it to `true` (argon2 ships linux-x64 prebuilds; install script is needed). Coordinator: please ack.
- Seed reads `SEED_ADMIN_PASSWORD` (>=12 chars, env only) and `SEED_ALLOW_PROD`; these are not in `config.js` (not in card list), so the seed validates them itself. `ROLES`/faculty enums are not in `@diu/shared` yet, so enums are inline per §3.1/§3.2.
- Seed imports `PROGRAMS` from `../../src/lib/constants.js` (one source of truth); a server-only container image would need it copied.
- Tests: `pnpm --filter @diu/server test` → Test Files 2 passed, Tests 17 passed (models 12 + health 5).
- Docker seed run 1 and run 2: `seed ok: programs=13 admins=1` both times. Live `users` indexes: `phone_1` unique with `partialFilterExpression {phone:{$type:'string'}}`.
- Gate: `pnpm lint` exit 0 (no warnings); `pnpm test:all` 225 root + 40/2todo shared + 17 server passed; `pnpm build` exit 0 (chunk-size warning pre-existing).

## Review
