# T-016 · Real question-bank CSV import with a row error report

Status: ✅ Ready
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

## Review
