# T-011 · Replace hard-coded exam numbers and titles with config values

Status: 👀 Review
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

## Review
