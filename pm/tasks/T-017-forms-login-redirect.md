# T-017 · Tags field, Zod 4 error params, login redirect-back

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-022
Implements: FR-QB-06, FR-AUTH-09, D-14, D-19, D-27 (Zod part)

## Goal
Three small fixes: the question form can't edit tags; `questionSchema.js` uses the Zod 3 `required_error` option; login ignores the page the user originally asked for.

## Context to read
- `src/features/questions/QuestionForm.jsx`, `src/features/questions/questionSchema.js`, `src/pages/public/LoginPage.jsx:10-30`

## Files
- `src/features/questions/questionSchema.js` — replace `required_error: '…'` with Zod 4 `{ error: '…' }`. `tags`: array of trimmed lowercase strings, max 10
- `src/features/questions/QuestionForm.jsx` — tags input (`id="question-tags"`), comma-separated text ↔ array, shown as chips in the live preview
- `src/pages/public/LoginPage.jsx` — after login: if `from` starts with `/admin` and the role is admin, or starts with `/candidate` and the role is candidate → `navigate(from)`. Otherwise the role's dashboard
- `src/features/questions/questionSchema.test.js`, `src/pages/public/LoginPage.test.jsx` — create (redirect logic can be extracted to a pure `resolvePostLoginPath(from, role)` in `src/features/auth/` and tested directly)

## Acceptance criteria
1. [ ] `grep -rn required_error src` → nothing.
2. [ ] Tags save and reload in the edit form.
3. [ ] `resolvePostLoginPath` tests: admin+`/admin/merit-list` → itself; candidate+`/admin/...` → candidate dashboard; `/` → dashboard.

## Verify
```bash
pnpm test -- questionSchema resolvePostLoginPath && pnpm lint && pnpm build
```

## Out of scope
- New registration fields (R2).

## Agent log
- Zod 4 `{ error }` in questionSchema; tags = trimmed/lowercased, max 10.
- QuestionForm: `question-tags` comma input (Controller) + chip preview; initial value from defaultValues so edit reloads tags.
- New `src/features/auth/resolvePostLoginPath.js` (+test); LoginPage uses `location.state.from.pathname`. Card's LoginPage.test.jsx skipped; logic tested via pure fn.
- lint, 90 tests, build pass.

## Review
**APPROVED** (reviewer)
- AC1: no `required_error` in src. AC2: QuestionFormPage.jsx passes full `initialData` (getById) -> QuestionForm `defaultValues`, TagsInput seeds from `field.value` (QuestionForm.jsx:~33,115). AC3: resolvePostLoginPath.test.js covers all cases + lookalike prefix.
- LoginPage.jsx:23 uses `resolvePostLoginPath(location.state?.from?.pathname, user.role)`; ProtectedRoute sets `state.from = location`. Correct.
- eslint clean on touched files, 94 tests pass, build OK. Note: LoginPage.test.jsx skipped (allowed by card's pure-fn option).
