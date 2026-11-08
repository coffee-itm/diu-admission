# T-045 · Auth core: argon2id, access JWT, rotating refresh tokens with reuse detection

Status: ✔️ Done
Sprint: S3 · Role: backend-dev · Model: build · Size: M
Tier rationale: security-critical, and every failure mode is silent (a weak hash, a non-rotating token, a missed reuse) (PROCESS §2.3)
Depends on: T-044
Implements: P2-02 (service half), FR-AUTH-02, FR-AUTH-03, ADR-016

## Goal
A pure service layer for credentials and tokens, with no HTTP in it. Routes come in T-046.

## Context to read
- `context/16-backend-architecture.md` §5 (the whole authentication design — read it exactly)
- `context/14-database-schema.md` §3.8 (`refreshTokens`)
- `context/13-srs.md` FR-AUTH-02, FR-AUTH-03

## Files
- `server/src/modules/auth/service.js` (create):
  - `hashPassword` / `verifyPassword` using `argon2id`, `memoryCost: 19456`, `timeCost: 2`.
  - `signAccessToken(user)` → HS256 JWT `{ sub, role, pc? }`, TTL from `JWT_ACCESS_TTL`.
  - `issueRefreshToken(userId, userAgent)` → 32-byte random opaque string; store **only** its sha256; new `familyId`.
  - `rotateRefreshToken(rawToken, userAgent)` → validates, marks the old row `replacedBy`, returns a new token in the same family.
  - **Reuse detection:** presenting a token that already has `replacedBy` (or is revoked) revokes **every** token in that `familyId` and throws.
  - `revokeToken` / `revokeAllForUser`.
  - `registerFailedLogin(user)` / `clearFailedLogins(user)`: 5 failures → `lockedUntil = now + 15 min`.
- `server/src/config.js` (modify): only if a needed key is missing; do not rename existing keys.
- `server/test/auth.service.test.js` (create).

## Acceptance criteria
1. [ ] A stored hash starts with `$argon2id$` **and encodes `m=19456,t=2`** — assert on the encoded parameters, not just the prefix. (The T-044 review proved that weakening the cost to `m=1024,t=1` currently passes every test; close that gap here.) The plaintext password appears nowhere in the document.
1b. [ ] `server/scripts/seed.js` is refactored to call this module's `hashPassword` instead of calling argon2 itself, so the cost parameters have exactly one definition.
2. [ ] `rotateRefreshToken` returns a **different** raw token each call, and the old one stops working.
3. [ ] **Reuse detection:** rotate once, then present the *original* token → it throws, and every row sharing that `familyId` ends up revoked. Assert on the DB rows, not just the thrown error.
4. [ ] Only the sha256 is stored — a query for the raw token string finds nothing.
5. [ ] The access token decodes to `{ sub, role }`, expires per `JWT_ACCESS_TTL`, and **contains no email, name or password data**.
6. [ ] The 5th consecutive failed verify sets `lockedUntil` ≈ now + 15 min; a success clears the counter.
7. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm --filter @diu/server test && pnpm lint && pnpm build
```

## Out of scope
- Routes, cookies, rate-limit wiring (T-046). OTP and password reset (S5/P6).

## Agent log
- `auth/service.js`: hashPassword/verifyPassword (single argon2id m=19456,t=2 definition), signAccessToken/verifyAccessToken, issue/rotate/revokeToken/revokeAllForUser, registerFailedLogin/clearFailedLogins/isLocked. All take `config` (from `loadConfig`) as a trailing arg; no new config keys.
- Test-first: reuse test written first (module missing), then a rotation stub without family revocation → reuse tests failed on "revokedAt not set"; then implemented. Mutation checks: cost m=1024,t=1 → 4 tests fail; revokeFamily no-op → 5 fail.
- Seed and `models.test.js` now go through `hashPassword`; `grep memoryCost|timeCost` hits only `service.js`. models.test.js prefix asserts tightened to `m=19456,t=2`.
- **New dep `fast-jwt`** (not in 16 §2; it is the library `@fastify/jwt` wraps, so T-046 can still use `@fastify/jwt` to verify). Reason: a pure service cannot use the Fastify decorator, and pnpm strict mode hides the transitive copy.
- Decisions to review: (a) the successor row is inserted BEFORE the old token is claimed, so a concurrent loser's family sweep also revokes the winner's new token (found while tracing the race; test loops 10×); (b) `revokeToken` revokes the whole family (logout via an old token leaves no live successor); (c) refresh expiry slides: each rotation sets now+REFRESH_TTL_DAYS; (d) rotation also revokes the family if the user is missing/disabled; (e) `pc` omitted for reviewers with empty programCodes (= all programs); (f) `replacedBy` stores the successor row `_id`; (g) all failures use 401 `UNAUTHENTICATED` (no new codes).
- Lock counter is one atomic pipeline update; an expired lock restarts the count at 1; failures while locked don't extend it. `passwordHash` leak paths (`.toObject()`, `+passwordHash`, `.lean()`, aggregate) NOT addressed: T-046 response mapper.
- Verify: server 41 passed, root 225 passed, shared 40 passed, lint clean, build ok.
- Review fix (1): added a deterministic ordering guard in `auth.service.test.js`: it spies `RefreshToken.findOneAndUpdate` and, when the claim runs, reads the family from the DB and asserts 2 rows (old + successor) exist, with the old row unclaimed. The 10× race test is kept as a smoke test. Mutation (`next.save()` moved after the claim): new test fails 3/3 ("expected length 2 but got 1"; the 10× loop passed in all 3, confirming it is flaky); reverted: 25/25 pass ×3. `service.js` unchanged.

## Review
**Re-review (reviewer-pro, after fix daad7ab): APPROVED.** The one required change is fixed. Details are under "Re-review" at the end of this section. The first-round findings below are kept for the record.

**First review: CHANGES REQUESTED** — the implementation was sound; one regression guard was too weak.

**Required change (1)**
1. `server/test/auth.service.test.js:90` (concurrent-rotation test) does not reliably guard the "insert successor BEFORE claiming" ordering. Mutation: moved `next.save()` after the claim (`service.js:131-133`) → the test failed in only **1 of 3** runs, so a regression would pass CI about two times in three. Add a deterministic test: spy `RefreshToken.findOneAndUpdate` and, inside the spy before delegating, assert `RefreshToken.countDocuments({ familyId })` already includes the successor (2 rows for a first rotation). Keep the 10× race test as a smoke check.

**Invariants attacked** (reverted mutations in `service.js`, tree verified clean; throwaway `server/test/zz_probe.test.js` created and deleted)
- Reuse → family revoked: DB-row assertions at `auth.service.test.js:67-69` (all 3 rows `revokedAt`, other family untouched `:76`). Mutations: `revokeFamily` no-op → 5 fail; revoke only replaced rows → 4 fail; family filter dropped (revokes other families) → 1 fail; reuse check on `replacedBy` removed → 1 fail. ✅
- Race: by reasoning plus a deterministic probe (A stalled before its claim, B wins, B rotates again, A released) and 25 × 3-way concurrent rotations → no live row ever survived a rejection. Save-before-claim (`service.js:131-133`) holds: any sweep that follows a failed claim sees every row inserted before that claim. Revoke-all/rotate interleave is also safe because the claim filters on `revokedAt: null`. ✅ (only the test guard is weak, see above)
- Only sha256 stored: 200 issued tokens, raw string absent from the `refreshTokens` collection dump; `randomBytes(32)` (`service.js:73`), 43 chars base64url, all distinct, no userId/timestamp input; stored hashes are 64-hex. ✅
- Argon2 cost: single definition at `service.js:14` (`grep memoryCost|timeCost` → 1 hit); `seed.js:59` calls `hashPassword`. Mutation `m=1024,t=1` → 4 tests fail (2 in auth.service, 2 in models). ✅
- Access token: payload `{sub, role, iat, exp}` (+`pc` for scoped reviewers, `service.js:45-49`); no PII. TTL honoured (`30s` → 30). Expired, nbf-in-future, wrong-secret and empty-key tokens all rejected with 401 `UNAUTHENTICATED`. ✅
- Algorithm: `algorithms: ['HS256']` (`service.js:63`). Rejected: `none`/`None`/`NONE`/`nOnE` (with and without signature), HS384/HS512 signed with the right secret, RS256 header with an HMAC keyed by a PEM string. Non-string inputs (`undefined`, `null`, `123`, `{}`) give the generic 401. ✅
- Lockout: lock at the 5th failure, ≈ 899.99 s (`service.js:200`); 50 concurrent failures → exactly one distinct `lockedUntil`. Failures while locked reach count 25 but the lock does not move. Expired lock → count restarts at 1, and re-lock needs 5 more failures. ✅

**Judgement on the builder's lockout claims**
- Not extending the lock while locked is correct: an attacker cannot hold a victim locked out indefinitely by hammering during the lock.
- Restart-at-1 after expiry means ≈ 5 guesses per 15 min per account (≈ 480/day). That is the spec's behaviour (FR-AUTH-02) and is not exploitable against 12+-character passwords. Stricter alternatives (one guess per lock) would increase lock-out DoS. Not a defect.

**Non-blocking observations (carry forward, no change needed here)**
- T-046: `clearFailedLogins` also clears an active lock, so a correct password during a lock would unlock the account. The existing T-046 note (check `isLocked` first) is **essential**, and T-046 needs a test for "correct password while locked → still 401, lock unchanged".
- `config.js`: `JWT_ACCESS_TTL` is any string. `JWT_ACCESS_TTL=900` (seconds, a common convention) is read by fast-jwt as **900 ms → a 1-second token**. This fails safe (too short), but is a footgun; validate `^\d+(s|m|h|d)$` in config (T-046 or a later config card).
- Refresh expiry slides on every rotation (`service.js:76`), so an actively used family never expires absolutely. FR-AUTH-02 says "7 days"; acceptable because theft is caught by reuse detection, but T-046 could cap family age if the PM wants a hard limit.
- `verifyPassword` has no input-length cap: T-046 must bound password length in the Zod schema (argon2 DoS).

**Verification (main tree):** `pnpm lint` clean; `pnpm test:all` → root 225 passed, shared 40 passed (2 todo), server 41 passed; `pnpm build` ok (chunk-size warning only). Working tree clean after mutations.
**Not proved:** nothing browser-related in this card; HTTP-level behaviour (cookies, 429) is T-046.

### Re-review (daad7ab)
1. **Mutation, 3 runs** (`next.save()` moved after the claim in `service.js`): `inserts the successor row BEFORE claiming the old token` failed in **3 of 3** runs. It was the only failure each time (24 passed). The test is `auth.service.test.js:90`. The old 1-in-3 race test is not the one that catches it now. Reverted, `git status` clean, 3 clean runs (25/25).
2. **Implementation untouched:** `git show daad7ab --format= -- server/src` → 0 bytes. `git diff 199b4d daad7ab --stat -- server/src packages src` → empty. The fix commit touches only the test file and the card.
3. **Smoke test kept:** the 10× race test is still at `:129`, renamed "(smoke, 10x)". **Spy is restored in `finally`** (`spy.mockRestore()`, `:111-115`), so it cannot leak if the rotation throws. Isolation runs: smoke test alone 1 passed; the rotation, revocation and throttling groups alone 12 passed.
4. **Test quality:** the guard reads the family from the DB at the moment the claim is awaited. It asserts that the filter targets the old row, that 2 rows exist, that the successor hash equals the issued token, and that neither row is claimed yet. It is deterministic and does not depend on timing.

**Verification (main tree):** `pnpm lint` clean; `pnpm test` root 225 passed; `pnpm -r test` shared 40 passed (2 todo), server 42 passed; `pnpm build` ok. Mutation reverted. The only change to source was the reverted mutation in `server/src/modules/auth/service.js`.
