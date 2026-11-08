# T-046 · Auth routes: register, login, refresh, logout, me

Status: 👀 Review
Sprint: S3 · Role: backend-dev · Model: build · Size: M
Tier rationale: public attack surface — cookie flags, generic errors, throttling; silent failure modes (PROCESS §2.3)
Depends on: T-045
Implements: P2-02 (HTTP half), FR-AUTH-01/02/03/04/10

## Goal
The five core auth endpoints under `/api/v1/auth`, matching `context/15` §2 exactly.

## Context to read
- `context/15-api-spec.md` §2 (request/response shapes and status codes) and §1 (error envelope)
- `context/16-backend-architecture.md` §4 (route pattern), §5 (cookie + CSRF rules)
- `context/13-srs.md` FR-AUTH-01/02/03/04/10

## Files
- `server/src/modules/auth/routes.js` (create): `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- `server/src/modules/auth/schemas.js` (create): Zod request/response schemas. Registration validation must match **FR-AUTH-01 exactly** — name 3–100, lowercased unique email, BD phone `^(?:\+?880|0)?1[3-9]\d{8}$` (widened 2026-11-08) normalised to `+8801XXXXXXXXX`, `programCode` an active program, GPAs 0–5, `hscGroup` enum, password ≥ 8 with a letter and a digit.
- `server/src/app.js` (modify): register the auth module; add `@fastify/cookie`; per-route rate limit on login.
- `server/package.json` (modify): `@fastify/cookie`. **JWT: use the `fast-jwt` verifier already wired into `server/src/modules/auth/service.js` by T-045** — do not add a second JWT library, and do not re-read the secret anywhere else.
- Note from the T-045 log: check `isLocked` **before** verifying the password, so a locked account cannot be probed.
- `server/test/auth.routes.test.js` (create).

## Acceptance criteria
1. [ ] `POST /auth/register` → 201 `{ user, accessToken }` and sets `diu_rt`. The response body contains **no** `passwordHash`.
1b. [ ] **Do not rely on `toJSON` alone.** The T-044 review proved the hash still escapes through `.toObject()`, `.select('+passwordHash')`, `.select('+passwordHash').lean()` and `User.aggregate()`. Add an explicit response mapper (e.g. `toPublicUser(user)`) used by **every** route in this module, and a test that serialises a doc fetched with `+passwordHash` through it and asserts the hash is gone.
2. [ ] A `role` field in the register body is **ignored** — the created user is always `candidate` (FR-AUTH-10). Test it explicitly.
3. [ ] Invalid registration → 422 `VALIDATION_ERROR` with per-field `details[]`; duplicate email → 409.
4. [ ] `POST /auth/login` with a wrong password and with an unknown email return the **same** 401 code and message (no user enumeration), proven by comparing both responses in a test.
5. [ ] The `diu_rt` cookie is `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, and `Secure` when `COOKIE_SECURE=true`.
6. [ ] `POST /auth/refresh` rotates the cookie and returns a new access token; replaying the previous cookie → 401 **and** the family is revoked (end-to-end over HTTP, not just the service).
7. [ ] 5 failed logins for one email within 15 min lock the account for 15 min, but **every** credential failure (attempts 1–4, the locking attempt 5, and attempts 6+ while locked) returns the same generic 401, byte-identical to the unknown-email 401 (same status, same body). 429 comes only from the per-IP limiter (FR-AUTH-02, clarified 2026-11-08). Test asserts the account is genuinely locked in the DB.
8. [ ] `POST /auth/logout` → 204, clears the cookie, and the refresh token no longer works.
9. [ ] `GET /auth/me` returns exactly the field list in 15 §2 for an authenticated user; 401 without a token.
10. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm --filter @diu/server test && pnpm lint && pnpm build
```

## Out of scope
- OTP endpoints, password reset, `PATCH /auth/me` (P6/S5). Admin user management (T-048).

## Agent log
- Added `@fastify/cookie`; `auth/{routes,schemas}.js`, `users/toPublicUser.js`; `auth/service.js` gained `registerCandidate`, `loginWithPassword`, `refreshSession`, `getActiveUser` (routes stay Mongoose-free). Same `fast-jwt` verifier/config, no second JWT lib, secret read only in `service.js`.
- Tests first: criteria 4 and 6 failed with 404 (route missing) before implementing. 97 server tests pass (39 routes, 1 cookie-secure, 15 config). Mutation check: dropping the `isLocked` guard fails the lock tests.
- 1b: `toPublicUser` is an allow-list; tested on a doc with `+passwordHash`, `.toObject()`, `.lean()`+hash, `aggregate()` (premise asserted: the raw shapes DO contain the hash). Response Zod schemas strip as a 2nd layer.
- `JWT_ACCESS_TTL`: **rejects bare numbers** (`^[1-9]\d*[smhd]$`). Chose reject over "read as seconds": fast-jwt reads 900 as ms, jsonwebtoken as s; a loud boot failure beats a silent guess.
- Password capped at 128 (register + login). Lock checked before verify; locked/unknown/disabled all do one dummy argon2 verify.
- **Spec tension (needs a ruling):** FR-AUTH-02/crit 7 say 5 failures → 429, the T-046 brief says a correct password during a lock → 401. Implemented: the 5th failure (the one that locks) → 429, any attempt during the lock → generic 401. The 429 is itself a weak existence oracle (unknown emails never lock).
- Other decisions: duplicate phone → 422 on `phone` (no documented 409 code); refresh/logout reject a foreign `Origin` with 403 (16 §5); rate limit 10/min/IP on login+register only, not refresh; failed refresh clears the cookie; `/me` uses a local bearer check until T-047's `authenticate`.
- (SUPERSEDED by Ruling 1 below.) FR-AUTH-01's phone regex has no leading `0`, so `01712345678` is rejected (followed the FR exactly). SPA registration form must send `+8801…`/`8801…` or the FR should be widened.

- **Planner rulings (2026-11-08), follow-up commit:** (1) Phone widened to `^(?:\+?880|0)?1[3-9]\d{8}$`; normalisation is now `+880` + last 10 digits. Table-driven tests: 4 forms (+ whitespace) → one stored value `+8801712345678`; forms collide as duplicate phone; 13 invalid cases (operator digit, short, long, letters, bad prefix, empty) → 422 on `phone`. (2) Lockout never returns 429: the locking attempt and attempts 6–8 return a 401 byte-identical to the unknown-email one (status+body+content-type, no `retry-after`), DB shows `lockedUntil` set and not extended. Per-IP limiter untouched; dummy-argon2 timing untouched. Criterion 7 text rewritten.
- **Heads-up:** the first amendment of `context/13-srs.md` was corrupted (the `$` in the new regex made the whole file get pasted into the FR-AUTH-01 row and the tail from FR-QB-05 on was cut: 132 lines vs 192). I restored it from HEAD and re-applied exactly the two row edits (diff vs HEAD = 2 lines). Your broken copy is at `/tmp/13-srs.user-amended.md`. The file is **not staged** in my commit: it's your edit, please commit it.

## Review
