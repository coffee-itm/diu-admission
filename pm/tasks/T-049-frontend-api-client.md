# T-049 · `src/services/api.js`, react-query provider, and the `VITE_USE_MOCKS` split

Status: 👀 Review
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
1. [x] A 401 triggers **exactly one** refresh attempt and then one retry; a second 401 propagates. Assert the call count — an infinite refresh loop is the failure this test exists to prevent.
2. [x] `/auth/refresh` returning 401 does **not** recurse.
3. [x] A non-2xx response throws `ApiError` carrying `status`, `code`, `message` and `details` parsed from the envelope; a non-JSON body still throws `ApiError` and never a `SyntaxError`.
4. [x] 204 resolves to `null`; `raw: true` returns the `Response`.
5. [x] With `VITE_USE_MOCKS=true` (and when unset) **no `fetch` happens** — proven by a test with `fetch` stubbed to throw.
6. [x] All 225 existing SPA tests still pass unchanged, and `pnpm dev` still runs the app on mocks.
7. [x] `pnpm lint` (0 warnings), `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm lint && pnpm test:all && pnpm build
```

## Out of scope
- Pointing `authService` at the real API (T-050). Converting pages to react-query (S4+). Removing `questionStore`/`examConfigStore` (S4).

## Agent log
- `src/services/api.js`: `api()`/`ApiError` exactly per 17 §4, plus `setAccessToken`/`clearAccessToken`/`getAccessToken` (in-memory bearer, for T-050 to call) and `getClockOffsetMs` (X-Server-Time sync, for the test timer later). `credentials: 'include'` only for paths starting `/auth/`.
- **Found and fixed a real infinite-recursion bug while writing the AC1 test**: the first draft retried on 401 whenever `tryRefresh()` resolved truthy, with no bound on retry depth — if the retried request 401s again right after a "successful" refresh, it refreshes and retries forever (reproduced as a Node OOM crash, not just a slow test). Fixed with an internal `_retried` flag so at most one retry ever happens, matching AC1's literal wording.
- `tryRefresh()` shares one in-flight promise across concurrent 401s so a burst of requests triggers a single refresh call, not one per request.
- Moved the 4 mock services to `src/services/mock/*` unchanged (git mv, then fixed relative import depth only: `../lib` → `../../lib` etc.; same-directory cross-imports like `./authService.js` were untouched). Their existing tests moved with them and pass unchanged.
- Added `src/services/real/*` — thin implementations routed through `api.js`, matching the mock's exact function names/arity for every function pages actually call today (`getResultForCandidate`, `getSummary`, `getAll`/`getForCandidate`/`getMeritList`). `loadTest`/`submitTest` are written to the real `/sessions` contract (15 §4) but not yet called by any page (TestPage rebuild is S4+); `authService.{login,register,refresh,logout,me}` call the T-046 routes and already set/clear the in-memory token, though nothing yet triggers login through this path (T-050's job, per Out of scope). `getAllCandidates` has no real-mode equivalent (candidate data comes pre-joined from `/admin/*`) and throws clearly instead of silently returning nothing.
- Each front door (`src/services/{auth,test,result,analytics}Service.js`) picks mock vs. real with `import.meta.env.VITE_USE_MOCKS !== 'false'` — unset (test env, and `.env.example` default) → mocks, so every existing call site and test is untouched.
- `src/main.jsx`: wrapped `<App>` in `QueryClientProvider` with a plain in-memory `QueryClient`. Nothing reads through it yet (pages move to queries in S4+), so there's no cache-invalidation-on-logout gap to close yet; noted in a comment rather than inventing a `resetAll()` that doesn't exist.
- `.env.example` created at repo root with `VITE_API_URL`, `VITE_USE_MOCKS`.
- Tests added: `src/services/api.test.js` (10, covers AC1-4 by assertion on fetch call count/args) and `src/services/mockSwitch.test.js` (5, covers AC5 — `fetch` stubbed to throw, proves every front door resolves without calling it).
- Verify: SPA `240/240` passed (225 original, unchanged, + 15 new). Server `231/231` unaffected (nothing server-side touched). `pnpm lint` 0 warnings. `pnpm build` ok. `pnpm dev` boots and serves 200 (smoke-checked with curl).

## Review
