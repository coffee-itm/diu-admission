# T-031 · Add missing `id`s to admin interactive elements

Status: ✅ Ready
Sprint: S2 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-025, T-027, T-028, T-029 (they touch the same files; this card runs last in wave 1)
Implements: AGENTS.md rule 5 ("All interactive elements must have unique `id` attributes"). S1 post-merge E2E finding (Low).

## Goal
Every button, link-button, input, select and textarea on the admin pages gets a unique, stable `id` (kebab-case, page-prefixed), so tests and E2E can target them. `Input` already passes `id` through to the input and its `<label htmlFor>`.

## Context to read
- `src/components/ui/Input.jsx`: the `id` prop
- Existing naming, for example `#merit-export-csv`, `#bulk-import-template`, `#nav-logout-btn`

## Files
- `src/pages/admin/ExamConfigPage.jsx`: `exam-config-title`, `exam-config-duration`, `exam-config-overall-min`, `exam-config-section-min`, `exam-config-save`, `exam-config-reset`, and per-section `exam-config-${sec.id}-count` / `-time`
- `src/pages/admin/QuestionBankPage.jsx`: search, section filter, difficulty filter, import button, new-question button (`question-bank-*`)
- `src/features/questions/QuestionTable.jsx`: per-row edit and remove buttons (`question-${q.id}-edit` / `-remove`)
- `src/features/questions/QuestionForm.jsx`: every field without an id (`question-form-*`)
- `src/pages/admin/CandidatesPage.jsx`: search/filter and per-row actions (`candidate-${c.id}-view`)

## Steps
1. For each file, list every `<button|Button|input|Input|select|textarea>` without an `id` and add one.
2. Make sure ids are unique per page. Per-row ids include the row's entity id.

## Acceptance criteria
1. [ ] In each listed file, every `<button|Button|input|Input|select|textarea>` element has an `id`. Show the grep or count used to prove it in the Agent log.
2. [ ] Each labelled `Input` has its label linked (`htmlFor` equals the id).
3. [ ] No duplicate ids on a page. Per-row ids include the entity id.
4. [ ] Existing tests pass. Update any test that queried by text only if it broke.
5. [ ] No new lint warnings.

## Verify
```bash
pnpm test && pnpm lint && pnpm build
```

## Out of scope
- Candidate-facing pages, which already have ids from S1. i18n of labels.

## Agent log

## Review
