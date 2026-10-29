# T-015 · Real merit-list CSV export

Status: 👀 Review
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-014
Implements: FR-RES-06, D-11 (export part)

## Goal
"Export CSV" only shows a success toast. Generate a real CSV that Excel opens correctly, including Bangla names.

## Context to read
- `context/15-api-spec.md` §7 "Merit list export" (column list)
- `src/pages/admin/MeritListPage.jsx:30-40`

## Files
- `src/lib/csvExport.js` — create: `toCSV(rows, columns)` where `columns = [{ key | value(row), header }]`; RFC 4180 escaping (quote fields containing `"`, `,`, CR or LF; double inner quotes); `\r\n` line endings. `downloadCSV(filename, csv)` prepends a UTF-8 BOM (`﻿`) and triggers a Blob download
- `src/lib/csvExport.test.js` — create
- `src/pages/admin/MeritListPage.jsx` — `exportCSV` builds the rows: rank, name, email, phone (if known), program, total_score, percentage, math_pct … business_pct, eligibility, time_taken (mm:ss), submitted_at. File name `DIU_Merit_List_<YYYY-MM-DD>.csv`. Button `id="merit-export-csv"`

## Acceptance criteria
1. [ ] Escaping tests: a comma, a quote, a newline, and a Bangla name (`"রহিম"`) round-trip correctly.
2. [ ] The BOM is present in what `downloadCSV` writes (test by spying on `Blob`).
3. [ ] Manual: the exported file opens in a spreadsheet with correct columns.

## Verify
```bash
pnpm test -- csvExport && pnpm lint && pnpm build
```

## Out of scope
- Merit PDF changes, per-program merit lists (R2).

## Agent log
- Added toCSV/downloadCSV (BOM, RFC 4180, CRLF) + 4 tests; MeritListPage exportCSV builds spec columns, file DIU_Merit_List_<date>.csv, button id merit-export-csv.
- phone/program read from item.candidatePhone|phone / programCode|program; mock merit list lacks them so they export blank (follow-up for service).
- Criterion 3 (open in spreadsheet) not verified manually.

## Review
