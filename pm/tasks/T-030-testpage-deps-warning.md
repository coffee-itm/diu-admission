# T-030 · Fix the TestPage exhaustive-deps warning

Status: ✔️ Done
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
- TestPage: removed the `useAntiCheatStore()` subscription; the per-question effect and `onAutoSubmit` now use `useAntiCheatStore.getState()`, deps `[currentQuestionId]`. No `eslint-disable`.
- Added `src/pages/candidate/TestPage.test.jsx` (2 tests): tracking starts on load; switching q1→q2 banks 1500ms for q1 and starts q2. Written before the refactor and green on both.
- Verify (env override `pnpm_config_verify_deps_before_run=none`): lint ✅ 0 problems (`--max-warnings 0`), test ✅ 239 passed / 2 todo, build ✅.
- Environment note: plain `pnpm <script>` aborts in this tree because `node_modules/.pnpm-workspace-state-v1.json` records a `/tmp/.../t029-review-*` project root (parallel T-029 review install), so pnpm's deps check wants a purge; the env override skips that check only. `.npmrc` `verify-deps-before-run=false` is not honoured by pnpm 11.13.1 (value should be `none`) — flagging for a devops card.
- No browser needed; criterion 2 covered by the new tests.

## Review

**Verdict (reviewer, commit 8e2ef2d): APPROVED**

Checks:
- AC1 (lint 0 warnings): `pnpm lint` exit 0, no output lines; `npx eslint --max-warnings 0` on `TestPage.jsx` and `TestPage.test.jsx` exit 0. The old `exhaustive-deps` warning is gone.
- AC2 (tracking starts per question): `TestPage.jsx:79-83` effect calls `useAntiCheatStore.getState().startTrackingQuestion(currentQuestionId)` with deps `[currentQuestionId]`. Mutation test: changed line 83 to `}, []);`, ran `TestPage.test.jsx`, and the test "moves tracking to the next question and banks time for the previous one" failed (`expected 'q1' to be 'q2'`). The file was then restored byte-identical (sha256 matches the pre-mutation copy). `git diff` for `src/` is empty.
- AC3 (no eslint-disable): none in `TestPage.jsx`, `TestPage.test.jsx`, or `antiCheatStore.js`; none added in the commit diff.
- React Compiler rules: no `useMemo`/`useCallback`/`React.memo`, no ref writes in render in the changed files. `currentQuestionId` is derived at `TestPage.jsx:71` before the effect that uses it.
- Store read removal: `TestPage.jsx` no longer subscribes to `antiCheatStore` (`useAntiCheatStore()` removed). Grep confirms no render-time store values were used, so behavior is unchanged except for fewer re-renders.
- Scope: only `TestPage.jsx`, the new `TestPage.test.jsx` (2 tests), and the card. No out-of-scope edits.
- Tests: `TestPage.test.jsx` 2/2 pass on restored code. Full `pnpm test -- --run`: 30 files, 241 passed, 2 todo.
- Build: `pnpm build` succeeded (vite built; chunk-size warning only, pre-existing).

Notes (non-blocking):
- The card's Agent log says plain `pnpm` aborted and needed `pnpm_config_verify_deps_before_run=none`. In this review `pnpm lint`, `pnpm test`, and `pnpm build` all ran without the override. The `.npmrc` devops item may already be stale; the coordinator should decide whether it still needs a card.
- The mutation step ran in the main tree. One `cp` restore hit an interactive overwrite prompt and was refused; the file was restored later with a one-line edit and verified by hash. No net change to source.
