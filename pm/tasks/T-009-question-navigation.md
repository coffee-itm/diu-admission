# T-009 · Visited tracking and Next/Prev across sections

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-008
Implements: FR-TEST-04, D-07

## Goal
The first question is never marked visited, section tabs don't mark visited, and Next/Prev stop at section edges. Candidates must be able to move through all 50 questions with Next/Prev.

## Context to read
- `context/17-frontend-spec.md` §5 "Navigation" row
- `src/features/test/useTestEngine.js:55-80` (`goNext`/`goPrev`), `src/pages/candidate/TestPage.jsx:75-100`, `src/store/testStore.js` (`visitQuestion`, `navigateTo`)

## Files
- `src/pages/candidate/TestPage.jsx` — effect on `currentQuestion?.id` change calls `visitQuestion(id)` (covers first load, tabs, next/prev). Section tab → `navigateTo(sid, firstUnansweredIndex ?? 0)`
- `src/features/test/useTestEngine.js` — `goNext` at the last question of a section moves to index 0 of the next section in `SECTION_ORDER` (only sections that have questions). `goPrev` at index 0 moves to the last question of the previous section. Expose `isFirstOverall`/`isLastOverall`
- `TestPage.jsx` — disable Prev only when `isFirstOverall` and Next only when `isLastOverall`
- `src/features/test/useTestEngine.test.js` — extend

## Acceptance criteria
1. [ ] After start, question 1's status is `skipped` (visited), not `not_visited`.
2. [ ] Next from the last MATH question → first LOGIC question. Prev from the first LOGIC question → last MATH question (tests).
3. [ ] Prev is disabled only on the very first question; Next only on the very last.
4. [ ] Section tab jumps to the first unanswered question of that section.

## Verify
```bash
pnpm test -- useTestEngine && pnpm lint && pnpm build
```

## Out of scope
- Keyboard shortcuts, the mobile bottom sheet (R3).

## Agent log
- useTestEngine: goNext/goPrev cross sections (SECTION_ORDER, non-empty only); added isFirstOverall/isLastOverall; visit marking moved to TestPage effect on currentQuestion.id.
- TestPage: section tab jumps to first unanswered; Prev/Next disabled via overall flags.
- Tests: 3 new in useTestEngine.test.js; full suite 119 passed; lint 0 errors (exhaustive-deps warning on new effect, same as existing pattern); build ok.

## Review

**CHANGES REQUESTED** (reviewer, commit 44ced8f)

Verified OK: cross-section goNext/goPrev skip empty sections via `sectionsWithQuestions` (useTestEngine.js:67-91); `isFirstOverall`/`isLastOverall` correct (:70-74); tab jumps to first unanswered (TestPage.jsx:90-95); `jumpTo` (grid) still calls `visitQuestion` (useTestEngine.js:93-97) and the new effect covers next/prev/tabs/first load, so no path skips visited marking. Tests 119 passed, build ok, eslint 0 errors.

Required change:
1. TestPage.jsx:72-77 new effect warns exhaustive-deps (missing `currentQuestion`, `visitQuestion`). Fix cleanly: before the effect add `const currentQuestionId = currentQuestion?.id;`, use it in the effect, and set deps to `[currentQuestionId, visitQuestion]`. Store actions are stable and visitQuestion is a no-op unless NOT_VISITED, so no loop. Do not add the warning to the baseline. (The warning at :84 is pre-existing.)

**APPROVED** (re-review by Opus): 93fdb17 uses `currentQuestionId` with deps `[currentQuestionId, visitQuestion]`; the new warning is gone. Only the pre-existing TestPage.jsx:85 warning remains (exhaustive-deps, which T-022 left for T-004 to remove). eslint 0 errors.
