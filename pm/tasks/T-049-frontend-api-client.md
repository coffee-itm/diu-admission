# T-049 · `src/services/api.js`, react-query provider, and the `VITE_USE_MOCKS` split

Status: ✅ Ready
Sprint: S3 · Role: frontend-dev · Model: build · Size: M
Tier rationale: async refresh-retry logic plus a cross-cutting move of every service; a wrong mock switch silently ships mock data (PROCESS §2.3)
Depends on: T-046
Implements: P2-05 (infrastructure half), context/17 §4

## Goal
The SPA gains a real HTTP layer and a mock switch, **without changing any page yet**. Pages keep calling the same service function names; only what sits behind them changes.

## Context to read
- `context/17-frontend-spec.md` §4 (the `api()` wrapper is written out there — follow it), §3 (store table)
- `context/15-api-spec.md` §1 (error envelope) and §6 (service → endpoint map)

## Files
- `src/services/api.js` (create): the `api()` wrapper and `ApiError` from 17 §4 — base URL `import.meta.env.VITE_API_URL ?? '/api/v1'`, JSON, bearer token from memory, **one** refresh-retry on 401 (never for `/auth/refresh` itself), `credentials: 'include'` only for `/auth/*`, `X-Server-Time` clock sync, `raw` mode for CSV.
- `src/services/mock/` (create): move the current mock implementations of `authService`, `testService`, `resultService`, `analyticsService` here **unchanged**.
- `src/services/index.js` or each service file (modify): export the mock or the real implementation based on `import.meta.env.VITE_USE_MOCKS`. Default when the variable is unset: **mocks**, so the demo keeps working.
- `src/main.jsx` (modify): wrap `<App>` in `QueryClientProvider` (`@tanstack/react-query` is already a dependency and currently unused — this also closes the last part of D-27).
- `.env.example` (create at repo root): `VITE_API_URL`, `VITE_USE_MOCKS`.
- `src/services/api.test.js` (create).

## Acceptance criteria
1. [ ] A 401 triggers **exactly one** refresh attempt and then one retry; a second 401 propagates. Assert the call count — an infinite refresh loop is the failure this test exists to prevent.
2. [ ] `/auth/refresh` returning 401 does **not** recurse.
3. [ ] A non-2xx response throws `ApiError` carrying `status`, `code`, `message` and `details` parsed from the envelope; a non-JSON body still throws `ApiError` and never a `SyntaxError`.
4. [ ] 204 resolves to `null`; `raw: true` returns the `Response`.
5. [ ] With `VITE_USE_MOCKS=true` (and when unset) **no `fetch` happens** — proven by a test with `fetch` stubbed to throw.
6. [ ] All 225 existing SPA tests still pass unchanged, and `pnpm dev` still runs the app on mocks.
7. [ ] `pnpm lint` (0 warnings), `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm lint && pnpm test:all && pnpm build
```

## Out of scope
- Pointing `authService` at the real API (T-050). Converting pages to react-query (S4+). Removing `questionStore`/`examConfigStore` (S4).

## Agent log

## Review
