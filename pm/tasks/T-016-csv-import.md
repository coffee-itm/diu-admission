# T-016 · Real question-bank CSV import with a row error report

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-010, T-015, T-017
Implements: FR-QB-04 (prototype), D-11 (import part)

## Goal
`BulkImportModal` waits 1.5 s and toasts "imported 25 questions" without reading the file. Parse the CSV, validate each row, add the valid rows to the (persisted) question bank, and show which rows failed and why.

## Context to read
- `context/15-api-spec.md` §7 "Question import/export" (format)
- `src/features/questions/BulkImportModal.jsx` (whole), `src/features/questions/questionSchema.js`, `src/store/questionStore.js` (`create`)

## Files
- `src/lib/csvParse.js` — create: `parseCSV(text)` → array of row arrays. RFC 4180 (quoted fields, escaped `""`, commas/newlines inside quotes, CRLF or LF, strips a leading BOM). No dependencies
- `src/lib/csvParse.test.js` — create
- `src/features/questions/importQuestions.js` — create: `mapRows(rows)` → `{ valid: Question[], errors: [{ row, messages[] }] }`. Requires the header row from the spec. Maps `option_a..d` → `options[{id,text}]`, `tags` split on `|`, trims, lowercases section/difficulty to the schema format. Validates each with `questionSchema.safeParse`. Row numbers are 1-based **including** the header (so the first data row is row 2)
- `src/features/questions/importQuestions.test.js` — create
- `src/features/questions/BulkImportModal.jsx` — read `await file.text()`, show a preview: "N valid, M with errors" plus an error list. "Import N questions" adds them via `questionStore.create`. Close resets state. Ids: `bulk-import-file`, `bulk-import-confirm`
- `public/samples/questions-template.csv` — create a 2-row example; link it from the modal ("Download template")

## Acceptance criteria
1. [ ] Parser tests: quotes, embedded comma, embedded newline, CRLF, BOM.
2. [ ] Mapper tests: a valid row → question; missing option / bad `correct_answer` / unknown section → error with the right row number.
3. [ ] Wrong header → one clear error, nothing imported.
4. [ ] Manual: import the template → 2 questions appear in the bank and survive a reload.

## Verify
```bash
pnpm test -- csvParse importQuestions && pnpm lint && pnpm build
```

## Out of scope
- Duplicate detection, question status (R2).

## Agent log
- Added csvParse (RFC 4180, BOM-safe), importQuestions.mapRows (header check, per-row zod + correct_answer check, row numbers incl. header), reworked BulkImportModal (preview, error list, imports via questionStore.create, reset on close), sample template CSV.
- Tests: 12 new (7 parser, 5 mapper); full suite 136 passed. Manual reload check not run in a browser; store is persisted (T-010).

## Review

**Verdict: APPROVED** (reviewer, 2026-10-29)
- AC1 csvParse.test.js (quotes, comma, newline, CRLF, BOM); AC2/3 importQuestions.test.js (row numbers, bad header -> single error, nothing valid). Gate: eslint clean on changed files, `pnpm test` 136 passed, `pnpm build` ok.
- Validation uses `questionSchema.safeParse` (importQuestions.js:46); only the extra `correct_answer in a-d` check is ad hoc. Header matches FR-QB-04, api-spec and public/samples/questions-template.csv. Ids come from `questionStore.create` (generateId, no collision). Partial import of valid rows matches FR-QB-04 (invalid skipped and reported).
- Advisories (non-blocking, follow-up):
  1. csvParse.js: an unterminated quote swallows the rest of the file into one field. Rows after it are misreported, with no "unterminated quote" error. Suggest flagging it.
  2. csvParse.js:44 drops blank lines before numbering, so row numbers after a blank line are lower than the file line. Fine for the card's definition, but worth documenting.
  3. Spec limits not enforced: 2 MB / 2000 rows (modal allows 5 MB), unique option text, imported status `draft` (R2).
  4. Shared `Modal.jsx` has Escape and ids but no role=dialog/aria-modal/focus trap. Out of scope here, so log it as a UI a11y follow-up.
  5. Manual reload check was not run (store persisted via T-010).
