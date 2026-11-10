# T-041 · Analytics: remove the Recharts width(-1)/height(-1) console warning

Status: 🔨 In Progress
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
1. [x] Loading `/admin/analytics` logs **zero** Recharts warnings, verified in a real browser on `pnpm dev` **and** on `pnpm build && pnpm preview`.
2. [x] All three charts still render at 360 px, 768 px and 1280 px.
3. [x] `pnpm lint` (0 warnings), `pnpm test`, `pnpm build` pass.

## Verify
```bash
pnpm lint && pnpm test && pnpm build
# then a browser pass over /admin/analytics with the console open
```

## Out of scope
- Chart redesign, new metrics, dark mode.

## Agent log
Root cause: Recharts' `ResponsiveContainer` logs the `width(-1)/height(-1)` warning from its *initial* render state, before the `ResizeObserver` ever fires — `initialDimension` defaults to `{width:-1, height:-1}` (recharts@3.8.1 `ResponsiveContainer.js:45,70-73`), and the `warn()` check (line 135) uses that calculated size, not the `minWidth`/`minHeight` CSS props. T-028's `minHeight={256}` only set a CSS floor on the container div; it never touched the value the warning checks, so it fired once per chart on every mount (3× in dev StrictMode-free preview, 6× in dev due to the double-invoked effect under React 19 dev mode).
Fix: added `initialDimension={{ width: 520, height: 256 }}` to each `ResponsiveContainer` in `ScoreBarChart.jsx`, `SectionPieChart.jsx`, `MeritLineChart.jsx` so the very first render already reports a positive size; the `ResizeObserver` then reconciles to the real measured size on the next tick. No height-prop/layout changes needed — the existing `h-64 min-h-64` wrapper from T-028 was already correct.
Verified with agent-browser (admin login `admin@diu.edu` / `Admin@1234`, mock mode): `pnpm dev` (5173) and `pnpm build && pnpm preview` (4173) — console cleared + reloaded on `/admin/analytics` on both, zero Recharts warnings either time (screenshots + `agent-browser console` dumps). All three charts render correctly at 360×800, 768×1024, 1280×900 (screenshots taken at each breakpoint, pie/bar/line all populated).
`pnpm lint` 0 warnings, `pnpm test` 31 files / 240 passed, `pnpm build` green (same pre-existing >500kB chunk warning, unrelated).
Files changed: `src/components/charts/ScoreBarChart.jsx`, `SectionPieChart.jsx`, `MeritLineChart.jsx` (one-line `initialDimension` prop each).

Status: 👀 Review
## Review
