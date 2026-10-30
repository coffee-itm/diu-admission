# T-001 · Add the Vitest + Testing Library test harness

Status: ✔️ Done
Sprint: S1 · Role: test-engineer · Model: free-ok · Size: S
Depends on: none
Implements: P0-01, D-27 (tests part), ADR-018

## Goal
The repo has no tests. Add a working frontend test runner so every later card can add tests.

## Context to read
- `context/18-testing-strategy.md` §1 (tooling) — frontend row only
- `vite.config.js`, `package.json`, `eslint.config.js`

## Files
- `package.json` — devDependencies + scripts (modify)
- `vite.config.js` — `test` block (modify)
- `src/test/setup.js` — create
- `src/lib/utils.test.js` — create (sample test)

## Steps
1. `pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`
2. In `vite.config.js` add `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'], restoreMocks: true }` (keep the existing plugins as they are).
3. `src/test/setup.js`: `import '@testing-library/jest-dom/vitest';` and `afterEach(() => { localStorage.clear(); })` (import `afterEach` from `vitest`).
4. Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
5. Sample test for `shuffleArray` in `src/lib/utils.js`: the result has the same elements (sorted equal), the same length, and the input array is not mutated.
6. If ESLint complains about test files, add a files override for `**/*.test.{js,jsx}` with `globals.node`. Don't disable rules.

## Acceptance criteria
1. [x] `pnpm test` runs and passes (≥ 3 assertions in `utils.test.js`).
2. [x] `pnpm build` still passes; `pnpm lint` shows no problems in files changed by this card (baseline errors are handled by T-022).
3. [x] No test files end up in the production bundle (build output unchanged in size order of magnitude).

## Verify
```bash
pnpm test && pnpm lint && pnpm build
```

## Out of scope
- Backend tests, Playwright, CI (later sprints).

## Agent log
- Added vitest 5.0.5, testing-library (react, user-event, jest-dom), jsdom; `test` block in vite.config.js; scripts test/test:watch.
- Created src/test/setup.js and src/lib/utils.test.js (3 tests, all pass).
- `pnpm lint` fails on baseline (35 problems, 31 errors) identical before/after my change; none in my files. No ESLint override needed. Needs a lint-cleanup card.
- Build OK; test files not imported, so not bundled.

## Review

APPROVED. pnpm test 3/3 pass; eslint clean on vite.config.js, setup.js, utils.test.js; build OK, no test files in dist. Nit: package.json pnpm.onlyBuiltDependencies reformatted (harmless).
