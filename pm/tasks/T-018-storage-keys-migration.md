# T-018 · Rename itm-* storage keys to diu-* with a one-time migration

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-007, T-010, T-012, T-016, T-017   (runs last in the code lanes: it touches many files)
Implements: D-28

## Goal
After the university-wide pivot, most localStorage keys are still `itm-*`. Rename them and migrate existing browser data so demo users don't lose state.

## Context to read
- `context/02-tech-architecture.md` "Stores & storage keys (actual)"
- `grep -rn "itm-" src`

## Files
- `src/lib/constants.js` — `STORAGE_KEYS = { AUTH: 'diu-auth', TEST_SESSION: 'diu-test-session', ANTI_CHEAT: 'diu-anti-cheat', EXAM_CONFIG: 'diu-exam-config', RESULTS: 'diu-results', LANG: 'diu-lang', CANDIDATES: 'diu-candidates', QUESTIONS: 'diu-questions' }`
- Every store `persist({ name })` and every `localStorage.getItem/setItem` call uses `STORAGE_KEYS`
- `src/lib/storageMigration.js` — create: `migrateStorageKeys()`: for each old → new pair, if old exists and new doesn't, copy and remove old. Idempotent
- `src/main.jsx` — call `migrateStorageKeys()` **before** the app renders (before stores hydrate)
- `src/lib/storageMigration.test.js` — create

## Acceptance criteria
1. [ ] `grep -rn "'itm-" src` → only the old-key list in `storageMigration.js`.
2. [ ] Migration tests: copies, doesn't overwrite existing new keys, safe to run twice.
3. [ ] Manual: with old data in the browser, reload → still logged in, results still visible.

## Verify
```bash
pnpm test -- storageMigration && pnpm lint && pnpm build
```

## Out of scope
- Any other refactor.

## Agent log
- Added STORAGE_KEYS to constants.js; all stores/services/LanguageToggle use it (examConfigStore custom merge kept).
- storageMigration.js (LEGACY_KEY_MAP, idempotent, never overwrites diu-*) + 3 tests; runStorageMigration.js side-effect module imported first in main.jsx so it runs before store hydration (ESM imports hoist, so a call in main body would be too late).
- Existing tests updated to diu-* keys. lint 0 errors (1 pre-existing warning TestPage), test 144 passed, build ok. Manual browser check (AC3) not run.

## Review
APPROVED (reviewer). main.jsx:1 imports runStorageMigration.js -> storageMigration.js -> constants.js (no imports), so store-free and runs before hydration. Migration copies only when new key absent, removes old, idempotent, try/catch for throwing storage (storageMigration.js:14-24). All persist names and direct localStorage calls use STORAGE_KEYS; remaining 'itm-' only in LEGACY_KEY_MAP and tests. Logout reset, diu-questions and examConfig merge untouched. lint 0 errors (1 pre-existing warning), 144 tests pass, build ok.
Notes (non-blocking): no test for a throwing localStorage; AC3 manual check not run; context/02 lines 72-79 still list itm-* keys, T-020 must update them.
