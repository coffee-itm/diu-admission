# T-019 · Remove unused dependencies

Status: ⛔ Blocked (E-019)
Sprint: S1 · Role: devops · Model: free-ok · Size: S
Depends on: T-022
Implements: D-27 (deps part), context/17 §8

## Goal
Decision (Opus, S1 planning): **keep** `@tanstack/react-query` (adopted in S3 for the API layer). **Remove** `date-fns` (use `Intl.DateTimeFormat`; nothing imports it) and `jspdf-autotable` (unused; re-add only when a card needs it).

## Context to read
- `package.json`, `grep -rn "date-fns\|jspdf-autotable" src`

## Files
- `package.json`, `pnpm-lock.yaml`

## Steps
1. Confirm nothing imports them (grep). If something does, stop and escalate.
2. `pnpm remove date-fns jspdf-autotable`
3. pnpm ≥ 11 no longer reads `pnpm.onlyBuiltDependencies` in package.json (warning seen in T-001). Remove that field from package.json; `pnpm-workspace.yaml` already has the `allowBuilds` setting. Confirm the warning is gone.

## Acceptance criteria
1. [ ] Both removed from package.json and the lockfile.
2. [ ] `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm test` pass.

## Verify
```bash
pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build
```

## Out of scope
- Docs tables (T-020).

## Agent log
Escalated E-019: date-fns imported by uncommitted T-014 AnalyticsPage.jsx:8; no package changes made.

## Review
