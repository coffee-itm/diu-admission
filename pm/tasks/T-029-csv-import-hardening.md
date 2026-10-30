# T-029 · CSV import hardening: quotes, line numbers, limits, unique options

Status: 👀 Review
Sprint: S2 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-027 (lane B order)
Implements: FR-QB-04 (2 MB / 2,000 rows, row-numbered errors) and FR-QB-01 (unique option text). S1 carry-over (T-016) and post-merge E2E finding ("Section is required" message).

## Goal
Make the question CSV import report errors truthfully:
- An unterminated quote is reported, not silently swallowed.
- Error row numbers match the file's real line numbers, even when there are blank lines or multi-line quoted fields.
- The size limit is 2 MB and the row limit is 2,000 data rows (the modal currently allows 5 MB).
- Duplicate option text within a question is rejected.
- An invalid section value gets a correct message, instead of "Section is required".

## Context to read
- `src/lib/csvParse.js` and `csvParse.test.js`: blank lines are filtered out (line 45), so row numbers drift
- `src/features/questions/importQuestions.js` (`mapRows`, `rowNum = idx + 2`) and its test
- `src/features/questions/questionSchema.js:5`: the `z.enum(..., { error: 'Section is required' })` message
- `src/features/questions/BulkImportModal.jsx`: `MAX_BYTES` and the "Max file size: 5MB" copy
- `context/13-srs.md` FR-QB-01 and FR-QB-04

## Files
- `src/lib/csvParse.js` (modify):
  - Add `parseCSVDetailed(text)`, returning `{ rows: [{ cells, line }], error: null | { line, message } }`. `line` is the 1-based line where the record starts. An unterminated quote gives `error: { line, message: 'Unterminated quoted field' }`.
  - Keep `parseCSV(text)` as a thin wrapper returning `string[][]`, so existing callers and tests still pass.
- `src/features/questions/importQuestions.js` (modify): `mapRows` accepts the detailed rows and reports `row` as the real file line. Add a `MAX_IMPORT_ROWS = 2000` check that returns one error when there are too many data rows.
- `src/features/questions/questionSchema.js` (modify):
  - The section message tells "missing" apart from "invalid", for example "Section must be one of MATH, LOGIC, IT, ENGLISH, BUSINESS".
  - Add a `superRefine`/`refine` that rejects options whose trimmed, case-insensitive text repeats.
- `src/features/questions/BulkImportModal.jsx` (modify): set `MAX_BYTES` to 2 MB and update the copy. Use `parseCSVDetailed`, and show a parse error as a single error row.
- Tests (modify): `csvParse.test.js`, `importQuestions.test.js`, `questionSchema.test.js`.

## Acceptance criteria
1. [ ] `parseCSVDetailed('a,"b\n')` returns an error with message `Unterminated quoted field` and line 1. Covered by a test.
2. [ ] For a file with a header, a blank line, and then an invalid row on file line 3, the error reports `row: 3`. A multi-line quoted field doesn't shift later line numbers. Covered by tests.
3. [ ] 2,001 data rows give a single "too many rows (max 2000)" error, and 2,000 rows are accepted. Covered by a test.
4. [ ] Section `HISTORY` gives a message listing the valid sections. A missing section still says it is required. Covered by a test.
5. [ ] Two options with the text "Paris" and "paris " are rejected with an options error. Covered by a test. The question form uses the same schema.
6. [ ] The modal rejects files over 2 MB, and its copy says 2 MB.
7. [ ] All existing `parseCSV` tests still pass unchanged.
8. [ ] No new lint warnings.

## Verify
```bash
pnpm test -- csvParse importQuestions questionSchema && pnpm lint && pnpm build
```

## Out of scope
- `draft` status on import. The prototype has no question status field, so this moves to the questions API in S4.
- Dry-run mode (S4). Duplicate-question detection, FR-QB-05 (S4).

## Agent log
- Added parseCSVDetailed (line tracking, unterminated-quote error); parseCSV is a wrapper. mapRows accepts detailed rows or legacy string[][] and reports real file lines; MAX_IMPORT_ROWS=2000.
- questionSchema: section missing vs invalid message, superRefine for unique option text (error path options.N.text, shown by QuestionForm).
- Modal: 2 MB limit/copy, parse error shown as one error row (limit copy also mentions 2,000 rows).
- Tests added in 3 files; lint 0 new warnings (1 existing in TestPage.jsx, not mine); test 234 passed; build ok.
- Criterion 6 (modal rejects >2 MB) by code only: ⚠️ not verified (no browser).

## Review
