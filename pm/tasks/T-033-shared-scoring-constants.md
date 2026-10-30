# T-033 · Move scoring, domain constants and shuffle into `@diu/shared`

Status: ✅ Ready
Sprint: S2 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-032
Implements: P1-02 (part 1), ADR-019, FR-SCORE-04

## Goal
The scoring engine and the domain constants have to be one shared copy, used by both the SPA and (from S5) the server. Move them into `packages/shared` without changing behaviour. The frontend keeps working through thin re-export shims, so the ~43 import sites don't all need to change in this card.

## Context to read
- `context/16-backend-architecture.md` §1 (the shared package tree) and §7 (scoring module)
- `src/lib/scoring.js`, `src/lib/scoring.test.js`, `src/features/scoring/scoringConfig.js` (`DEFAULT_SCORING_CONFIG`)
- `src/lib/constants.js`: which exports are domain-level and which are UI-only
- `src/lib/utils.js`: `shuffleArray`

## Files
- `packages/shared/constants.js` (create): domain constants moved from `src/lib/constants.js`: `SECTION_ORDER`, `ELIGIBILITY`, `QUESTION_STATUS`, `SECURITY_EVENT_TYPES`, `DIFFICULTY` ids, and `ANTI_CHEAT` limits. UI-only items stay in `src/lib/constants.js`: `ROUTES`, `STORAGE_KEYS`, `SECTIONS` with Tailwind colours, `MOCK_*`, `APP_*`, and `PROGRAMS` (it moves to the DB in S4).
- `packages/shared/scoring.js` (create): `calculateScore` and `resolveThresholds`, moved from `src/lib/scoring.js`. `DEFAULT_SCORING_CONFIG` moves here too. No DOM or Node APIs.
- `packages/shared/shuffle.js` (create): Fisher–Yates `shuffle(arr, rng = Math.random)` with an injectable RNG.
- `packages/shared/index.js` (modify): re-export the above.
- `packages/shared/*.test.js` (create, moved): `scoring.test.js` moves here unchanged, except for its imports. Add a `shuffle.test.js` with a seeded RNG.
- `src/lib/scoring.js`, `src/features/scoring/scoringConfig.js` (modify): become re-exports from `@diu/shared`.
- `src/lib/constants.js` (modify): re-exports the moved domain constants from `@diu/shared` and keeps the UI-only ones.
- `src/lib/utils.js` (modify): `shuffleArray` delegates to the shared `shuffle`.

## Acceptance criteria
1. [ ] `pnpm --filter @diu/shared test` passes, including every moved scoring test with identical assertions.
2. [ ] The root `pnpm test` passes with the same number of tests as before, minus the moved ones.
3. [ ] `grep -rn "document\|window\|process\." packages/shared --include=*.js | grep -v test` returns nothing.
4. [ ] `pnpm build` succeeds. The SPA resolves `@diu/shared` through the workspace link.
5. [ ] No behaviour change: scoring boundary tests (49.99 / 50 / 39.99 / 40) give the same results.
6. [ ] No new lint warnings.

## Verify
```bash
pnpm --filter @diu/shared test && pnpm test && pnpm lint && pnpm build
```

## Out of scope
- `risk.js` and the Zod schemas (T-034). Rewriting all import sites to `@diu/shared` directly (later, as files are touched).

## Agent log

## Review
