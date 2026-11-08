# T-041 · Analytics: remove the Recharts width(-1)/height(-1) console warning

Status: ✅ Ready
Sprint: S3 · Role: frontend-dev · Model: lite · Size: S
Tier rationale: single-component sizing fix; the failure mode is a visible console warning (loud) (PROCESS §2.3)
Depends on: —
Implements: S1 carry-over, re-confirmed by T-040 QA item 5

## Goal
`/admin/analytics` logs the Recharts warning `The width(-1) and height(-1) of chart should be greater than 0` three times on load. Give every `ResponsiveContainer` a real height so the warning never appears, on the dev server and on a production build.

## Context to read
- `pm/tasks/T-040-s2-qa.md` item 5 (the evidence and the exact count)
- `src/pages/admin/AnalyticsPage.jsx`, `src/components/charts/*.jsx`

## Files
- `src/components/charts/{ScoreBarChart,SectionPieChart,MeritLineChart}.jsx` and/or `src/pages/admin/AnalyticsPage.jsx`: give each chart wrapper an explicit height (a fixed `h-*` on the parent, or `minHeight` on `ResponsiveContainer`). T-028 already set chart heights — find why these three still render at -1 before changing anything.

## Acceptance criteria
1. [ ] Loading `/admin/analytics` logs **zero** Recharts warnings, verified in a real browser on `pnpm dev` **and** on `pnpm build && pnpm preview`.
2. [ ] All three charts still render at 360 px, 768 px and 1280 px.
3. [ ] `pnpm lint` (0 warnings), `pnpm test`, `pnpm build` pass.

## Verify
```bash
pnpm lint && pnpm test && pnpm build
# then a browser pass over /admin/analytics with the console open
```

## Out of scope
- Chart redesign, new metrics, dark mode.

## Agent log

## Review
