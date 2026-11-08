# T-034 · `@diu/shared`: risk function and question Zod schemas

Status: ✔️ Done
Sprint: S2 · Role: frontend-dev · Model: lite · Size: S
Tier rationale: additive files in a package that already exists; schema shape is given (PROCESS §2.3)
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
- Fixed `tabSwitch` scoring and millisecond fast-answer detection; documented time units.
- Added regressions for persisted field names and >30% fast answers; added common schema tests.
- Deleted duplicate frontend question schema test; all assertions are covered by `packages/shared/schemas/question.test.js`.
- `pnpm lint`: passed. `pnpm test`: 29 files, 225 passed.
- `pnpm test:all`: shared 5 files, 40 passed / 2 todo; server has no tests.
- `pnpm build`: passed; existing large-chunk warning.

## Review

**Reviewer verdict (2026-11-08): CHANGES REQUESTED** · commit 4c30fb1

Verified: `pnpm test` 232 passed; `pnpm test:all` shared 38 passed / 2 todo; `pnpm lint` exit 0, no output; `pnpm build` ok (existing chunk-size warning only). Zod 4 `error:` style preserved in `packages/shared/schemas/question.js:6-9,20` (no `required_error`); enum sources (`SECTION_ORDER`, DIFFICULTY values) are identical to the old `src/lib/constants.js` derivation, so SPA validation is unchanged. FR-AC-06 weights, Low<4 / Medium 4–9.5 / High≥10 and the >30 % fast-answer rule match `context/13-srs.md:113` (`risk.js:4-9`). Fast-answer rule is right but its units are wrong (see 2).

Required changes:
1. **Violation key mismatch (silent under-count).** `packages/shared/risk.js:4` reads `count('tab')`, but the persisted and API field is `tabSwitch` (`context/14-database-schema.md:227`, `context/15-api-spec.md:90`). Passing a stored `violationCounts` gives `tab` = 0. Repro: `computeRisk({tabSwitch: 2})` → score 0, `low` (should be 4, `medium`). Fix: read `tabSwitch` (or both keys, but `tabSwitch` must work). Add a `risk.test.js` case using the stored key names.
2. **Fast-answer unit mismatch.** `packages/shared/risk.js:10` compares `questionTimes[id] < 3`, i.e. seconds, but session storage is `questionTimeMs` (`context/14-database-schema.md:219`) and the API returns `ms` (`context/15-api-spec.md:175`). Repro: 40 answers at 2500 ms → `fastAnswers: false` (they are under 3 s). Fix: store and compare in ms (`< 3000`), document the unit in a JSDoc on `computeRisk`, and update the `risk.test.js` fixtures (currently 2 / 3 values) and the 30 %/31 % cases to match.
3. (Nit, non-blocking) The card says the question test was "moved", but `src/features/questions/questionSchema.test.js` still exists as a duplicate of `packages/shared/schemas/question.test.js`. Delete the src copy, or log why it is kept.
4. (Nit, non-blocking) `packages/shared/schemas/common.js` (`percent`, `objectIdString`) has no test. Add a small `common.test.js` so shared coverage stays ≥ 95 % lines (`context/18-testing-strategy.md:25`).

No manual `useMemo`/`useCallback`/`memo` in the diff. Re-review after items 1–2 are fixed.

**Re-review verdict (2026-11-08): APPROVED** · fix commit 303233f (base 4c30fb1)

Required changes 1–4 from the previous round: all fixed.
1. ✅ `tabSwitch` read: `packages/shared/risk.js:5`. Regression: `risk.test.js:6-11` (boundaries) and `risk.test.js:17-18` (weight `tabSwitch`=2). Mutation `count('tabSwitch')`→`count('tab')` in a scratch copy: 5 of 13 tests fail.
2. ✅ Unit fixed: `risk.js:3` JSDoc (ms), `risk.js:10` `< 3000`. Regression: `risk.test.js:23-29` uses 2500 ms / 3000 ms fixtures (30 % false, 31 % true). Mutations: `< 3` → 1 failure (the fast-answer test); `<= 3000` → 1 failure; `>= 0.3` → 1 failure. Each reverted form is caught.
3. ✅ `src/features/questions/questionSchema.test.js` deleted in 303233f. Case-by-case comparison with `packages/shared/schemas/question.test.js`: `diff` shows only the import path (`./questionSchema.js` → `./question.js`). All 7 `it` cases have identical assertions and inputs, so no coverage lost.
4. ✅ `packages/shared/schemas/common.test.js:4-16` covers `percent` (0, 100 ok; -1, 101 rejected) and `objectIdString` (24 hex ok, 16 chars and non-hex rejected).

Seam (`src/features/questions/questionSchema.js:1` re-export): consumers `QuestionForm.jsx:4` and `importQuestions.js:1`. `importQuestions.test.js:68-76` runs `questionSchema` through `mapRows` and asserts "Section is required" and "must be one of MATH, LOGIC", so the re-exported schema is exercised with real messages. `QuestionForm.test.jsx` only imports the module and asserts ids, so `defaultQuestionValues` has no value assertion in the SPA. Non-blocking: the re-export is a static binding, and a missing name would fail at module link time.

Checks:
- Scope: 303233f touches only `risk.js`, `risk.test.js`, `schemas/common.test.js`, the card, and the deleted test. No `useMemo`/`useCallback`/`memo` in either commit (grep exit 1).
- Semantics: field names match `context/14-database-schema.md:227` (`tabSwitch`) and `:219` (`questionTimeMs`, ms); weights and thresholds match `context/13-srs.md:113`.
- `pnpm test` → 29 files, 225 passed. `pnpm test:all` → shared 5 files, 40 passed / 2 todo; server no tests. `pnpm lint` → exit 0, no output. `pnpm build` → exit 0 (existing chunk-size warning only).
- Not run: no browser needed for this card.
- Board: the T-034 row in `pm/BOARD.md` is now ✔️ Done. The Summary table counts in `pm/BOARD.md` are not recounted here (outside the reviewer's row); the coordinator should run `/sprint-status`.
