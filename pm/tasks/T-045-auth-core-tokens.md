# T-045 · Auth core: argon2id, access JWT, rotating refresh tokens with reuse detection

Status: 👀 Review
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

## Review
