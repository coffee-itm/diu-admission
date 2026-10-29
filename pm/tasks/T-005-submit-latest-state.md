# T-005 · Submit must use the latest answers and be single-shot

Status: ✅ Ready
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: S
Depends on: T-004
Implements: FR-AC-03, FR-TEST-08, D-03

## Goal
`useTestEngine.submitTest` reads `store.answers` from the render that created the function. When auto-submit (or the timer) calls an older copy, the submission can miss recent answers. Read fresh state at call time and prevent double submits.

## Context to read
- `src/features/test/useTestEngine.js` (whole, ~90 lines)
- `src/pages/candidate/TestPage.jsx:55-75` (how `submitTest` is passed to anti-cheat and the timer)

## Files
- `src/features/test/useTestEngine.js` — modify
- `src/features/test/useTestEngine.test.js` — create

## Steps
1. In `submitTest`, read `const s = useTestStore.getState()` and `useAntiCheatStore.getState()` at the start, and use `s.answers`, `s.questions`, `s.examConfig`, `s.timeRemaining`, `s.isSubmitted`.
2. Guard re-entry: a module-level or ref flag `submittingRef` set while the request is in flight; return early if set or `s.isSubmitted`.
3. Test with `renderHook` inside a `MemoryRouter` wrapper; mock `testService.submitTest` with `vi.spyOn` (resolve with a fake result):
   - capture `submitTest` from the first render, then `useTestStore.getState().setAnswer('q1','a')`, then call the captured function → the mock receives `answers` containing `q1: 'a'`.
   - two calls in a row → `testService.submitTest` called once.

## Acceptance criteria
1. [ ] Stale-closure test passes (latest answers submitted).
2. [ ] Double submit is impossible (test).
3. [ ] Normal manual submit still navigates to the result page.

## Verify
```bash
pnpm test -- useTestEngine && pnpm lint && pnpm build
```

## Out of scope
- Timer changes (T-008), persisting anti-cheat data (T-007).

## Agent log

## Review
