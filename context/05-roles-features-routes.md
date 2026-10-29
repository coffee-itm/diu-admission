# 05 — Roles, Features & Routes

> Current status verified against the code on 2026-10-29. Target pages and endpoints: [17 §2](./17-frontend-spec.md#2-routes--pages) and [15](./15-api-spec.md).

---

## Roles

| Role | Current | Target |
|:---|:---|:---|
| `candidate` | Register (RHF + Zod) → auto-login → dashboard → instructions → test → result | Same + email OTP verification before starting (FR-AUTH-05) |
| `admin` | Seeded `admin@diu.edu` / `Admin@1234`, full panel | Office of Admissions. Creates reviewers/admins (FR-AUTH-10) |
| `reviewer` | **Not implemented** | Read-only admin subset, scoped to `programCodes` (PRD persona Kamal) |

Auth today: `authService` (mock, plaintext) → `authStore` (`itm-auth`). `AuthProvider` is a pass-through.
`ProtectedRoute role=…` guards subtrees. Target: JWT + refresh cookie (ADR-016), and the server enforces the same RBAC.

## Route table with current status

| Route | Page | Current status | Target notes |
|:--|:--|:--|:--|
| `/` | LandingPage | ✅ | Data from `/cycles/current`, `/programs` |
| `/login` | LoginPage | ⚠️ ignores redirect-back (D-14) | — |
| `/register` | RegisterPage | ✅ name, email, phone, program, password | + GPA, HSC group; then `/verify-email` |
| `/verify-email` | — | ❌ new | OTP |
| `/forgot-password` | — | ❌ new | Should |
| `/candidate/dashboard` | DashboardPage | ⚠️ hard-coded 54/50 (D-17), no Resume (D-13) | Status card incl. Resume |
| `/candidate/instructions` | InstructionsPage | ⚠️ hard-coded copy (D-17), retake allowed (D-12) | Fullscreen in the Start click |
| `/candidate/test` | TestPage | ⚠️ see [04](./04-test-engine-anticheat.md) | Server session |
| `/candidate/result` | ResultPage | ✅ + PDF | "Recommendation:", release policy |
| `/admin/dashboard` | DashboardPage | ⚠️ ids instead of names (D-26), double count (D-18) | — |
| `/admin/questions` | QuestionBankPage | ⚠️ in-memory only (D-21), import stub (D-11) | Server pagination, status, CSV |
| `/admin/questions/new`, `/:id/edit` | QuestionFormPage | ⚠️ no tags field (D-19) | + Bangla fields, status |
| `/admin/exam-config` | ExamConfigPage | ⚠️ saved but never used (D-08) | Cycles, overrides, lock |
| `/admin/candidates` | CandidatesPage | ⚠️ mocks only (D-10) | Filters, pagination |
| `/admin/candidates/:id` | CandidateDetailPage | ❌ infinite spinner (D-16) | + security report, review |
| `/admin/merit-list` | MeritListPage | ⚠️ mocks only, CSV stub, label bug (D-10, D-11, D-25) | Per program, CSV/PDF |
| `/admin/analytics` | AnalyticsPage | ⚠️ fake trend (D-20) | Filters, per program |
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

- **features/auth:** `useAuth` (login/register/logout + toasts), `AuthProvider` (no-op), `ProtectedRoute` (role gate).
- **features/test:** see [04](./04-test-engine-anticheat.md).
- **features/questions:** `QuestionTable` (truncated text, section, difficulty; edit/delete with `window.confirm`), `QuestionForm` (RHF + Zod, live preview, no tags), `BulkImportModal` (**stub**), `questionSchema.js`.
- **features/scoring:** `ScoreCard`, `EligibilityBadge` (colour + icon), `scoringConfig.js` (unused).
- **services:** `authService`, `testService`, `resultService`, `analyticsService` (mock latency 200–800 ms). No `api.js`/`questionService.js`.
- **lib:** `scoring.js`, `pdfGenerator.js` (jsPDF; header hard-codes "Spring 2026"), `utils.js` (shuffle, formatters, ids), `constants.js` (programs, sections, routes, anti-cheat config).

## MoSCoW status (PRD Must-haves)

| Must-have ([12 §6](./12-prd.md#6-feature-scope-moscow)) | Prototype |
|:--|:--|
| Registration + auth | ⚠️ mock, plaintext, no OTP |
| Test engine (timer, sections, nav, flags, grid) | ⚠️ works, with D-02…D-07 |
| Autosave + resume | ⚠️ same browser only |
| Randomized questions from the pool | ⚠️ shuffled, no sampling |
| Scoring + eligibility | ✅ (configurable thresholds pending, D-09) |
| Result page + PDF | ✅ |
| Question bank CRUD + import | ⚠️ in-memory, import stub |
| Exam config | ⚠️ not applied |
| Candidates / merit list / analytics | ⚠️ mocks only, CSV stub |
| Anti-cheat + admin review | ⚠️ thresholds broken, review unreachable |
| Responsive 360 px | ✅ |
| Bilingual EN/BN, dark mode | ❌ (D-29) |
