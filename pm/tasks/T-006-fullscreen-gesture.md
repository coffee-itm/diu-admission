# T-006 · Request fullscreen from the Start click; add "Return to fullscreen"; handle iOS

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-004
Implements: FR-AC-04, D-04

## Goal
Browsers only allow `requestFullscreen()` during a user gesture. Today it's called from a `useEffect` in `TestPage` (`:69-72`), so it often fails silently. iOS Safari has no Fullscreen API at all.

## Context to read
- `context/13-srs.md` FR-AC-04
- `src/pages/candidate/TestPage.jsx:55-75`, `src/pages/candidate/InstructionsPage.jsx:90-100` (Start button), `src/features/test/useAntiCheat.js` (`requestFullscreen`, fullscreen handler), `src/features/test/SecurityWarningModal.jsx`

## Files
- `src/lib/fullscreen.js` — create: `isFullscreenSupported()`, `enterFullscreen()` (std + `webkit` prefix, returns a promise, never throws)
- `src/lib/fullscreen.test.js` — create
- `src/pages/candidate/InstructionsPage.jsx` — Start handler calls `enterFullscreen()` **synchronously first**, then `startTest()`
- `src/pages/candidate/TestPage.jsx` — remove the mount effect (and its eslint-disable line)
- `src/features/test/useAntiCheat.js` — use the helpers; when unsupported, log `fullscreen_unsupported` once and skip fullscreen-exit counting
- `src/features/test/SecurityWarningModal.jsx` — optional `onReturnToFullscreen` prop → button `id="security-return-fullscreen"`, shown when fullscreen is supported and not active
- `src/lib/constants.js` — add `FULLSCREEN_UNSUPPORTED: 'fullscreen_unsupported'`

## Acceptance criteria
1. [ ] No fullscreen request from effects anywhere (`grep -n requestFullscreen src` shows only the helper and click handlers).
2. [ ] Unit tests for the helpers (supported, webkit-only, unsupported → resolves without throwing).
3. [ ] In Chrome: Start → the test opens in fullscreen. Exit → the warning modal offers "Return to fullscreen", which works.
4. [ ] With the API absent (test): one `fullscreen_unsupported` event and no exit counting.

## Verify
```bash
pnpm test -- fullscreen && pnpm lint && pnpm build
```

## Out of scope
- Changing thresholds; mobile layout.

## Agent log
- Added `src/lib/fullscreen.js` (+tests): isFullscreenSupported/isFullscreenActive/enterFullscreen (std + webkit, never throws).
- InstructionsPage `handleStart` calls enterFullscreen() synchronously, then startTest(). Removed TestPage mount effect.
- useAntiCheat: logs `fullscreen_unsupported` once and skips exit counting when unsupported; listens to webkitfullscreenchange; `requestFullscreen` replaced by `returnToFullscreen` (click-only); dismiss no longer re-requests fullscreen.
- SecurityWarningModal: `onReturnToFullscreen` -> `#security-return-fullscreen` (supported and not active). Constant added.
- useAntiCheat.test.js: stub requestFullscreen in setup + new unsupported test. Chrome manual check (AC3) not run.

## Review
**APPROVED** (reviewer)
- AC1: only helper (`src/lib/fullscreen.js:19-24`) and click handlers call requestFullscreen; no effect calls remain. Old name `requestFullscreen` (hook API) has no callers left.
- Gesture: `InstructionsPage.jsx` handleStart calls `enterFullscreen()` sync, no await before it. `returnToFullscreen` (useAntiCheat.js) calls `enterFullscreen()` before any await.
- AC2/AC4: fullscreen.test.js covers std, webkit, unsupported, reject/throw; useAntiCheat.test.js covers unsupported (1 event, 0 exits).
- Compiler: no ref access in render. `isFullscreenActive()` reads document in the modal render (not a ref), acceptable.
- webkitfullscreenchange added and removed in cleanup. Existing T-004 tests only gained a requestFullscreen stub in setup/teardown, so counters and the single auto-submit on the 3rd exit are intact.
- Dismiss no longer re-requests fullscreen: matches FR-AC-04 (gesture-only request, return button). Exits are still counted.
- Gate: eslint 0 errors (1 pre-existing exhaustive-deps warning, TestPage.jsx:73), pnpm test 105 pass, build OK.
- Note: AC3 (manual Chrome check) not run; not blocking.
