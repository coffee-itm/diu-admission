# T-027 · Merit list eligibility filter (excludes NOT_ELIGIBLE by default)

Status: ✔️ Done
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

**Reviewer verdict (commit fe9ef18): APPROVED**

Checks:
- Rank source: `src/services/resultService.js:29-41` assigns `rank: i + 1` to every row after dedupe and sort, so no row reaches the page without a rank. `src/lib/meritCsv.js:35` (`rank: r.rank ?? i + 1`) is a fallback only. The page renders `{item.rank}` (`MeritListPage.jsx` Rank cell) and the rank colour/award checks use `item.rank`. Ties get distinct sequential ranks, same as before this change (the old page used `index + 1`), so no regression. Not a T-027 requirement.
- Filter and ranks: `filterMeritByEligibility` (`meritCsv.js` end of file) only hides rows; ranks are never recomputed. Default `eligible_conditional` hides NOT_ELIGIBLE. `all` keeps every row. Single-value options keep only that eligibility. Covered by `meritCsv.test.js` (AC 1-3).
- CSV: `exportCSV` (`MeritListPage.jsx:53`) runs `filterMeritByEligibility` over the same rows the table shows, so the export matches the visible rows and keeps the `rank` column. Covered by `MeritListPage.test.jsx` "exports exactly the visible rows" (AC 4).
- Subtitle follows the filter via `MERIT_SUBTITLES`. Select has `id="merit-eligibility-filter"` and `aria-label`. Empty state `No candidates match this eligibility filter` (`MeritListPage.jsx:137`). Export button has an id.
- Extra `src/pages/admin/MeritListPage.test.jsx`: accepted. It only exercises the page, the test mocks are scoped, and it does not change source behaviour.
- Scope notes (non-blocking): badge variant change (`badgeVariant`, NOT_ELIGIBLE now `danger`) and the export empty-state toast are small additions beyond the card text. Both are reasonable and in the same page.
- Pre-existing, not introduced here: `item.eligibility.replaceAll` throws if eligibility is missing; "No results yet" also shows during the initial load because `meritList` starts as `[]`.
- Lint: no warnings on the four changed files. Tests: `meritCsv.test.js` + `MeritListPage.test.jsx` 15/15 passed.

Card header status and board row: the coordinator asked that only this Review section and the board row be touched, so the header line still reads `👀 Review`. It should be flipped to `✔️ Done` by the coordinator.
