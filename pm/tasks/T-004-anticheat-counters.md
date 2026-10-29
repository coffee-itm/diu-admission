# T-004 · Fix stale anti-cheat counters so warnings and auto-submit fire

Status: 👀 Review
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-022
Implements: FR-AC-02, FR-AC-03, D-02, D-03 (callback part)

## Goal
`useAntiCheat` registers listeners once (`[]` deps) and computes `store.tabSwitchCount + 1` from the **first render's** store snapshot, so the count never passes 1: the warning at 2 and the auto-submit at 5 tab switches / 3 fullscreen exits never fire. `onAutoSubmit` is also captured at mount.

## Context to read
- `context/04-test-engine-anticheat.md` "Anti-cheat matrix (current)"
- `src/features/test/useAntiCheat.js` (whole), `src/store/antiCheatStore.js:30-75`, `src/lib/constants.js:95-124` (`ANTI_CHEAT`, `SECURITY_EVENT_TYPES`)

## Files
- `src/features/test/useAntiCheat.js` — modify
- `src/store/antiCheatStore.js` — modify only if a counter is missing
- `src/features/test/useAntiCheat.test.js` — create

## Steps
1. Tests first (`renderHook`):
   - mock `document.hidden` (`Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })`) and dispatch `visibilitychange`
   - after 1 switch: no warning · after 2: `showWarning === true` · after 5: `onAutoSubmit` called **exactly once**, and the store's `tabSwitchCount === 5`
   - fullscreen: simulate `fullscreenchange` with `document.fullscreenElement` null three times → `onAutoSubmit` once
   - the callback passed on a **later render** is the one that gets called (rerender with a new `onAutoSubmit`)
2. In each handler: call the increment action, then read the fresh value: `useAntiCheatStore.getState().tabSwitchCount`. Do the same for fullscreen exits. Use `getState()` for every store call inside listeners.
3. Keep the latest callback in a ref: `const onAutoSubmitRef = useRef(onAutoSubmit); useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; });` and call `onAutoSubmitRef.current?.()`. **Don't assign the ref during render** (React Compiler lint).
4. Fire auto-submit only once per session: a `submittedRef` guard.
5. Cut: log `cut_attempt` and count it with the copy counter (add `CUT_ATTEMPT: 'cut_attempt'` to `SECURITY_EVENT_TYPES`). Paste: also count it with the copy counter.
6. Thresholds keep coming from `ANTI_CHEAT` constants (config-driven thresholds arrive in R2).

## Acceptance criteria
1. [ ] Tab-switch warning at the 2nd switch; auto-submit at the 5th, exactly once.
2. [ ] Fullscreen exit auto-submit at the 3rd, exactly once.
3. [ ] The latest `onAutoSubmit` is used (test proves it).
4. [ ] Cut and paste attempts are logged and counted.
5. [ ] `pnpm lint` passes with no new `eslint-disable` lines.

## Verify
```bash
pnpm test -- useAntiCheat && pnpm lint && pnpm build
```

## Out of scope
- Submitting the latest answers (T-005), fullscreen gesture (T-006), persistence (T-007).

## Agent log
- useAntiCheat: all listener store calls use `useAntiCheatStore.getState()`; counts read fresh after increment.
- Latest `onAutoSubmit` kept in ref (updated in effect); `submittedRef` guards single-shot auto-submit.
- Cut now logged (`cut_attempt`, added to SECURITY_EVENT_TYPES) and counted; paste counted too.
- New useAntiCheat.test.js (5 tests). Note: tests call `cleanup()` explicitly (no RTL auto-cleanup, listeners leaked across tests).
- Gate: eslint 0 errors (2 pre-existing warnings in other file), full test 80 passed, build ok.

## Review
