# T-005 · Submit must use the latest answers and be single-shot

Status: ✔️ Done
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
1. [x] Stale-closure test passes (latest answers submitted).
2. [x] Double submit is impossible (test).
3. [x] Normal manual submit still navigates to the result page (unchanged navigate call; not separately tested).

## Verify
```bash
pnpm test -- useTestEngine && pnpm lint && pnpm build
```

## Out of scope
- Timer changes (T-008), persisting anti-cheat data (T-007).

## Agent log
- submitTest now reads useTestStore/useAntiCheatStore via getState() at call time; useRef in-flight guard (reset in finally) plus isSubmitted check.
- New useTestEngine.test.js (stale closure, double call). eslint clean, 96 tests pass, build ok.

## Review
**Verdict: APPROVED** (reviewer)
- Criteria 1-2 met: useTestEngine.js:34-40 reads useTestStore/useAntiCheatStore via getState() at call time; guard at :38-39. Tests useTestEngine.test.js:33-52 (stale fn captured before setAnswer; double call -> 1 submit). Both would fail on the old code.
- React Compiler: submittingRef is read/written only inside the async callback (never during render). Lint clean.
- Retry path: finally (useTestEngine.js:57-58) resets the flag, so a failed submit can be retried; isSubmitted only set on success.
- Criterion 3: navigate call unchanged (:54). Advisory: add `expect(navigate)`/MemoryRouter location assertion later; not blocking.
- Gate: eslint (2 files) clean, pnpm test 96 pass / 2 todo, pnpm build ok. One commit with [T-005], no out-of-scope changes.
