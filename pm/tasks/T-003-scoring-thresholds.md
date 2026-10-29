# T-003 · Make scoring thresholds configurable and compare unrounded values

Status: ✅ Ready
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-022
Implements: FR-SCORE-03, FR-SCORE-04, D-09

## Goal
`src/lib/scoring.js` hard-codes the conditional tier (`40`, `<= 2`) and classifies on the **rounded** overall percentage. Read every threshold from config with defaults, compare unrounded values, and pin the behavior with the boundary-table tests.

## Context to read
- `context/13-srs.md` FR-SCORE-03, FR-SCORE-04
- `context/18-testing-strategy.md` §3.1 (boundary table S1–S14)
- `src/lib/scoring.js` (whole file, ~90 lines), `src/features/scoring/scoringConfig.js`

## Files
- `src/lib/scoring.js` — modify
- `src/lib/scoring.test.js` — create

## Steps
1. Write the tests first from the boundary table: S1–S9, S11, S13, S14. Build questions with a tiny helper (`makeQuestions({ MATH: 10, … })`) and answers with a helper that answers the first `k` questions of a section correctly. S10 (program override) and S12 (negative marking) → `it.todo` with a note "R2".
2. Thresholds: `const t = { ...DEFAULT_SCORING_CONFIG, ...examConfig.passingThresholds }`. Use `t.overallMinPercent`, `t.sectionMinPercent`, `t.conditionalOverallMin`, `t.conditionalMaxFailedSections` (these are the field names in `scoringConfig.js`; keep them).
3. Classify with the **unrounded** `percentage`. Only the returned `percentage` / `sectionPercentages` are rounded to 1 decimal (as now).
4. Section failure already uses the unrounded `pct`; keep that.
5. Ignore answers whose value isn't one of the question's option ids, and answers for question ids not in `questions` (S13/S14). Only `answeredCount` should count valid answers.
6. Keep the output shape exactly (other code depends on it). Keep `getGrade` as it is.

## Acceptance criteria
1. [ ] No literal `40` or `2` thresholds remain in the classification logic.
2. [ ] S11: `overallMinPercent: 66.7`, 2 of 3 correct → `CONDITIONALLY_ELIGIBLE` (not ELIGIBLE).
3. [ ] All listed boundary cases pass. S10/S12 are `it.todo`.
4. [ ] `ResultPage` and the admin pages still render (manual check with the demo login).

## Verify
```bash
pnpm test -- scoring && pnpm lint && pnpm build
```

## Out of scope
- Negative marking, program overrides, section weights (R2, shared package).

## Agent log

## Review
