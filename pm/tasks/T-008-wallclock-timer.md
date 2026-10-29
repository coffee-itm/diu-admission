# T-008 · Wall-clock deadline timer (closing the tab must not pause the exam)

Status: ✅ Ready
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

## Review
