# T-026 · Ask for fullscreen again on resume; no false tab switch on reload

Status: ✅ Ready
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

## Review
