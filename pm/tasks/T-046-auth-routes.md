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
**Verdict: CHANGES REQUESTED** (reviewer-pro, commits fd6f6b8 + 1b67e49 + a958040, main tree, scratch DB `diu_review_t046` on the docker Mongo, dropped afterwards). One required change: the failed-login timing oracle. Everything else held.

**Required change 1 — the dummy argon2 verify does NOT equalise login timing** (`server/src/modules/auth/service.js:284-292`).
The wrong-password path on a real, active, unlocked account does `argon2.verify` **plus** an awaited DB write (`registerFailedLogin`, `:291`, median 8.7 ms). The unknown, locked and disabled paths do the dummy verify and **no** write. Measured over 40 interleaved samples per case, in two separate runs:

| case | p10 | median | p90 |
|:--|--:|--:|--:|
| wrong password, existing active account | 34.0 / 36.4 | 39.3 / 38.9 | 42.3 / 40.4 |
| unknown email | 27.6 / 27.7 | 29.5 / 29.5 | 31.8 / 31.4 |
| locked + correct password | 27.5 / 27.2 | 30.7 / 30.7 | 32.1 / 31.9 |
| disabled + correct password | 24.3 / 25.9 | 30.2 / 30.3 | 32.6 / 31.3 |

The gap is about 9 ms (~30%), the distributions do not overlap (every p90 of the three "no-write" cases is below the p10 of the wrong-password case), and `registerFailedLogin` alone measures 8.7 ms. Since the 429 ruling removed the status oracle, this is the only remaining way to tell "this email is registered and unlocked" from "unknown / locked / disabled", and FR-AUTH-02 says the response must not reveal whether the email exists. Fix: make the three non-matching paths pay an equivalent write (for example the same pipeline update against a fixed non-matching `_id`, awaited), or otherwise bring both paths to the same cost. Add a test that the dummy path issues one write. Re-measure with a p10/p90 table before resubmitting. A statistical timing assertion in CI would be flaky, so the evidence belongs in the log.

**Criteria**

| AC | Result | Evidence |
|:-:|:-:|:--|
| 1, 1b | ✅ | Every response goes through `toPublicUser`: register/login/refresh via `sessionReply` (`routes.js:47`), `/me` (`:81`), logout is 204. Allow-list at `users/toPublicUser.js`. Live over HTTP: register, login, refresh, me, logout, wrong password, `passwordHash` in the request body, 422, 409, malformed JSON, empty body, wrong content-type, bad bearer and 404: `$argon2`/`passwordHash` in body or headers = 0 hits. Premise verified (hash is in the DB). Mutation: `...u` spread in `toPublicUser` fails the 1b tests (the Zod response schema alone would have hidden it over HTTP). The validation 422 does not echo the submitted password. |
| 2 | ✅ | `service.js:253` hard-codes `candidate`. Live, DB-verified: `role` = admin, reviewer, array, nested object, `candidate.role`, `Role`/`ROLE`, duplicate keys, plus `status`/`emailVerifiedAt`/`failedLogins`/`reviewer`/`_id` → 201, DB `candidate`/`active`/unverified/count 0/no reviewer programs. Raw `__proto__` and `constructor.prototype` → 400 from Fastify's JSON parser, no user created, `Object.prototype` clean. Mutation (loose schema + `input.role ?? 'candidate'`) fails the criterion-2 test. |
| 3 | ✅ | 422 with `details[]`, 409 `EMAIL_TAKEN` (observed). |
| 4 | ✅ body, ❌ timing | Wrong password, unknown, locked + correct and disabled + correct are byte-identical: status, body (78 bytes), all headers except `x-request-id`/`x-server-time`/`date`/`x-ratelimit-*`. `retry-after`, `www-authenticate` and `set-cookie` are absent in all four. Timing: see required change 1. |
| 5 | ✅ | `routes.js:7,21`. Real curl: `Path=/api/v1/auth; HttpOnly; SameSite=Strict`, and `; Secure` with `COOKIE_SECURE=true` on register, login, refresh and the clearing cookie. Mutations (`lax`, path `/`) fail 4 and 6 tests. ⚠️ browser enforcement not verified (no browser). |
| 6 | ✅ | Replay of a rotated cookie → 401 and the family rows go `rev:false` → `rev:true` in the DB; the newest token is then 401 too. No cookie, garbage, 5000-char, `%00`, `{"$ne":null}`, duplicate/operator cookies → generic 401. A deleted user → 401 and the family is revoked; a disabled user → 401 (cookie and live access token on `/me`). Foreign `Origin` (`https://evil.example`, `null`, trailing slash, case change, empty) → 403 with the token **not** consumed. Mutation removing `checkOrigin` fails the CSRF test; mutation removing the family revoke fails the replay test. |
| 7 | ✅ | Attempts 1–8: all 401, byte-identical to the unknown-email body, no `retry-after`. DB: count 1,2,3,4 with no `lockedUntil`; attempt 5 → count 5 and `lockedUntil` ≈ +15.00 min; attempts 6–8 leave `lockedUntil` unchanged. Correct password during the lock → 401, no cookie, no refresh row, counter untouched. After expiry, a wrong password restarts at 1 and the correct password → 200 and clears. 12 parallel wrong attempts → count 12 (atomic), locked. Per-IP limiter: 10 × 401 then 429 `RATE_LIMITED` with `Retry-After: 60`, so only the IP limiter returns 429. Mutation (always re-extend the lock) fails the full suite (one test, in the service tests). |
| 8 | ✅ | Observed: 204, cookie cleared, token dead (covered by the suite). A foreign `Origin` on logout → 403 and the tokens stay live. |
| 9 | ✅ | `/me` returns exactly the 15 §2 fields. 401 with no header, `alg:none`, wrong secret, expired, HS512, and for a deleted or disabled user holding a live token. NoSQL-operator email/password → 422. |
| 10 | ✅ | See below. |
| phone (ruling 1) | ✅ | All four forms store `+8801712345678` (DB read back). All 16 ordered pairs: first 201, second 422 on `phone`, exactly one doc. 4 forms fired concurrently → `201,422,422,422`, 1 doc (partial unique index `phone_1`). 31 invalid values (operator digits 0–2, short/long, letters, spaces inside, `-`, Bengali digits, `\0`, `++`, null/number/array/object/bool) → 422 on `phone`, and no stored candidate phone fails `^\+8801[3-9]\d{8}$`. Normalisation mutation (`slice(-10)` → identity) fails 8 tests. |
| `JWT_ACCESS_TTL` | ✅ | `config.js:17`. Real `node src/server.js`: `900`, `900000`, empty, `15 m`, `0s`, `1.5h`, `-5m`, `15M`, `abc`, `15m\n` → exit 1 and a readable 2-line message, no value echoed. `15m` and unset boot. A real token's `exp - iat` = 900 s. The message says "a bare number is ambiguous" even for `abc`, which is cosmetic. |
| SRS amendment | ✅ | `a958040` changes 2 rows; the file is 192 lines, same as HEAD (the earlier corruption is gone). |

**Non-blocking observations (not required for this card)**
- `registerFailedLogin` (`service.js:176`) has no 15-minute window: the counter is reset only by a success or an expired lock, so 4 typos in March plus 1 in November lock the account. FR-AUTH-02 says "within 15 min". Suggest a `lastFailedAt` or a follow-up card.
- `routes.js` refresh `catch` clears the cookie for any error, including a 5xx from a DB blip, so a transient outage logs the user out. Clear it only for the 401.
- `checkOrigin` compares with `CORS_ORIGINS` only. A same-origin deployment (SPA served from the API host) still sends `Origin` on POST and gets 403 unless that origin is listed. Note it for the deployment card.
- `trustProxy` is set nowhere in `server/src` (`context/20-deployment-ops.md:55` requires it). Behind a proxy every client shares one IP and the new 10/min/IP login limit throttles the whole site. For the deployment card.
- `409 EMAIL_TAKEN` and the phone 422 reveal registered emails/phones. That is by spec (FR-AUTH-01), bounded by the 10/min/IP limit.

**Verification (main tree):** `pnpm --filter @diu/server test` 120 passed; `pnpm lint` clean; `pnpm test:all` root 225 passed, shared 40 (2 todo), server 120; `pnpm build` ok (pre-existing chunk-size warning). All mutations were reverted with `git checkout`; `git status` shows only `pm/BOARD.md` modified. Scratch scripts were in `/tmp/t046`, outside the repo.

**Not proven:** cookie behaviour in a real browser (SameSite/Secure/Path are proven only at the header level); timing over a real network (measured in-process against the docker Mongo on one 12-core host).

## Review fix round 1 (backend-dev, new commit tagged [T-046])
- **Timing oracle fixed.** Unknown-email / locked / disabled now do the dummy argon2 verify **plus one awaited, genuinely modifying write** (`dummyFailedLoginWrite`: pipeline `findAndModify` upsert on one fixed row in a new `loginTimingDecoy` collection, `auth/loginDecoy.model.js`). Not the reviewer's first suggestion (same update against a non-matching `_id`): I tried it and measured it is NOT equivalent: a no-match update writes no oplog entry, ~3.2 ms vs ~7.5 ms for a real write (200 samples each), and it only closed the gap from ~10.5 ms to ~6.7 ms (medians), still non-overlapping.
- **Evidence** (in-process `loginWithPassword` against the docker Mongo replset, scratch DB dropped afterwards, 60 samples/case after 10 warm-up, start case rotated each round, a fresh account per wrong-password sample so no counter reset sits between timed calls; ms):

| case | before p10/med/p90 | after p10/med/p90 |
|:--|:--|:--|
| wrong password, active | 36.2 / 39.0 / 42.4 | 34.1 / 36.8 / 38.6 |
| unknown email | 24.2 / 27.4 / 29.3 | 33.3 / 35.4 / 37.0 |
| locked + correct pw | 22.9 / 28.4 / 29.8 | 34.1 / 35.9 / 38.2 |
| disabled + correct pw | 24.0 / 28.8 / 30.3 | 33.7 / 35.6 / 37.1 |

  "Before" (HEAD, 2nd of 2 runs; run 1: 34.4/38.6/42.9 vs 25.6-27.8 medians) reproduces the reviewer's ~10 ms gap, no overlap. "After" (run 3 of 3; gaps of the wrong-pw median vs the other three: run 1 1.6/0.7/0.5, run 2 2.1/1.4/1.4, run 3 1.4/0.9/1.1 ms) overlaps: wrong-pw p10 is below every other case's p90 in all three runs. **Residual:** the wrong-password case is still ~1-2 ms slower at the median (not zero; likely the real-row read/write vs decoy row), well inside the per-case spread (p10..p90 span ~4-5 ms). Not proven over a real network. Caution: my first harness reset the counter between samples and hid the gap entirely (1 ms), so the measurement setup matters.
- **15-minute window.** New `failedLogins.lastFailedAt` (schema line added to `context/14` §3.2; additive, internal, never exposed: `toPublicUser` allow-list and `toJSON` unchanged). The count restarts at 1 when the lock has expired, or when no lock is active and `lastFailedAt` is older than 15 min **or missing** (counters from before this field are treated as stale). An active lock is never shortened or extended by an old timestamp. A success clears `lastFailedAt`.
- Tests (service, 130 server tests pass, was 120): window (16 min stale restarts, 14 min fresh locks, missing timestamp, active lock kept, success clears); timing equalisation: each non-writing path issues exactly one decoy write, touches no user row, creates no user, the wrong-pw path writes only its own user, the success path writes neither, and the decoy write really changes the document each time. Both new test groups failed before the implementation (stale count was 5, not 1; writes called 0 times).
- Not touched, per instructions: `trustProxy`, refresh 5xx clearing the cookie, `Origin` vs `CORS_ORIGINS`.
- Verify: `pnpm --filter @diu/server test` 130 passed; `pnpm lint` clean; `pnpm test:all` root 225, shared 40 (2 todo), server 130; `pnpm build` ok (pre-existing chunk-size warning).
- **For the planner:** (a) new collection `loginTimingDecoy` (one row, upserted) is not in `context/14`; say if you want it documented there. (b) a decoy row is a shared hot document: concurrent failed logins on unknown emails serialise on it (cheap, but worth a glance in the load test).
