# T-008 · Wall-clock deadline timer (closing the tab must not pause the exam)

Status: 👀 Review
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-005
Implements: FR-TEST-03 (prototype version), D-06

## Goal
The timer decrements a persisted `timeRemaining` once per second (`tickTimer`). If the tab is closed for 10 minutes, the candidate gets those 10 minutes back. Store an absolute `deadline` and always derive the remaining time from the clock.

## Context to read
- `context/13-srs.md` FR-TEST-03
- `src/store/testStore.js` (whole), `src/features/test/useTimer.js` (whole), `src/features/test/useTestEngine.js` (`timeTaken` calc), `src/components/ui/Timer.jsx` (props only)

## Files
- `src/store/testStore.js` — add `deadline` (epoch ms), set in `initSession` = `Date.now() + totalSeconds*1000`. Replace `tickTimer` with `syncTime()` that sets `timeRemaining = max(0, ceil((deadline − Date.now())/1000))`
- `src/features/test/useTimer.js` — interval calls `syncTime` every 1000 ms; also on `visibilitychange` → visible; call `onExpire` once when it reaches 0
- `src/features/test/useTestEngine.js` — `timeTaken = round((min(Date.now(), deadline) − Date.parse(startedAt)) / 1000)`
- `src/store/testStore.test.js`, `src/features/test/useTimer.test.js` — create

## Steps
1. Tests with `vi.useFakeTimers()` + `vi.setSystemTime()`:
   - start a 54-minute session, move the system time +10 min **without** advancing timers, call `syncTime()` → `timeRemaining === 44*60`
   - `useTimer`: advancing past the deadline calls `onExpire` exactly once
   - a session restored from storage with a past deadline → `timeRemaining 0` and expiry fires once
2. Implement. Keep the `timeRemaining` field (the `Timer` component uses it).

## Acceptance criteria
1. [ ] No code path decrements time by ticking (`grep -n tickTimer src` → none).
2. [ ] The tests above pass.
3. [ ] Manual: start the test, reload after 1 min → the timer shows about 1 min less, not the same value.

## Verify
```bash
pnpm test -- testStore useTimer && pnpm lint && pnpm build
```

## Out of scope
- Server clock offset (R2), per-section timers.

## Agent log
- testStore: added persisted `deadline`, replaced `tickTimer` with `syncTime()` (clock-derived, clamped at 0).
- useTimer: 1s interval + visibilitychange call syncTime; onExpire fires once (ref guard, reset per session); checks immediately on mount so restored past-deadline sessions expire.
- useTestEngine: timeTaken = min(now, deadline) - startedAt.
- Tests: testStore.test.js (2), useTimer.test.js (3). Gate green; no tickTimer left. AC3 manual reload check not run.

## Review

Verdict: CHANGES REQUESTED
Passed: syncTime math (testStore.js:81-86, ceil, max 0); timeTaken (useTestEngine.js:43-44, min(now, deadline) - startedAt); onExpire fires once (useTimer.js, firedRef touched only in effects/callbacks, onExpireRef updated in an effect); interval and visibilitychange cleaned up; 3 required scenarios covered; no tickTimer left; eslint clean, pnpm test 114 passed, pnpm build OK. AC3 (manual reload) not run.
Required changes:
1. Legacy persisted session without `deadline` freezes the timer (testStore.js:83 returns {} when deadline == null). In `syncTime` (or a persist `merge`/`onRehydrateStorage`), when a session is in progress (`sessionId` set, `!isSubmitted`) and `deadline == null`, backfill `deadline = Date.now() + timeRemaining*1000` and keep timeRemaining unchanged.
2. Add a test in testStore.test.js: setState({deadline: null, timeRemaining: 600}), call syncTime, expect deadline === Date.now()+600000 and timeRemaining 600; after advancing the system time 60 s and syncing, timeRemaining 540. Also assert nothing is backfilled when isSubmitted or there is no sessionId.
