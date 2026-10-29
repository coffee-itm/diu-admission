# T-013 · Fix candidate detail page and show all registered candidates

Status: 👀 Review
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: M
Depends on: T-022
Implements: FR-RES-03, FR-RES-04, D-10, D-16

## Goal
Candidate detail calls a function that doesn't exist (`resultService.getResultForCandidate`), so it spins forever. The Candidates page and Merit List only know the mock candidates, so newly registered candidates never appear.

## Context to read
- `context/06-open-issues-doc-gaps.md` rows D-10, D-16
- `src/services/authService.js:1-15` (`getStoredCandidates`), `src/services/resultService.js` (whole)
- `src/pages/admin/CandidateDetailPage.jsx:20-45`, `src/pages/admin/CandidatesPage.jsx:20-35`, `src/pages/admin/MeritListPage.jsx:15-30`

## Files
- `src/services/authService.js` — export `getAllCandidates()` → `getStoredCandidates().filter(c => c.role === 'candidate')`, with passwords stripped
- `src/pages/admin/CandidateDetailPage.jsx` — use `resultService.getForCandidate(id)`; find the candidate in `getAllCandidates()`; show a "Candidate not found" state instead of an endless spinner; catch → error state with message
- `src/pages/admin/CandidatesPage.jsx` — list from `getAllCandidates()`
- `src/pages/admin/MeritListPage.jsx` — drop the `mockCandidates` re-filter; use the `candidateName`/`candidateEmail` that `getMeritList()` already joins
- `src/services/authService.test.js` — create

## Acceptance criteria
1. [ ] `/admin/candidates/cand_001` loads profile + result + security section (when present).
2. [ ] A newly registered candidate appears in Candidates; after taking the test, in the Merit List.
3. [ ] An unknown id shows "Candidate not found", not a spinner.
4. [ ] `getAllCandidates()` never returns passwords (test).

## Verify
```bash
pnpm test -- authService && pnpm lint && pnpm build
```

## Out of scope
- Analytics/dashboard fixes (T-014), CSV (T-015).

## Agent log
- Added `getAllCandidates()` (authService); Candidates, Detail, Merit pages use it; resultService.getMeritList now joins via it too.
- Detail: uses `getForCandidate`, shows 'Candidate not found' / 'No test result yet' / error message instead of spinner.
- Merit page uses candidateName/candidateEmail from getMeritList.
- Tests: authService.test.js 2 passed; eslint clean on touched dirs; build ok. Full `pnpm test` had 5 failures in another agent's file (not mine).

## Review
