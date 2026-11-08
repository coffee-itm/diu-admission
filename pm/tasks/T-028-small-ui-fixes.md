# T-028 · Small UI fixes: question ID, auth-page redirect, section-tab cue, chart height

Status: ✔️ Done
Sprint: S2 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: none
Implements: S1 post-merge E2E findings (Low) and S1 carry-over (Recharts warning)

## Goal
Four small, independent fixes:
1. The question bank ID column shows `q.id.slice(-6)`, so `q_math_001` appears as "th_001". Show the full ID.
2. A logged-in user can open `/register` (and `/login`) and create another account. Redirect logged-in users away from these pages to their dashboard.
3. At 360 px the section tabs scroll sideways with a hidden scrollbar, and there's no sign that more tabs exist. Add a visible cue.
4. Recharts logs "width(-1)/height(-1)" on Analytics. Give each chart container a fixed min height.

## Context to read
- `src/features/questions/QuestionTable.jsx:33`
- `src/pages/public/RegisterPage.jsx` and `LoginPage.jsx`; `src/features/auth/resolvePostLoginPath.js`: how the dashboard path is chosen by role
- `src/features/test/SectionHeader.jsx`: the `hide-scrollbar` container
- `src/components/charts/ScoreBarChart.jsx`, `SectionPieChart.jsx`, `MeritLineChart.jsx`: `ResponsiveContainer`

## Files
- `src/features/questions/QuestionTable.jsx` (modify): render the full `q.id`. Use `truncate`/`title` if it's too wide.
- `src/pages/public/RegisterPage.jsx` and `src/pages/public/LoginPage.jsx` (modify): when `isAuthenticated`, render `<Navigate replace>` to `resolvePostLoginPath(undefined, user.role)`.
- `src/features/test/SectionHeader.jsx` (modify): a right-edge fade or gradient overlay, or a visible thin scrollbar on small screens. CSS only, no new state.
- `src/components/charts/*.jsx` (modify): the parent wrapper gets an explicit height, and `ResponsiveContainer` gets `minHeight={...}` / `minWidth={0}`.
- Tests: a QuestionTable test for the full ID, and a test that RegisterPage/LoginPage redirect when authenticated.

## Acceptance criteria
1. [ ] QuestionTable shows `q_math_001` in full. Covered by a test.
2. [ ] With an authenticated candidate, `/register` and `/login` redirect to the candidate dashboard. An admin is sent to the admin dashboard. Covered by a test.
3. [ ] ⚠️ Browser (T-040): at 360 px a cue shows that more section tabs exist.
4. [ ] ⚠️ Browser (T-040): Analytics logs no Recharts width/height warning.
5. [ ] No new lint warnings.

## Verify
```bash
pnpm test -- QuestionTable RegisterPage LoginPage && pnpm lint && pnpm build
```

## Out of scope
- Adding missing `id`s (T-031). Dark mode and i18n (S7).

## Agent log
- QuestionTable: full `q.id` (was `slice(-6)`), `whitespace-nowrap` + `title`; test added.
- RegisterPage/LoginPage: `<Navigate replace>` to `resolvePostLoginPath(undefined, user.role)` when authenticated; tests for candidate + admin on both pages.
- SectionHeader: CSS-only right-edge white gradient + chevron cue, `sm:hidden`; no state.
- Charts: wrappers `h-64 min-h-64 min-w-0`, `ResponsiveContainer minWidth={0} minHeight={256}`.
- Tests: 200 total (198 passed, 2 todo) — full suite run. Lint: only baseline TestPage warning (T-030). Build ✅.
- Criteria 3 & 4 are browser-only → not verified here; T-040 QA.
- Files: QuestionTable, RegisterPage, LoginPage (+ tests), SectionHeader, 3 chart components.

## Review
**APPROVED** (reviewer, commit 720e02c)
1. Full ID: QuestionTable.jsx:33 + test QuestionTable.test.jsx. OK.
2. Redirects: LoginPage.jsx:19-21, RegisterPage.jsx:31-33 (after all hooks, so hook order is safe); candidate and admin tests on both pages. OK.
3. Tab cue (browser, T-040): SectionHeader.jsx right-edge gradient and chevron, `sm:hidden`, `pointer-events-none`, `aria-hidden`, CSS only. Plausible. Gradient is hard-coded `from-white` (fine until dark mode in S7).
4. Charts (browser, T-040): wrappers `h-64 min-h-64 min-w-0` plus `ResponsiveContainer minWidth={0} minHeight={256}` in all 3 charts. Plausible.
5. Lint and tests: coordinator gate clean (210 passed). I re-ran the 3 target test files: pass.
Non-blocking note for T-040: after a successful login the new `<Navigate>` could race the `from` redirect in LoginPage `handleSubmit`. Check that a deep link still lands on the requested page.
