# T-042 · Exam config: numeric inputs cannot be cleared, and save behaviour is implicit

Status: 📋 Backlog
Sprint: S3 · Role: frontend-dev · Model: lite · Size: S
Tier rationale: contained to one page's input handling; the card states the exact required behaviour (PROCESS §2.3)
Depends on: —
Implements: FR-CFG; T-025 review follow-up, confirmed by T-040 QA item 10

## Goal
On `/admin/exam-config`, a section's question-count and time inputs cannot be edited normally: the T-025 validation guard coerces a cleared field back to `1`, so Backspace leaves `1` and typing `9` produces `19`. Make the fields editable while keeping invalid values unsavable. Two smaller problems found with it: the section inputs write straight to the store with no explicit Save, and they have no upper bound.

## Context to read
- `pm/tasks/T-040-s2-qa.md` item 10 (reproduction) and `pm/tasks/T-025-exam-config-validation.md` (the guard it must not break)
- `context/13-srs.md` FR-CFG-01/02 · `src/lib/examConfigValidation.js`

## Files
- `src/pages/admin/ExamConfigPage.jsx`: allow a transient empty/invalid string in local input state; validate on blur/submit rather than on every keystroke; add an upper bound per `examConfigValidation.js`; make saving explicit and consistent with the rest of the page.
- `src/lib/examConfigValidation.js`: add the upper bounds if they are missing.
- `src/pages/admin/ExamConfigPage.test.jsx`: regression tests — clearing a field then typing a value yields exactly that value; an empty or out-of-range field blocks save with an inline error; a valid change persists.

## Acceptance criteria
1. [ ] Selecting a section count/time field, pressing Backspace to empty it and typing `9` results in `9`, not `19`.
2. [ ] An empty or out-of-range value cannot be saved and shows an inline error.
3. [ ] Question count and time have documented upper bounds, enforced in `examConfigValidation.js` and tested.
4. [ ] Whether the section inputs save immediately or on Save is consistent across the page and stated in the UI.
5. [ ] `pnpm lint` (0 warnings), `pnpm test`, `pnpm build` pass; new regression tests included.

## Verify
```bash
pnpm lint && pnpm test && pnpm build
```

## Out of scope
- Per-program config overrides, the exam-cycle model (S4 / P3-03).

## Agent log

## Review
