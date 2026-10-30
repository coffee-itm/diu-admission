# T-034 · `@diu/shared`: risk function and question Zod schemas

Status: ✅ Ready
Sprint: S2 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-033
Implements: P1-02 (part 2), FR-AC-06, FR-QB-01

## Goal
Add the shared risk-level function, exactly as FR-AC-06 specifies it. Also move the question Zod schema into `@diu/shared/schemas`, so the questions API in S4 validates with the same rules as the form.

## Context to read
- `context/13-srs.md` FR-AC-06: `W = 2·tab + 2·fullscreenExit + 3·devtools + 1·(copy+paste+cut) + 0.5·(rightClick+blockedKey)`. Low < 4, Medium 4–9.5, High ≥ 10. `fastAnswers` when more than 30 % of answered questions took under 3 s.
- `src/features/questions/questionSchema.js` and its test (already hardened by T-029)
- `packages/shared/constants.js` (T-033)

## Files
- `packages/shared/risk.js` (create): `computeRisk(violationCounts, questionTimes = {}, answeredIds = [])` returns `{ score, level: 'low'|'medium'|'high', fastAnswers }`. Missing counts count as 0.
- `packages/shared/risk.test.js` (create): boundaries 3.5 → low, 4 → medium, 9.5 → medium, 10 → high, each weight checked on its own, and `fastAnswers` at 30 % (false) and 31 % (true).
- `packages/shared/schemas/common.js` (create): `percent` (0–100) and `objectIdString` (24 hex).
- `packages/shared/schemas/question.js` (create): the question schema moved from `src/features/questions/questionSchema.js`. It imports `SECTION_ORDER` from `../constants.js`.
- `packages/shared/schemas/question.test.js` (create, moved from `questionSchema.test.js`).
- `packages/shared/index.js` (modify): export `computeRisk` and the schemas.
- `src/features/questions/questionSchema.js` (modify): re-exports from `@diu/shared`.

## Acceptance criteria
1. [ ] Every boundary in `risk.test.js` passes and matches the FR-AC-06 numbers.
2. [ ] The moved schema tests pass in `@diu/shared`. The frontend form and CSV import tests still pass through the re-export.
3. [ ] `pnpm test`, `pnpm test:all`, `pnpm lint` and `pnpm build` pass, with no new lint warnings.

## Verify
```bash
pnpm test:all && pnpm lint && pnpm build
```

## Out of scope
- Wiring `computeRisk` into the UI (S5/S6). Auth, cycle and session schemas (added with their modules in S3–S5).

## Agent log

## Review
