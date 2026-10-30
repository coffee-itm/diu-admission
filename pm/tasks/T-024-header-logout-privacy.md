# T-024 · Header logout clears the test session (privacy)

Status: 👀 Review
Sprint: S2 · Role: frontend-dev · Model: sonnet · Size: S
Depends on: none
Implements: S1 carry-over (T-021 privacy finding, T-012 follow-up), NFR privacy

## Goal
After a candidate logs out, the next person on the same browser must not find the previous candidate's answers or result in `localStorage`. The root cause: `src/components/layout/Header.jsx:10-15` calls `useAuthStore().logout` directly. That skips the `resetSession()` and anti-cheat `reset()` calls that `useAuth().logout` (`src/features/auth/useAuth.js:42`) already makes.

## Context to read
- `src/components/layout/Header.jsx`: `handleLogout` and the `#nav-logout-btn` button
- `src/features/auth/useAuth.js`: `logout()`
- `src/store/testStore.js` (`resetSession`, persisted under `STORAGE_KEYS.TEST_SESSION`) and `src/store/antiCheatStore.js` (`reset`)

## Files
- `src/components/layout/Header.jsx` (modify): log out through `useAuth().logout` so there is only one logout path. Keep the existing navigation after logout.
- `src/components/layout/Header.test.jsx` (create): regression test.

## Steps
1. Make the Header use `useAuth()` for `logout`. It still reads `user`/`isAuthenticated` the same way.
2. Run `grep -rn "logout" src`. No code outside `useAuth.js` may call `useAuthStore` `logout` directly.
3. Test: seed `useTestStore` with a submitted session (answers + result) and the anti-cheat store with counts. Render the Header in a MemoryRouter as a logged-in candidate and click `#nav-logout-btn`. Assert that both stores are back to their initial state and that `localStorage.getItem('diu-test-session')` contains no answers or result.

## Acceptance criteria
1. [x] Logging out from the Header leaves `useTestStore` equal to its initial state and resets `useAntiCheatStore`. Covered by a test.
2. [x] The persisted `diu-test-session` holds no answers and no result after logout. Covered by a test.
3. [x] `grep -rn "useAuthStore" src | grep -i logout` matches only `src/features/auth/useAuth.js`.
4. [x] No new lint warnings.

## Verify
```bash
pnpm test -- Header useAuth && pnpm lint && pnpm build
```

## Out of scope
- Server-side sessions and tokens (S3). Any change to `authStore` shape.

## Agent log
- Header now uses `useAuth()` (single logout path); navigation unchanged. Added `Header.test.jsx` (seeds test + anti-cheat stores, clicks logout, asserts initial state and persisted storage empty).
- Gate: lint 0 errors (1 baseline warning in TestPage.jsx), test 148 passed, build ok. grep: only useAuth.js touches authStore logout.

## Review
