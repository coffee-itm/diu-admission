# T-025 · Validate exam config inputs before saving

Status: ✅ Ready
Sprint: S2 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: none
Implements: FR-CFG-01 validation (thresholds 0–100, questionCount ≥ 1). S1 post-merge E2E finding (High).

## Goal
The admin can currently save a duration of `0` or a negative number, and that breaks the test timer. Invalid values must be rejected with a clear inline message and must never reach `useExamConfigStore`.

## Context to read
- `src/pages/admin/ExamConfigPage.jsx`: `formData`, `handleSave`, and the per-section inputs that call `updateSection` on every change
- `src/components/ui/Input.jsx`: the `error` prop
- `context/13-srs.md` FR-CFG-01: "thresholds 0–100", "questionCount ≥ 1"

## Files
- `src/lib/examConfigValidation.js` (create): `validateExamConfigForm({ totalTimeMinutes, overallMinPercent, sectionMinPercent })` returns `{ valid, errors: { field: message } }`. Rules: duration is a whole number from 1 to 600; both thresholds are numbers from 0 to 100; empty or `NaN` is invalid.
- `src/lib/examConfigValidation.test.js` (create)
- `src/pages/admin/ExamConfigPage.jsx` (modify):
  - `handleSave` validates first. When the form is invalid, it shows each error on its `Input` and calls `toast.error`, and it does not call `updateConfig`.
  - The per-section `questionCount` input ignores values < 1. The `timeMinutes` input ignores values < 0.

## Acceptance criteria
1. [ ] With a duration of `0`, `-5`, `''` or `2.5`, Save shows an inline error and the stored `config.totalTimeMinutes` stays unchanged.
2. [ ] With a threshold of `-1` or `101`, Save shows an inline error and nothing is saved.
3. [ ] Valid values (for example 60 / 50 / 40) save as before.
4. [ ] Tests: `examConfigValidation.test.js` covers each boundary (0, 1, 600, 601, -1, 0, 100, 101, empty, NaN).
5. [ ] A section `questionCount` can't be set below 1. Covered by a unit test of the guard, or noted ⚠️ for the QA card.
6. [ ] No new lint warnings.

## Verify
```bash
pnpm test -- examConfigValidation && pnpm lint && pnpm build
```

## Out of scope
- Server-side cycle validation (S4). Adding `id`s to these inputs (T-031). Pool-size checks.

## Agent log

## Review
