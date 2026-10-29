# T-020 · Sync docs with what Sprint 1 actually fixed

Status: ✅ Ready
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
1. [ ] Every claim was verified with grep/ls before writing.
2. [ ] No requirement text or IDs changed.

## Verify
```bash
grep -n "Fixed (T-" context/06-open-issues-doc-gaps.md | wc -l
```

## Out of scope
- Writing new specs.

## Agent log

## Review
