# T-009 · Visited tracking and Next/Prev across sections

Status: 👀 Review
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
