# T-012 · Enforce single attempt, add Resume, clear test state on logout

Status: ✅ Ready
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-011
Implements: FR-TEST-07, FR-TEST-12, FR-AUTH-04, D-12, D-13, D-15

## Goal
A candidate can retake the test by visiting Instructions again (creating duplicate results). There's no Resume button for an interrupted test. On logout, the previous user's test session stays in storage for the next user.

## Context to read
- `context/13-srs.md` FR-TEST-07, FR-TEST-12, FR-AUTH-04
- `src/features/test/useTestEngine.js` (`startTest`), `src/services/testService.js`, `src/pages/candidate/DashboardPage.jsx`, `src/pages/candidate/InstructionsPage.jsx`, `src/features/auth/useAuth.js` (`logout`), `src/store/testStore.js`, `src/store/antiCheatStore.js` (`reset`)

## Files
- `src/store/testStore.js` — add `candidateId` to the session (set in `initSession`)
- `src/services/testService.js` — `countAttempts(candidateId)` = results for that candidate (stored + mock)
- `src/features/test/useTestEngine.js` — `startTest`:
  1. If the store has an **active** session for this user (`candidateId === user.id && !isSubmitted`) → just navigate to the test (resume).
  2. Else if `countAttempts >= examConfig.maxAttempts` → toast "You have already taken this test" and navigate to the result page.
  3. Else start a new session.
- `src/pages/candidate/DashboardPage.jsx` — if an active session for this user exists: show "Resume test" (`id="dashboard-resume-test"`) with the time left. A session whose deadline has passed resumes too (the timer auto-submits immediately)
- `src/features/auth/useAuth.js` — `logout` also calls `useTestStore.getState().resetSession()` and `useAntiCheatStore.getState().reset()`
- Tests: `useTestEngine.test.js` (3 branches), `useAuth.test.js` (logout clears both stores)

## Acceptance criteria
1. [ ] Second attempt blocked (test + manual).
2. [ ] Active session → Resume keeps answers and the remaining time.
3. [ ] Logout → `itm-test-session` and `itm-anti-cheat` hold no session for the next user (test).
4. [ ] A session belonging to another user is never resumed (test).

## Verify
```bash
pnpm test -- useTestEngine useAuth && pnpm lint && pnpm build
```

## Out of scope
- Server-side enforcement (R2).

## Agent log

## Review
