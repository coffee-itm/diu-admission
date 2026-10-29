# T-014 · Correct analytics counts, dashboard names, merit labels and the trend chart

Status: ✅ Ready
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
1. [ ] With only the mock data, registrations = 16 (test).
2. [ ] `perDay` groups the mock results correctly (test with 3 results over 2 days).
3. [ ] No hard-coded trend data remains.
4. [ ] "CONDITIONALLY ELIGIBLE" shows with both underscores replaced.

## Verify
```bash
pnpm test -- analyticsService && pnpm lint && pnpm build
```

## Out of scope
- Program filters (R2).

## Agent log

## Review
