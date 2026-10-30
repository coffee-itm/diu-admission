# T-031 · Add missing `id`s to admin interactive elements

Status: ✔️ Done
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
- Part 1 (ids in 7 files + QuestionForm.test.jsx, QuestionTable/ExamConfig tests) was done by DeepSeek (cut off by usage limit); reviewed by Claude, kept as-is: all hunks are id-only (incl. CandidateDetailPage/QuestionFormPage, extra files, id-only so kept). No code fixes were needed.
- AC1 proof (`grep -cE '<(button|Button|input|Input|select|textarea)\b'` vs elements with id; multi-line tags checked by hand): ExamConfigPage 8/8 (2 Button, 4 Input, 2 per-section input), QuestionBankPage 5/5, QuestionTable 3/3, QuestionForm 10/10 (tags input `question-tags`, 2 select, 2 textarea, radio, option Input, hidden, 2 Button), CandidatesPage 2/2, CandidateDetailPage 3/3 (not-found back already had id), QuestionFormPage 2/2.
- AC2: labelled Inputs/selects/textareas have htmlFor = id (tests use getByLabelText). AC3: per-row ids include entity id; same-named back ids sit in mutually exclusive early-return branches.
- Gate: lint 0 warnings, test 245 passed, build ok.

## Review
Verdict: **CHANGES REQUESTED** (reviewer, commit df46b9d, 2026-10-30)

Verified (main tree, no copies):
- AC1: AST count (espree over the JSX) and `grep -cE` agree: ExamConfigPage 8/8, QuestionBankPage 5/5, QuestionTable 3/3, QuestionForm 10/10, CandidatesPage 2/2, CandidateDetailPage 3/3, QuestionFormPage 2/2. No target element without an id.
- AC2: every labelled `<label>`/`Input` links to its control. QuestionForm.jsx:42-43, 52-53, 63-65, 106-108, 117-118 (htmlFor = id). ExamConfigPage title/duration/overall-min/section-min go through Input.jsx:29 `htmlFor={id}`. Per-section inputs use aria-label (ExamConfigPage.jsx:152, 165), no htmlFor needed.
- AC3: duplicates only for `candidate-detail-back` (CandidateDetailPage.jsx:45 inside `if (error || !candidate || !result)` return, :57 final return) and `question-form-page-back` (QuestionFormPage.jsx:22 inside `if (isEdit && !initialData)` return, :41 final return). Mutually exclusive, so no duplicate on any rendered page. Per-row ids include q.id / c.id; no collisions with layout, modal or bulk-import ids.
- Id-only: removed id/htmlFor from pre (df46b9d^) and post for all 7 production files; the normalised text is identical in every case. CandidateDetailPage.jsx and QuestionFormPage.jsx are id-only.
- Gate: `pnpm lint` exit 0, no warnings. `pnpm test` 31 files, 245 passed (2 todo). `pnpm build` exit 0.

Required changes:
1. Agent log, AC1 proof (line 43): the QuestionForm count is wrong. It says 9/9, but the file has 10 target tags (`question-tags` input at QuestionForm.jsx:17, selects 43 and 53, textareas 64 and 107, radios 81, option Input 90, hidden input 97, buttons 136 and 137). Correct the log to 10/10 and rerun the grep to confirm.

Advisory (not blocking):
a. ExamConfigPage.test.jsx:10 changed the `fieldInput` helper to `getByLabelText`. The old helper still passed, and AC4 says to change tests only if they broke. Keep it, since its old comment ("no ids yet (T-031)") is now stale, but say so in the Agent log.
b. QuestionForm.jsx:18 keeps the pre-existing id `question-tags`, not `question-form-tags`. It is stable and unique, so leave it.
c. QuestionForm.jsx:75 has a `<label>` ("Options & Correct Answer") with no control. It is a group heading, out of scope, and not a bug for this card.

After the log fix, the re-review is a quick count check.

**Re-review (coordinator, Opus, 2026-10-30): APPROVED.** The only finding was in the log, not the code. I corrected QuestionForm to 10/10 and re-ran `grep -cE '<(button|Button|input|Input|select|textarea)\b'` (10). The reviewer had already confirmed that all 10 have ids, that every change is id-only (a diff with id/htmlFor stripped is identical), that there are no duplicate ids per rendered page, and that the gate is green.
