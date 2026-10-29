# T-007 · Save the anti-cheat summary with the stored result

Status: ✅ Ready
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-005
Implements: D-05 (prototype), feeds FR-RES-04

## Goal
On submit, the anti-cheat summary is added only to the test store's copy of the result. The record saved in localStorage (`itm-results`), which admins read, has no `antiCheat` field, so the admin security report is always empty.

## Context to read
- `src/services/testService.js:26-42` (`submitTest`)
- `src/features/test/useTestEngine.js` (`submitTest`)
- `src/store/antiCheatStore.js:107-122` (`getSummary`)

## Files
- `src/services/testService.js` — `submitTest({ …, antiCheat })` stores `antiCheat` in the record it saves and returns
- `src/features/test/useTestEngine.js` — call `finalizeTracking()`, get `getSummary()`, pass it as `antiCheat`. Remove the separate "enrich" step
- `src/services/testService.test.js` — create

## Acceptance criteria
1. [ ] Test: after `testService.submitTest({ …, antiCheat: { tabSwitchCount: 3, … } })`, `JSON.parse(localStorage.getItem('itm-results'))` contains a record with `antiCheat.tabSwitchCount === 3`.
2. [ ] The result returned to the test store still contains `antiCheat` (the ResultPage is unchanged).
3. [ ] Storage key stays `itm-results` (renamed later in T-018).

## Verify
```bash
pnpm test -- testService && pnpm lint && pnpm build
```

## Out of scope
- Showing it in the admin UI (T-013 fixes the detail page).

## Agent log

## Review
