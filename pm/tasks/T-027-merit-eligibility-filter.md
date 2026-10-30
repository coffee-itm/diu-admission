# T-027 · Merit list eligibility filter (excludes NOT_ELIGIBLE by default)

Status: 👀 Review
Sprint: S2 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-025 (lane B order)
Implements: FR-RES-05 ("Filter by eligibility"). S1 post-merge E2E finding (Medium).

## Goal
The page says "Ranked list of eligible and conditionally eligible candidates", but it lists and exports NOT_ELIGIBLE rows too. Add an eligibility filter whose default is "Eligible + Conditional". The table and the CSV export both use the filtered rows, and the subtitle describes the active filter.

## Context to read
- `src/pages/admin/MeritListPage.jsx`: `meritList`, `exportCSV`, subtitle line 41
- `src/lib/meritCsv.js` (`buildMeritRows`) and `src/lib/meritCsv.test.js`
- `src/lib/constants.js`: `ELIGIBILITY`

## Files
- `src/lib/meritCsv.js` (modify): add `filterMeritByEligibility(list, filter)`. `filter` is one of `'eligible_conditional'` (default), `'ELIGIBLE'`, `'CONDITIONALLY_ELIGIBLE'`, `'NOT_ELIGIBLE'` or `'all'`. Ranks stay as computed on the full list; filtering hides rows and does not re-rank.
- `src/lib/meritCsv.test.js` (modify): a test for each filter value.
- `src/pages/admin/MeritListPage.jsx` (modify): a `<select id="merit-eligibility-filter" aria-label="Filter by eligibility">` above the table. The table and `exportCSV` use the filtered list. The subtitle follows the filter. Show an empty state when no rows match.

## Acceptance criteria
1. [x] By default no NOT_ELIGIBLE row is shown or exported. Covered by a unit test of the filter.
2. [x] "All" shows every row, and each single-value option shows only that eligibility.
3. [x] Rank numbers don't change when the filter changes.
4. [x] The exported CSV contains exactly the visible rows.
5. [x] No new lint warnings.

## Verify
```bash
pnpm test -- meritCsv && pnpm lint && pnpm build
```

## Out of scope
- Per-program merit lists and the `disqualified` exclusion (S6). PDF export.

## Agent log
- TDD: added `filterMeritByEligibility` tests (red) → implemented in `src/lib/meritCsv.js` with `MERIT_ELIGIBILITY_FILTERS` + `DEFAULT_MERIT_FILTER = 'eligible_conditional'`.
- `MeritListPage.jsx`: `<select id="merit-eligibility-filter" aria-label="Filter by eligibility">`, filter-derived subtitle, badge variant per eligibility, empty state.
- Page now joins candidate rows via `buildMeritRows` and renders the stored `rank` (not row index), so hiding rows never re-ranks.
- Added `src/pages/admin/MeritListPage.test.jsx` (not in the card's file list) to prove criteria 1–4 end-to-end, incl. export payload.
- Verify: `pnpm test` 226 passed / 2 todo, `pnpm lint` 0 errors 1 pre-existing warning (TestPage.jsx, T-030), `pnpm build` ok.
- Not browser-verified: none needed (no fullscreen/download in a real browser; download is mocked in the test).

## Review
