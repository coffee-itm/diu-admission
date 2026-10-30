# T-023 · Pre-merge fixes: "Return to fullscreen" button and config-driven duration rule

Status: 👀 Review
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: S
Depends on: T-021
Implements: FR-AC-04 (return to fullscreen), FR-CFG (config-driven copy). Found by the pre-merge browser smoke test (2026-10-29).

## Goal
Two defects found in a real browser after the S1 QA:
1. The security warning modal never shows the "Return to fullscreen" button, even when fullscreen is off.
2. The Instructions rule text still says "Total duration is 54 minutes" after the admin changes the time to 60.

## Context to read
- `src/features/test/SecurityWarningModal.jsx`, around line 19: `{onReturnToFullscreen && isFullscreenSupported() && !isFullscreenActive() && …}`
- `src/lib/fullscreen.js`, `src/features/test/useAntiCheat.js` (fullscreen state and `returnToFullscreen`), `src/pages/candidate/TestPage.jsx` (where the modal is rendered)
- `src/data/mockExamConfig.js:22` (the hard-coded rule), `src/pages/candidate/InstructionsPage.jsx`, `src/store/examConfigStore.js` (persist + merge from T-011)

## Files
- `src/features/test/SecurityWarningModal.jsx`: receive fullscreen state as a prop (`isFullscreen`) instead of calling `isFullscreenActive()` during render.
- `src/features/test/useAntiCheat.js` and/or `src/pages/candidate/TestPage.jsx`: keep `isFullscreen` in React state, updated by the `fullscreenchange`/`webkitfullscreenchange` listeners, and pass it to the modal.
- `src/data/mockExamConfig.js`: remove the duration from the static rule text.
- `src/pages/candidate/InstructionsPage.jsx`: render a duration rule computed from `config.totalTimeMinutes` (and the question total). Persisted configs that still contain the old rule must not show a stale duration. At render time, filter out any rule matching `/^Total duration is \d+ minutes/i`, or migrate it in the store's `merge`.
- Tests:
  - `SecurityWarningModal.test.jsx`: the button is shown when `isFullscreen=false` and fullscreen is supported, and hidden when `isFullscreen=true`.
  - An InstructionsPage or helper test: time 60 gives a rule that says 60, and a persisted stale rule is not shown.

## Acceptance criteria
1. [x] With fullscreen supported and not active, the modal shows `#security-return-fullscreen`. It is hidden while fullscreen is active. Covered by a test.
2. [x] With the config time set to 60, the Instructions page shows no "54 minutes" text anywhere, including for a persisted config that contains the old rule. Covered by a test.
3. [x] `grep -rni "duration is 54" src` returns nothing outside test fixtures.
4. [x] No new lint warnings. React Compiler rules hold: no non-reactive browser-API reads during render.
5. [x] Browser check: `⚠️ not verified (no browser)` is acceptable. Opus re-runs the browser smoke test.

## Verify
```bash
pnpm lint && pnpm test && pnpm build
```

## Out of scope
- The other carry-over items in `pm/sprints/S1.md`.

## Agent log
- Fullscreen: `useAntiCheat` now holds `isFullscreen` state (init + updated in the fullscreenchange handler), returned and passed by TestPage to `SecurityWarningModal` as a prop; modal no longer reads the browser API in render.
- Duration: removed static rule from mockExamConfig; new `src/lib/instructionRules.js` `buildRules(config)` drops stale `/^Total duration is \d+ minutes/` rules and inserts a computed one; used by InstructionsPage.
- Tests: SecurityWarningModal.test.jsx (2), instructionRules.test.js (1). lint 0 errors (1 baseline warning), 147 tests pass, build OK. `grep -rni "duration is 54" src` empty.
- Criterion 5 browser check: ⚠️ not verified (no browser).

## Review
**Approved** by Opus, 2026-10-30. Diff reviewed: the modal now reads the reactive `isFullscreen` prop, and `buildRules` drops the stale rule.
- Gate: lint 0 errors, 1 baseline warning (no new ones) · 147 tests pass · build OK. The only `duration is 54` match is a test fixture.
- Browser (agent-browser, dev server):
  - Seeded an old persisted config (60 min + stale "54 minutes" rule) → Instructions page shows "Total duration is 60 minutes", and no "54 minutes" anywhere.
  - Start → fullscreen on; `exitFullscreen` → warning shows `#security-return-fullscreen`; clicking it → fullscreen on again and the button is hidden.
