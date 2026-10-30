# T-030 · Fix the TestPage exhaustive-deps warning

Status: ✅ Ready
Sprint: S2 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-026 (lane A order)
Implements: S1 carry-over (T-009/T-022 leftover lint warning)

## Goal
Remove the last known lint warning: `react-hooks/exhaustive-deps` at `src/pages/candidate/TestPage.jsx:85`. That effect calls `antiCheatStore.startTrackingQuestion(currentQuestion.id)` with deps `[currentQuestion?.id]`.

## Context to read
- `src/pages/candidate/TestPage.jsx` lines 63–85. `currentQuestionId` is already defined at line 73.
- `src/store/antiCheatStore.js`: `startTrackingQuestion`

## Files
- `src/pages/candidate/TestPage.jsx` (modify):
  - In the effect, call `useAntiCheatStore.getState().startTrackingQuestion(currentQuestionId)` with deps `[currentQuestionId]`.
  - Keep the `antiCheatStore` variable only if it's still used elsewhere (`finalizeTracking` in `onAutoSubmit` can also use `getState()`).

## Acceptance criteria
1. [ ] `pnpm lint` reports **0 warnings** and 0 errors.
2. [ ] Time-per-question tracking still starts on each question change. Existing tests pass. If no test covers it, add one in `useAntiCheat.test.js` or a TestPage test.
3. [ ] No `eslint-disable` comment is added.

## Verify
```bash
pnpm lint && pnpm test && pnpm build
```

## Out of scope
- Any other TestPage refactor.

## Agent log

## Review
