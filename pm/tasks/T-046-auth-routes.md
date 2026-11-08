# T-046 · Auth routes: register, login, refresh, logout, me

Status: ✅ Ready
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
- `server/src/modules/auth/schemas.js` (create): Zod request/response schemas. Registration validation must match **FR-AUTH-01 exactly** — name 3–100, lowercased unique email, BD phone `^(\+?880)?1[3-9]\d{8}$` normalised to `+8801XXXXXXXXX`, `programCode` an active program, GPAs 0–5, `hscGroup` enum, password ≥ 8 with a letter and a digit.
- `server/src/app.js` (modify): register the auth module; add `@fastify/cookie`; per-route rate limit on login.
- `server/package.json` (modify): `@fastify/cookie`, `jsonwebtoken` (or `@fastify/jwt` — pick one and say why in the log).
- `server/test/auth.routes.test.js` (create).

## Acceptance criteria
1. [ ] `POST /auth/register` → 201 `{ user, accessToken }` and sets `diu_rt`. The response body contains **no** `passwordHash`.
1b. [ ] **Do not rely on `toJSON` alone.** The T-044 review proved the hash still escapes through `.toObject()`, `.select('+passwordHash')`, `.select('+passwordHash').lean()` and `User.aggregate()`. Add an explicit response mapper (e.g. `toPublicUser(user)`) used by **every** route in this module, and a test that serialises a doc fetched with `+passwordHash` through it and asserts the hash is gone.
2. [ ] A `role` field in the register body is **ignored** — the created user is always `candidate` (FR-AUTH-10). Test it explicitly.
3. [ ] Invalid registration → 422 `VALIDATION_ERROR` with per-field `details[]`; duplicate email → 409.
4. [ ] `POST /auth/login` with a wrong password and with an unknown email return the **same** 401 code and message (no user enumeration), proven by comparing both responses in a test.
5. [ ] The `diu_rt` cookie is `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, and `Secure` when `COOKIE_SECURE=true`.
6. [ ] `POST /auth/refresh` rotates the cookie and returns a new access token; replaying the previous cookie → 401 **and** the family is revoked (end-to-end over HTTP, not just the service).
7. [ ] 5 failed logins for one email within 15 min → 429.
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

## Review
