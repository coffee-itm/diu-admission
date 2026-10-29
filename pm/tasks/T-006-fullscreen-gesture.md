# T-006 · Request fullscreen from the Start click; add "Return to fullscreen"; handle iOS

Status: ✅ Ready
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

## Review
