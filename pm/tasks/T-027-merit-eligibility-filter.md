# T-027 · Merit list eligibility filter (excludes NOT_ELIGIBLE by default)

Status: ✅ Ready
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
1. [ ] By default no NOT_ELIGIBLE row is shown or exported. Covered by a unit test of the filter.
2. [ ] "All" shows every row, and each single-value option shows only that eligibility.
3. [ ] Rank numbers don't change when the filter changes.
4. [ ] The exported CSV contains exactly the visible rows.
5. [ ] No new lint warnings.

## Verify
```bash
pnpm test -- meritCsv && pnpm lint && pnpm build
```

## Out of scope
- Per-program merit lists and the `disqualified` exclusion (S6). PDF export.

## Agent log

## Review
