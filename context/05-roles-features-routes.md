# 05 — Roles, Features & Routes

> Current status verified against the code on 2026-10-29. Target pages and endpoints: [17 §2](./17-frontend-spec.md#2-routes--pages) and [15](./15-api-spec.md).

---

## Roles

| Role | Current | Target |
|:---|:---|:---|
| `candidate` | Register (RHF + Zod) → auto-login → dashboard → instructions → test → result | Same + email OTP verification before starting (FR-AUTH-05) |
| `admin` | Seeded `admin@diu.edu` / `Admin@1234`, full panel | Office of Admissions. Creates reviewers/admins (FR-AUTH-10) |
| `reviewer` | **Not implemented** | Read-only admin subset, scoped to `programCodes` (PRD persona Kamal) |

Auth today: `authService` (mock, plaintext) → `authStore` (`diu-auth`). `AuthProvider` is a pass-through.
`ProtectedRoute role=…` guards subtrees. Target: JWT + refresh cookie (ADR-016), and the server enforces the same RBAC.

## Route table with current status

| Route | Page | Current status | Target notes |
|:--|:--|:--|:--|
| `/` | LandingPage | ✅ | Data from `/cycles/current`, `/programs` |
| `/login` | LoginPage | ✅ redirects back to the requested page (D-14 fixed in S1) | — |
| `/register` | RegisterPage | ✅ name, email, phone, program, password | + GPA, HSC group; then `/verify-email` |
| `/verify-email` | — | ❌ new | OTP |
| `/forgot-password` | — | ❌ new | Should |
| `/candidate/dashboard` | DashboardPage | ✅ config-driven copy (D-17), Resume button (D-13) fixed in S1 | Status card incl. Resume |
| `/candidate/instructions` | InstructionsPage | ✅ config-driven copy (D-17), one attempt (D-12), fullscreen on Start click (T-006) | Fullscreen in the Start click |
| `/candidate/test` | TestPage | ⚠️ see [04](./04-test-engine-anticheat.md) | Server session |
| `/candidate/result` | ResultPage | ✅ + PDF (title from exam config) | "Recommendation:", release policy |
| `/admin/dashboard` | DashboardPage | ✅ names shown (D-26), no double count (D-18) fixed in S1 | — |
| `/admin/questions` | QuestionBankPage | ⚠️ bank persisted in localStorage (D-21 fixed); CSV import with error report (D-11 fixed) | Server pagination, status, CSV |
| `/admin/questions/new`, `/:id/edit` | QuestionFormPage | ✅ tags field (D-19 fixed in S1) | + Bangla fields, status |
| `/admin/exam-config` | ExamConfigPage | ✅ applied by the test engine (D-08 fixed in S1) | Cycles, overrides, lock |
| `/admin/candidates` | CandidatesPage | ✅ all registered candidates (D-10 fixed in S1) | Filters, pagination |
| `/admin/candidates/:id` | CandidateDetailPage | ✅ loads; shows result and security report (D-16 fixed in S1) | + review decision |
| `/admin/merit-list` | MeritListPage | ✅ all registered candidates, CSV export (D-10, D-11, D-25 fixed in S1) | Per program, CSV/PDF |
| `/admin/analytics` | AnalyticsPage | ✅ real per-day trend (D-20 fixed in S1) | Filters, per program |
| `/admin/security` | — | ❌ new | Review panel (FR-AC-07) |
| `/admin/users` | — | ❌ new | Reviewer management |
| `*` | NotFoundPage | ✅ | — |

Sidebar (`src/components/layout/Sidebar.jsx:7-12`): Dashboard, Question Bank, Exam Config, Candidates, Merit List, Analytics.
Target adds Security Review and Users. Question Bank and Users are hidden from reviewers.

## Access matrix (target, enforced on the server)

| Capability | candidate | reviewer | admin |
|:--|:--|:--|:--|
| Take test, see own result | ✅ | — | — |
| View dashboard/analytics | — | ✅ (own programs) | ✅ |
| View candidates/results/merit list | — | ✅ (own programs) | ✅ |
| Export CSV/PDF | own PDF | ✅ (own programs) | ✅ |
| View security report | — | ✅ (own programs) | ✅ |
| Review decision (clear/disqualify) | — | — | ✅ |
| Question bank CRUD/import | — | — | ✅ |
| Exam cycle create/publish/close/recompute | — | read-only | ✅ |
| Manage users | — | — | ✅ |

## Feature inventory by module (current)

- **features/auth:** `useAuth` (login/register/logout + toasts), `AuthProvider` (no-op), `ProtectedRoute` (role gate), `resolvePostLoginPath` (redirect-back).
- **features/test:** see [04](./04-test-engine-anticheat.md).
- **features/questions:** `QuestionTable` (truncated text, section, difficulty; edit/delete with `window.confirm`), `QuestionForm` (RHF + Zod, live preview, tags), `BulkImportModal` (CSV import with preview and row error report, `importQuestions.js`), `questionSchema.js`.
- **features/scoring:** `ScoreCard`, `EligibilityBadge` (colour + icon), `scoringConfig.js` (defaults used by `scoring.js`).
- **services:** `authService`, `testService`, `resultService`, `analyticsService` (mock latency 200–800 ms). No `api.js`/`questionService.js`.
- **lib:** `scoring.js`, `pdfGenerator.js` (jsPDF; title from the exam config), `csvExport.js` + `csvParse.js` + `meritCsv.js` (CSV export/import, merit rows), `fullscreen.js`, `storageMigration.js` + `runStorageMigration.js` (`itm-*` → `diu-*`), `utils.js` (shuffle, formatters, ids), `constants.js` (programs, sections, routes, storage keys, anti-cheat config).

## MoSCoW status (PRD Must-haves)

| Must-have ([12 §6](./12-prd.md#6-feature-scope-moscow)) | Prototype |
|:--|:--|
| Registration + auth | ⚠️ mock, plaintext, no OTP |
| Test engine (timer, sections, nav, flags, grid) | ✅ works; D-02…D-07 fixed in S1, still client-side |
| Autosave + resume | ⚠️ same browser only (resume button added in S1) |
| Randomized questions from the pool | ✅ shuffled and sampled per section (D-24 fixed in S1), client-side |
| Scoring + eligibility | ✅ (configurable thresholds, D-09 fixed in S1) |
| Result page + PDF | ✅ |
| Question bank CRUD + import | ⚠️ works in localStorage; CSV import with error report (D-11 fixed in S1) |
| Exam config | ✅ applied by the test engine (D-08 fixed in S1), localStorage only |
| Candidates / merit list / analytics | ⚠️ stored candidates and real CSV export (D-10, D-11 fixed in S1); no server aggregation |
| Anti-cheat + admin review | ⚠️ thresholds fixed (D-02/03/05 in S1); no review panel yet |
| Responsive 360 px | ✅ |
| Bilingual EN/BN, dark mode | ❌ (D-29) |
