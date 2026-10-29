# T-022 · Get `pnpm lint` to zero errors (behavior-preserving cleanup)

Status: ✅ Ready
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-001
Implements: NFR-13 (lint clean), unblocks the Definition of Done gate for all S1 cards

## Goal
Found during T-001: `pnpm lint` already reports 35 problems (31 errors, 4 warnings) in existing code (`src/services/*`, `src/features/test/*`, …). Every card's gate is `pnpm lint && pnpm test && pnpm build`, so the baseline must be clean before parallel work starts.

## Context to read
- Output of `pnpm lint`, then only the files it names
- `pm/agents/frontend-dev.md` (React Compiler rules)

## Steps
1. Run `pnpm lint` and save the list in the Agent log (counts per rule).
2. Fix each problem with the **smallest behavior-preserving** change:
   - unused vars/imports → remove (rename caught errors to `_err` or use `catch {}`)
   - react-hooks / react-compiler rules → restructure minimally. If a correct fix would change behavior that a later card owns (anti-cheat T-004, submit T-005, fullscreen T-006, timer T-008, navigation T-009), use **one** `// eslint-disable-next-line <rule> -- fixed in T-00x` on that line instead of changing logic.
3. Re-run `pnpm lint`, `pnpm test` and `pnpm build`. Click through login → dashboard → instructions → test → submit once (`pnpm dev`) to confirm nothing broke.

## Acceptance criteria
1. [ ] `pnpm lint` exits 0 (warnings allowed only if listed in the log with a reason).
2. [ ] No blanket disables (no file-level `/* eslint-disable */`, no rule turned off in `eslint.config.js`).
3. [ ] Every `eslint-disable-next-line` names the card that will remove it.
4. [ ] `pnpm test` and `pnpm build` pass. No functional change (manual smoke noted in the log).

## Verify
```bash
pnpm lint && pnpm test && pnpm build
```

## Out of scope
- Fixing the defects themselves (they have their own cards).

## Agent log

## Review
