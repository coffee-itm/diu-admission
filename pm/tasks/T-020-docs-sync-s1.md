# T-020 · Sync docs with what Sprint 1 actually fixed

Status: ✔️ Done
Sprint: S1 · Role: docs-keeper · Model: free-ok · Size: S
Depends on: T-002 … T-019 (all Done)
Implements: P0-14

## Goal
Make the docs tell the truth after S1.

## Context to read
- `pm/BOARD.md`, each S1 card's "Implements" line (header only)

## Files
- `context/06-open-issues-doc-gaps.md` — for each D-xx fixed in S1, append `✅ Fixed (T-xxx)` in the Fix column (D-22 stays open: backend)
- `context/19-implementation-roadmap.md` — tick P0-01 … P0-14 that are Done
- `AGENTS.md` — dependency tables: remove `date-fns` and `jspdf-autotable`; add vitest/testing-library to dev deps; update the "Reality check" note (csvExport.js now exists; hooks/ still doesn't)
- `README.md` — anti-cheat section: say "deterrence + audit" and remove the "7-layer protection" claim; tick "CSV merit list export" in the roadmap
- `context/02-tech-architecture.md` — storage keys table → `diu-*`, add the `diu-questions` key, tests row "Vitest"

## Acceptance criteria
1. [x] Every claim was verified with grep/ls before writing.
2. [x] No requirement text or IDs changed.

## Verify
```bash
grep -n "Fixed (T-" context/06-open-issues-doc-gaps.md | wc -l
```

## Out of scope
- Writing new specs.

## Agent log
- Verified in code: STORAGE_KEYS = `diu-*` (constants.js:133-142), storageMigration.js, all 5 stores persisted, csvExport/csvParse/meritCsv/fullscreen/storageMigration/runStorageMigration/importQuestions exist, date-fns and jspdf-autotable gone from src and package.json.
- Fixed mapping from each card's Implements line and Review verdict. context/06: 25 rows marked `✅ Fixed (T-xxx)`; D-27 marked partly fixed (CI and react-query open); D-22, D-23, D-29 left open. csvExport.js removed from the "doesn't exist" list.
- context/19: P0-01…P0-13 ticked. P0-14 left open (this card).
- context/02: storage-keys table to `diu-*` (+ `diu-questions`, 5/5 persisted), Vitest tests row, deps, lib/auth/test tree. context/04: flow, timer, sampling, attempts, navigation, anti-cheat matrix. context/05: route table, inventory, MoSCoW.
- context/17 §8: date-fns and jspdf-autotable marked removed; §3 rename marked done (T-018).
- AGENTS.md: removed date-fns and jspdf-autotable (tables and install line), added Vitest/RTL/jsdom dev deps, reality-check note updated. README.md: "7-layer" claims replaced with "deterrence + audit", CSV merit export ticked (Excel kept open).
- Docs only. No src changes. No link checker in this card.

## Review

## Review
**APPROVED** (Opus): link checker "all links ok"; remaining `itm-*`/date-fns mentions in context/06 are historical defect rows (correct). ANTI_CHEAT_IMPLEMENTATION.md still names `itm-anti-cheat` → S1 carry-over.
