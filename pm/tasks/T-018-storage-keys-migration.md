# T-018 · Rename itm-* storage keys to diu-* with a one-time migration

Status: ✅ Ready
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

## Review
