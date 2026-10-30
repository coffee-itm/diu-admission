# T-026 · Ask for fullscreen again on resume; no false tab switch on reload

Status: ✔️ Done
Sprint: S2 · Role: frontend-dev · Model: sonnet · Size: S
Depends on: T-024 (lane A order)
Implements: FR-AC-04 (fullscreen enforcement). S1 carry-over (T-021: false tab switch on reload). S1 post-merge E2E finding (Medium).

## Goal
1. After a page reload the exam resumes outside fullscreen, and nothing asks the candidate to go back. When the test page mounts while fullscreen is supported but not active, show the security modal with the "Return to fullscreen" button. This must **not** count as a fullscreen exit.
2. Reloading the page logs one `tab_switch`, because `visibilitychange` fires as the page unloads. Ignore `visibilitychange` once `pagehide`/`beforeunload` has fired.

## Context to read
- `src/features/test/useAntiCheat.js`: `handleVisibility`, `handleFullscreenChange`, `isFullscreen` state, `returnToFullscreen`
- `src/features/test/SecurityWarningModal.jsx`: the `isFullscreen` prop (T-023)
- `src/features/test/useAntiCheat.test.js`: existing patterns for mocking the fullscreen helpers
- `context/04-test-engine-anticheat.md`: the fullscreen and tab-switch rows

## Files
- `src/features/test/useAntiCheat.js` (modify)
  - On mount, when `isFullscreenSupported() && !isFullscreenActive()`, set `showWarning` with a message such as "Your exam continues in fullscreen. Click Return to fullscreen." Do not call `incrementFullscreenExit` and do not log a violation.
  - Add an `unloadingRef`, set by the `pagehide` and `beforeunload` listeners. `handleVisibility` returns early while it is set. Remove the listeners in cleanup.
- `src/features/test/useAntiCheat.test.js` (modify): tests for both behaviours.

## Acceptance criteria
1. [ ] Mounting the hook with fullscreen supported but not active gives `showWarning === true`, while `fullscreenExitCount` stays 0. Covered by a test.
2. [ ] Mounting while fullscreen is active, or when it's unsupported, shows no warning. Covered by a test.
3. [ ] Dispatching `pagehide`, then `visibilitychange` with `document.hidden = true`, leaves `tabSwitchCount` unchanged. A normal hide still counts. Covered by a test.
4. [ ] The Return button still calls `enterFullscreen` from the click (user gesture).
5. [ ] ⚠️ Browser check for T-040: reload during the test shows the prompt and logs no tab switch.
6. [ ] No new lint warnings.

## Verify
```bash
pnpm test -- useAntiCheat SecurityWarningModal && pnpm lint && pnpm build
```

## Out of scope
- The `TestPage.jsx:85` deps warning (T-030). Server-side events (S5).

## Agent log
- useAntiCheat: lazy initial state shows the "Return to fullscreen" prompt when fullscreen is supported but inactive at mount (no exit count, no event). `unloadingRef` set by pagehide/beforeunload; handleVisibility returns early; listeners removed in cleanup.
- Tests: 3 new; existing tests now mock fullscreen as active at mount (exit helper flips it off).
- Return button already calls enterFullscreen from click (unchanged, criterion 4).
- Criterion 5: ⚠️ not verified (no browser), for T-040.
- pnpm test 213 passed, lint only baseline TestPage:85 warning, build ok.

- Review fix: dropped beforeunload as flag source; pageshow clears unloadingRef; added pageshow, cancelled-beforeunload and spy cleanup tests.

## Review

**Verdict (reviewer, commit 779226f): CHANGES REQUESTED**

Checks passed:
- Criteria 1, 2, 3 covered by tests: `useAntiCheat.test.js` mount prompt, no-prompt (active/unsupported), pagehide-then-hide tests. Mount init (`useAntiCheat.js:9-15`) is a pure read, no exit count, no event. Mutation checks: flipping the mount prompt to count an exit, dropping the support check, and dropping the `unloadingRef` guard each make a test fail.
- Criterion 4: `returnToFullscreen` (`useAntiCheat.js:~183`) calls `enterFullscreen()` before any await, from the click.
- Existing test adjustments do not weaken assertions. The `fsActive` mock and `exitFullscreen` flip only change setup; the exit handler still gates on `isFullscreenActive()`, so the flip makes the exit count real. No assertion removed.
- Lint on the two changed files: clean. Full `eslint .` at the commit: only the baseline `TestPage.jsx:85` warning. `vite build` ok. `vitest run` at the commit: 213 passed (run in a clean `git archive` copy, so T-027 WIP is excluded).
- React Compiler: `unloadingRef` is written only in listeners, never in render. Listener registration and removal are symmetric (`useAntiCheat.js:149-150` and `:162-163`).

**Re-review at 6b0951c: APPROVED**

- Item 1 (sticky flag): `pageshow` now clears `unloadingRef` (`useAntiCheat.js:39-41`, `pageshow` registered at `:154`, removed in cleanup at `:167`). `beforeunload` no longer sets the flag, so a cancelled `beforeunload` cannot disable detection. Choice recorded in the Agent log.
- Item 2 (tests): `useAntiCheat.test.js` new tests "counts tab switches again after pagehide then pageshow" and "a cancelled beforeunload does not disable tab-switch detection" pass.
- Item 3 (cleanup coverage): "adds page-lifecycle listeners on mount and removes them on unmount" spies on `addEventListener` and `removeEventListener` and checks each `pagehide`/`pageshow` add is matched by a remove of the same function.
- Mutations run in a clean `git archive 6b0951c` copy: drop the pageshow clear, so `unloadingRef` is never cleared → "counts tab switches again" fails. Drop the pageshow removal in cleanup → the spy test fails. Drop the pageshow registration → both fail. Drop the pagehide guard → the original pagehide test fails. Source restored and verified byte-identical after each run.
- Verification at 6b0951c (clean archive, T-027/T-029 WIP excluded): `vitest run` 237 passed, 2 todo (29 files). `useAntiCheat` + `SecurityWarningModal`: 14 passed. `eslint .`: only the baseline `TestPage.jsx:85` warning. `eslint` on the two changed files: clean. `vite build`: exit 0.
- Criterion 5 (browser reload check) remains deferred to T-040, per the card.
- Card `Status:` header set to `✔️ Done` per the coordinator's authorization. Board row set to `✔️ Done`.

Required changes:
1. **Sticky unload flag disables tab-switch detection (regression).** `useAntiCheat.js:36-40` sets `unloadingRef.current = true` on `pagehide`/`beforeunload` and nothing ever clears it. Two reproducible cases (probe run in a scratch copy, both leave `tabSwitchCount` at 0 after real hides):
   a. `pagehide` followed by `pageshow` (bfcache restore after navigating away and pressing Back), then one hide. Count stays 0 for the rest of the session.
   b. `beforeunload` fired but cancelled by another handler (no unload happens), then 3 hides. Count stays 0.
   Fix: register a `pageshow` listener that sets `unloadingRef.current = false`, add it in the effect and remove it in cleanup. For `beforeunload`, either drop it as a flag source (per the HTML unload order, `pagehide` runs before the `visibilitychange` it guards against, so `pagehide` alone covers it), or make sure a cancelled `beforeunload` cannot leave the flag set. Record the choice in the Agent log.
2. **Add tests for the fix.** In `useAntiCheat.test.js`: (a) `pagehide` then `pageshow` then a hide counts 1; (b) the `beforeunload` path (if kept) plus later hides count as required by item 1.
3. **Cover listener cleanup.** Mutations that remove the `beforeunload` removal in cleanup, or the `beforeunload` listener entirely, leave all 9 tests passing. Add a test that spies on `window.removeEventListener` (or `addEventListener`) and asserts `pagehide`, `pageshow` (if added) and `beforeunload` (if kept) are added and removed on unmount.
4. Re-run `pnpm test -- useAntiCheat SecurityWarningModal`, `pnpm lint` (only the baseline `TestPage.jsx:85` warning allowed) and `pnpm build`, then append the results to the Agent log.

Non-blocking notes:
- The mount prompt also appears on a normal start if the `enterFullscreen()` request in `InstructionsPage.jsx:23` has not landed before `TestPage` mounts (`startTest` is awaited). Harmless: no count, and the copy fits. No change needed.
- Criterion 5 (browser reload check) is deferred to T-040 as the card says. Not a blocker.
- In this tree `pnpm test -- <filter>` ran all 29 files (the filter after `--` is not applied), so the card's verify command runs the full suite. Not a defect.
- Card `Status:` header line and the board row were not both changed. Per the reviewer scope, only the Review section and the board row were edited. The `Status:` line is still `👀 Review`, so it needs flipping to `🔨 In Progress` by the parent.
