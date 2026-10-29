# T-011 · Replace hard-coded exam numbers and titles with config values

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-010
Implements: FR-CFG-04, FR-RES-02 (title part), D-17

## Goal
"50 questions", "54 minutes", "50 %" and "Spring 2026" are typed into the UI and PDF. They must come from the exam config.

## Context to read
- `src/pages/candidate/InstructionsPage.jsx:30-50`, `src/pages/candidate/DashboardPage.jsx:40-50`, `src/lib/pdfGenerator.js` (search "Spring")

## Files
- `src/pages/candidate/InstructionsPage.jsx` — totals from `useExamConfigStore`: questions = Σ `sections[].questionCount`, minutes = `totalTimeMinutes`, pass % = `passingThresholds.overallMinPercent`
- `src/pages/candidate/DashboardPage.jsx` — same values
- `src/lib/pdfGenerator.js` — header uses the exam title passed in (from `result.examTitle ?? examConfig.title`); add an `examTitle` parameter

## Acceptance criteria
1. [ ] `grep -rn "54 Minutes\|50 Questions\|Spring 2026" src --include=*.jsx --include=*.js` finds nothing outside `src/data/`.
2. [ ] Changing the time to 60 in Exam Config shows 60 on the dashboard and instructions (manual check).
3. [ ] The PDF header shows the config title.

## Verify
```bash
pnpm lint && pnpm build && pnpm test
```

## Out of scope
- i18n (S7).

## Agent log
- Instructions/Dashboard read totals (Σ questionCount, totalTimeMinutes, overallMinPercent, title) from useExamConfigStore; Instructions also reads rules from the store instead of mockExamConfig.
- generatePdfReport(user, result, examTitle): header uses result.examTitle ?? examTitle; ResultPage and CandidateDetailPage pass the store title.
- Extra (approved by Opus): useTestEngine startTest catch now toasts err.message, falling back to 'Failed to load test session'.
- Gate: eslint on changed files, test, build (see report). Manual 60-min check not run in a browser.
- Review fixes: Landing + admin Dashboard copy from config store; persist merge (one-level deep) in examConfigStore with test; Instructions uses plain config.instructions.

## Review

**CHANGES REQUESTED** (reviewer, commit e0c0491). Gate: eslint 0 errors (1 pre-existing TestPage warning), test 136 pass, build OK.
1. AC1 fails: `src/pages/public/LandingPage.jsx:10` ("54 Minutes") and `:35` ("Spring 2026"), `src/pages/admin/DashboardPage.jsx:43` ("Spring 2026") are still hard-coded. Take them from `useExamConfigStore` (title, `totalTimeMinutes`) or `mockExamConfig`; add these files to the card.
2. `src/pages/candidate/InstructionsPage.jsx:60`: `config.instructions ?? []` is unsafe. The store persists under `itm-exam-config` with zustand's default shallow merge, so a persisted `config` from before this change replaces the default whole and has no `instructions`. The candidate then sees an empty rules list. Fall back to `mockExamConfig.instructions` (import it), or add a `merge`/`version` to examConfigStore that spreads the defaults under the persisted config.
Verified OK: totals (Σ questionCount, totalTimeMinutes), PDF title fallback chain (result.examTitle ?? examTitle ?? 'Admission Assessment'), ResultPage/CandidateDetailPage edits are one-line PDF title callers (in scope). Toast `err.message` is safe: errors come from testService (e.g. "Not enough questions in section X: need N, have M"), no stacks; it does leak internal section IDs/counts, which is acceptable for the prototype.

**APPROVED** (re-review by Opus): ad0025f — no "54 Minutes"/"50 Questions"/"Spring 2026" left outside src/data; examConfigStore one-level deep merge + rehydrate test (defaults filled, admin title kept); persist name unchanged. eslint clean, 137 tests pass.
