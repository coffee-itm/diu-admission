# T-014 · Correct analytics counts, dashboard names, merit labels and the trend chart

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: M
Depends on: T-013
Implements: FR-ANL-01, FR-ANL-04 (prototype), D-18, D-20, D-25, D-26

## Goal
Registrations are double-counted, the admin dashboard shows raw candidate ids, the merit list labels are wrong, and the trend chart is fake data.

## Context to read
- `src/services/analyticsService.js` (whole), `src/pages/admin/DashboardPage.jsx`, `src/pages/admin/AnalyticsPage.jsx:45-70`, `src/pages/admin/MeritListPage.jsx` (empty state + badge label)

## Files
- `src/services/analyticsService.js` — `totalRegistrations = authService.getAllCandidates().length`. Add `perDay`: count of results per `submittedAt` date (YYYY-MM-DD, local time), last 14 days with data, sorted ascending
- `src/pages/admin/AnalyticsPage.jsx` — line chart uses `perDay` (remove the hard-coded array). Empty state when there is no data
- `src/pages/admin/DashboardPage.jsx` — recent results show the candidate name (join via `getAllCandidates()`)
- `src/pages/admin/MeritListPage.jsx` — empty text "No results yet"; eligibility label uses `replaceAll('_', ' ')`
- `src/services/analyticsService.test.js` — create

## Acceptance criteria
1. [x] With only the mock data, registrations = 16 (test).
2. [x] `perDay` groups the mock results correctly (test with 3 results over 2 days).
3. [x] No hard-coded trend data remains.
4. [x] "CONDITIONALLY ELIGIBLE" shows with both underscores replaced.

## Verify
```bash
pnpm test -- analyticsService && pnpm lint && pnpm build
```

## Out of scope
- Program filters (R2).

## Agent log
- analyticsService: registrations via getAllCandidates (16); added exported groupPerDay -> perDay [{date, count, avgScore}] (last 14 days, local date, ascending).
- AnalyticsPage trend uses perDay (avg score per day), hard-coded array removed, empty state "No results yet".
- DashboardPage shows candidate names (fallback id); MeritListPage uses replaceAll + "No results yet" (dashboard badge also replaceAll).
- Tests: analyticsService.test.js (4). lint, test (94 passed), build OK.
- E-019 fix: trend dates now use toLocaleDateString (en-GB); date-fns import removed, grep src clean. lint, test (96 passed), build OK.

## Review
**CHANGES REQUESTED** (E-019)
1. `src/pages/admin/AnalyticsPage.jsx:8,55` still imports `format` from `date-fns`, and S1 removes date-fns. Delete the import and replace line 55's `format(new Date(...), 'd MMM')` with `new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })`.
Everything else is OK: registrations=16, perDay grouping, no hard-coded trend, replaceAll labels, dashboard names. Eslint on the card's files is clean and the build passes. The one failing test file in `pnpm test` is outside this card (T-005 WIP); T-014's tests pass.

**Re-review: APPROVED** (a9d8a5f)
- `grep -rn date-fns src` is empty. AnalyticsPage.jsx no longer imports it, and the trend date uses `toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })` on a local-midnight Date, so it renders e.g. "15 Jun" with no timezone shift.
- eslint on AnalyticsPage.jsx is clean. The build passes. `pnpm test` shows 95 passed and 1 failed; the failure is the anti-cheat test, which belongs to T-006 and is outside this card.
