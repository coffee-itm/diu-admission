# T-044 · `programs` + `users` models, indexes and the seed script

Status: ✔️ Done
Sprint: S3 · Role: backend-dev · Model: lite · Size: M
Tier rationale: the schemas are given verbatim in context/14 §3.1–3.2; failures are loud (model/index tests) (PROCESS §2.3)
Depends on: —
Implements: P2-01, FR-AUTH-01, FR-AUTH-10

## Goal
`@diu/server` gets its first two Mongoose models exactly as specified, plus a seed script that loads the 13 programs and one admin account. No HTTP routes in this card.

## Context to read
- `context/14-database-schema.md` §3.1 (`programs`), §3.2 (`users`), §3.8 (`refreshTokens`), §5 (seeding)
- `context/16-backend-architecture.md` §1 (module layout), §10 (coding rules)
- `context/14-database-schema.md` §3 preamble: **shared enums (`ROLES`, faculties) live in `packages/shared/constants.js`**
- `src/lib/constants.js` `PROGRAMS` (the 13 entries to seed — but see the Files list: they move to `@diu/shared`)

## Files
- `server/src/modules/programs/model.js` (create): `ProgramSchema` exactly as 14 §3.1 (string `_id`, uppercase, faculty enum, `active`).
- `server/src/modules/users/model.js` (create): `UserSchema` exactly as 14 §3.2 — all four index declarations, `passwordHash` with `select: false`, and the `toJSON` transform that drops `passwordHash`, `failedLogins`, `__v` and renames `_id` → `id`.
- `server/src/modules/auth/refreshToken.model.js` (create): `RefreshTokenSchema` per 14 §3.8, including the TTL index on `expiresAt`.
- `packages/shared/constants.js` (modify): add `PROGRAMS` (moved from `src/lib/constants.js`), `ROLES` and the `FACULTIES` enum. `src/lib/constants.js` re-exports `PROGRAMS` so no SPA import site changes — the same shim pattern as T-033.
- `server/scripts/seed.js` (create): idempotent upsert of the 13 programs and one admin (`admin@diu.edu`) whose password comes from env, never a literal. Refuse to run with `NODE_ENV=production` unless `SEED_ALLOW_PROD=true`.
- `server/package.json` (modify): add `argon2` (needed by the seed to hash the admin password) and a `seed` script so the existing root `pnpm seed` works.
- `server/test/models.test.js` (create): tests below, using the T-037 helper.

## Acceptance criteria
1. [ ] Saving a user persists an argon2id `passwordHash`, and `JSON.stringify(user)` contains **no** `passwordHash`, no `failedLogins` and no `__v`, and has `id` not `_id`.
2. [ ] A duplicate email is rejected by the unique index. Two users with no phone can both be saved (the partial index allows it).
3. [ ] `pnpm seed` run twice leaves exactly 13 programs and exactly 1 admin (idempotent), verified by a test or by pasted output against the docker Mongo.
4. [ ] The programs seeded match `PROGRAMS` in `src/lib/constants.js` one-for-one (ids, names, faculties).
5. [ ] **Nothing under `server/` imports from the SPA's `src/`** — proven by `grep -rn "src/lib" server/`. The server package may only import from `@diu/shared` (ADR-019), otherwise a server-only Docker image cannot build (context/20).
6. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass with no new warnings.

## Verify
```bash
docker compose up -d mongo && pnpm --filter @diu/server test && pnpm seed && pnpm seed && pnpm lint && pnpm build
```

## Out of scope
- Any route or controller (T-045/T-046). OTP fields beyond what the schema declares. Question/cycle models (S4).

## Agent log
- Changed: `server/src/modules/{programs/model,users/model,auth/refreshToken.model}.js` (new), `server/scripts/seed.js` (new), `server/test/models.test.js` (new, 12 tests), `server/package.json` (+argon2 ^0.44.0, +`seed` script).
- **Out-of-list touch:** `pnpm add argon2` wrote a placeholder `argon2: set this to true or false` into `pnpm-workspace.yaml` `allowBuilds`; set it to `true` (argon2 ships linux-x64 prebuilds; install script is needed). Coordinator: please ack.
- Seed reads `SEED_ADMIN_PASSWORD` (>=12 chars, env only) and `SEED_ALLOW_PROD`; these are not in `config.js` (not in card list), so the seed validates them itself. - Fix round (fix(...) commit, same [T-044]): `PROGRAMS`, `ROLES`, `FACULTIES` moved to `packages/shared/constants.js`; `src/lib/constants.js` re-exports `PROGRAMS` (no SPA import site changed). Models use `ROLES`/`FACULTIES`; seed and tests import `@diu/shared/constants`. `server/package.json` already depended on `@diu/shared`.
- Tests: `pnpm --filter @diu/server test` → Test Files 2 passed, Tests 17 passed (models 12 + health 5).
- Docker seed run 1 and run 2: `seed ok: programs=13 admins=1` both times. Live `users` indexes: `phone_1` unique with `partialFilterExpression {phone:{$type:'string'}}`.
- Gate: `pnpm lint` exit 0 (no warnings); `pnpm test:all` 225 root + 40/2todo shared + 17 server passed; `pnpm build` exit 0 (chunk-size warning pre-existing).
- Fix-round verify: `pnpm --filter @diu/server test` → 2 files / 17 tests passed. `pnpm seed` ×2 → `seed ok: programs=13 admins=1` both runs (SEED_ADMIN_PASSWORD generated at runtime, not committed). `pnpm lint` exit 0; `pnpm test:all` 29 files / 225 root, shared 40 + 2 todo, server 17 passed; `pnpm build` exit 0.
- Criterion 5 proof: `grep -rn "src/lib" server/` → no output (exit 1).

## Review
**Verdict: APPROVED** (reviewer-pro, commits 7377684 + 04b535a + f70212a, main tree, scratch DB `rv_t044` on the docker Mongo, dropped afterwards).

| AC | Result | Evidence |
|:-:|:-:|:--|
| 1 | ✅ | `users/model.js:38-46` transform; live: `JSON.stringify` has no `passwordHash`/`failedLogins`/`__v`/`_id`, has `id`. Stored hash is `$argon2id$v=19$m=19456,t=2,p=4` (read from Mongo). |
| 2 | ✅ | `model.js:32-34`; live `email_1` unique, `phone_1` unique + `partialFilterExpression {phone:{$type:'string'}}`. Two no-phone and two `phone:null` inserts succeed; dup email and dup phone → 11000. |
| 3 | ✅ | Seed ×3 on a fresh DB → `programs=13 admins=1` each time. A 3rd run with a different password did not touch the admin (no rotation, documented). |
| 4 | ✅ | Evaluated the pre-T-044 `PROGRAMS` (`git show 4bd1772:src/lib/constants.js`) against `packages/shared/constants.js`: `JSON.stringify` identical, 13 entries. Seed test compares id/name/faculty. |
| 5 | ✅ | `grep -rn "src/lib" server/` → no output. No `../../src` or `packages/` escapes in `server/` (the only `../../src` hits are `server/test/helpers`, i.e. server's own `src`). `server/package.json:8` declares `"@diu/shared": "workspace:*"`; `packages/shared/constants.js` has no imports; `exports "./*": "./*.js"` resolves `@diu/shared/constants`. |
| 6 | ✅ | `pnpm lint` clean; `pnpm test:all` 29 files / 225 root, shared 40 + 2 todo, server 17; `pnpm build` ok (chunk warning pre-existing). `src/lib/constants.js:8` re-exports `PROGRAMS`; the only SPA consumer, `RegisterPage.jsx:3`, is unchanged. |

**Invariant 1 — serialization leak matrix** (measured with `_rv_ser.mjs`, deleted):
| Path | passwordHash | failedLogins / __v / _id |
|:--|:-:|:-:|
| `JSON.stringify(doc)` / `.toJSON()` (also `+passwordHash`, also populated parent) | no | no |
| `find()` default `.lean()` | no (`select:false` holds) | **yes** |
| `doc.toObject()` of a doc from `create()` or `.select('+passwordHash')` | **LEAKS** | yes |
| `.select('+passwordHash').lean()` | **LEAKS** | yes |
| `User.aggregate()` (select:false is ignored) | **LEAKS** | yes |
| `.toJSON({transform:false})` | **LEAKS** | yes |
Only `JSON.stringify`/`toJSON` is safe. The existing test covers only that path.

**Invariant 2:** seed calls `{type: argon2id, memoryCost: 19456, timeCost: 2}` (`seed.js:19`), which matches context/16 §5 (line 183). Confirmed on the stored hash.

**Invariant 4:** no password → exit 1 `required, at least 12 characters`; `short` → same; NODE_ENV=production with valid prod secrets and no override, or `SEED_ALLOW_PROD=false` → exit 1 `refusing to seed…`, and the DB stayed empty. With `=true` it seeds. With dev-default secrets in production, `loadConfig` fails first, so the refusal shows config errors instead of the SEED_ALLOW_PROD message; it is still a refusal and nothing was written. Only counts are logged and only `err.message` is printed. No seed password literal in tracked source; `Admin@1234` appears only in the SPA mock data and README, not in the server.

**Mutation checks** (each reverted with `git checkout`; tree clean apart from BOARD.md): drop `delete passwordHash` / `failedLogins`+`__v` → toJSON test fails ✅; non-partial phone index → no-phone test fails ✅; drop unique email → dup-email test fails ✅; remove prod guard → refusal test fails ✅; unconditional admin create → idempotency test fails ✅; seed `argon2i` → fails ✅; **seed `memoryCost:1024,timeCost:1` → all 12 tests still pass ❌ (surviving mutant)**.

**Non-blocking follow-ups** (none block this card):
1. Add a test asserting the seeded hash contains `m=19456,t=2`. The test file has its own `ARGON2_OPTS` copy and never reads the seed's. T-045 will add a password-hashing helper; the seed should import it rather than keep a second copy of the options.
2. Later sprints must not use `.lean()`, `.toObject()` or `aggregate()` on `User` in response paths without an explicit projection (`failedLogins`, `__v` leak even from default `.lean()`). Never combine `+passwordHash` with anything but the login service. A `toObject` transform or a response-DTO mapper in T-046 would close this.
3. Context drift: `context/14` §3.1 still says the seed source is `src/lib/constants.js:8-22`, and §5 says `--force` where the implementation and card use `SEED_ALLOW_PROD=true`. Update both docs at sprint close.
4. Out-of-list `pnpm-workspace.yaml` `allowBuilds: argon2: true` is benign and required; acked.
5. `seed.js` does not import `RefreshToken`, so the `refreshTokens` collection and its TTL index do not exist after `pnpm seed` (the test covers the index; the model creates it on first use in the app).
6. Commit hygiene: 7377684 deleted the card file and 04b535a restored it. History noise only.

Not verified: nothing needing a browser.
