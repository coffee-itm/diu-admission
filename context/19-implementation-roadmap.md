# 19 — Implementation Roadmap (agent task list)

> **How to use:** Work phases in order. Inside a phase, tasks without a dependency can run in parallel.
> Each task lists **files**, the requirements it satisfies (FR/NFR in [13](./13-srs.md), defects D-xx in [06](./06-open-issues-doc-gaps.md)),
> and a **Done when** check. Also apply the Definition of Done in [18 §6](./18-testing-strategy.md#6-definition-of-done-every-task-in-19).
> Mark progress by ticking boxes in this file in the same PR.

| Phase | Goal | Release |
|:--|:--|:--|
| P0 | Make the prototype correct + add a test harness | R1 |
| P1 | Workspace, shared package, server skeleton | R2 |
| P2 | Auth & users | R2 |
| P3 | Programs, question bank, exam cycles | R2 |
| P4 | Server-authoritative test sessions + scoring | R2 |
| P5 | Results, merit list, analytics, security review | R2 |
| P6 | OTP, password reset, notifications | R3 |
| P7 | i18n (EN/BN), dark mode, a11y, performance | R3 |
| P8 | Hardening, load test, deployment | R3/R4 |

---

## P0 — Prototype fixes (frontend only, still mock data)

- [x] **P0-01 Test harness.** Add Vitest + RTL + jsdom, `src/test/setup.js`, and the `test` script. *Done when* `pnpm test` runs one sample test. (ADR-018)
- [x] **P0-02 Answer key.** `src/data/mockQuestions.js:24`: set `q_logic_010.correctAnswer` to `'a'` and clean up the explanation text. (FR-QB-07, D-01)
- [x] **P0-03 Scoring correctness.** `src/lib/scoring.js`: read `conditionalMinPercent` / `maxFailedSectionsForConditional` from config, with defaults from `src/features/scoring/scoringConfig.js`. Compare unrounded values. Add the boundary-table tests S1–S11. (FR-SCORE-03/04, D-09)
- [x] **P0-04 Anti-cheat counters + auto-submit.** `src/features/test/useAntiCheat.js`: read the fresh count via `useAntiCheatStore.getState()` inside handlers. Keep `onAutoSubmit` in a ref updated every render. Add a `cut_attempt` counter. In `src/features/test/useTestEngine.js`, `submitTest` reads `useTestStore.getState()`. Add the regression tests. (FR-AC-02/03, D-02, D-03)
- [x] **P0-05 Fullscreen on gesture.** Move `requestFullscreen` from `TestPage.jsx` (effect at `:70-72`) into the Start button handler in `InstructionsPage.jsx`. Add "Return to fullscreen" to `SecurityWarningModal`. Handle iOS (log `fullscreen_unsupported`). (FR-AC-04, D-04)
- [x] **P0-06 Persist anti-cheat summary.** `src/services/testService.js` `submitTest` stores `antiCheat` in the `itm-results` record. (D-05)
- [x] **P0-07 Wall-clock timer.** `testStore` stores `deadline` (ms). `useTimer` computes `deadline − Date.now()`. Remove `tickTimer`-based counting. (FR-TEST-03 prototype version, D-06)
- [x] **P0-08 Navigation.** Mark the first question visited on start and on section tab change. Next/Prev cross sections. (FR-TEST-04, D-07)
- [x] **P0-09 Config actually used.** `testService.loadTest` reads `useExamConfigStore.getState().config` and `useQuestionStore`. Persist `questionStore` (`diu-questions`). Sample `questionCount` per section from the bank. Replace the hard-coded "50"/"54"/"50%" in `InstructionsPage.jsx:37,44` and `candidate/DashboardPage.jsx:46-47`. (FR-CFG-04, D-08, D-17, D-21, D-24)
- [x] **P0-10 Single attempt + resume + logout.** Block start if a result exists for the user (`maxAttempts`). The dashboard shows Resume when a session is active and not submitted. Logout resets test and anti-cheat stores. (FR-TEST-07/12, FR-AUTH-04, D-12, D-13, D-15)
- [x] **P0-11 Admin data fixes.**
  - `CandidateDetailPage.jsx:32` → `resultService.getForCandidate` (D-16).
  - Candidates/MeritList read candidates from `authService` storage, not `mockCandidates` (D-10).
  - Analytics `totalRegistrations` counts unique ids (D-18).
  - Dashboard shows names (D-26).
  - Merit list empty text + `replaceAll('_',' ')` (D-25).
- [x] **P0-12 CSV.** New `src/lib/csvExport.js` (BOM, escaping) used by MeritListPage. `BulkImportModal` really parses the CSV (the [15 §7](./15-api-spec.md#7-csv-formats) format), validates with `questionSchema`, adds rows to `questionStore`, and shows a row error report. (FR-RES-06, FR-QB-04, D-11)
- [x] **P0-13 Misc.**
  - Question form tags field (D-19).
  - LoginPage redirect to `from` (D-14).
  - Zod 4 `error` param in `questionSchema.js` (D-27).
  - Rename the `itm-*` storage keys to `diu-*` (D-28).
  - Real per-day trend from results (D-20).
  - Remove or adopt the unused deps per [17 §8](./17-frontend-spec.md#8-dependency-hygiene).
- [ ] **P0-14 Docs sync.** Update AGENTS.md "Scoring Engine" rules and the README anti-cheat claims to match.

**Exit P0:** `pnpm lint && pnpm test && pnpm build` green. Manual demo of J1/J2 with no console errors.

## P1 — Workspace & server skeleton

- [ ] **P1-01 Workspace.** `pnpm-workspace.yaml` gets `packages: ['.', 'server', 'packages/*']` (keep `allowBuilds`). Create `packages/shared` (`@diu/shared`) and `server` (`@diu/server`) package.json files. Add the root scripts per [16 §1](./16-backend-architecture.md#1-repository-layout-pnpm-workspace). (ADR-019)
- [ ] **P1-02 Shared package.** Move `scoring.js` into `packages/shared` with `classify`/`resolveThresholds`. Add `risk.js`, `shuffle.js`, `constants.js` (moved from `src/lib/constants.js` where domain-level), and Zod schemas. The frontend imports from `@diu/shared`. Tests move with the code. *Done when* frontend tests and build still pass.
- [ ] **P1-03 Server bootstrap.** `app.js`/`server.js`/`config.js`, plugins (mongoose, security, errors, zod), `/health` + `/ready`, pino logging, graceful shutdown. *Done when* `pnpm dev:server` starts and `GET /api/v1/ready` reports `db: ok` against a local replset.
- [ ] **P1-04 Test helpers.** `server/test/helpers/app.js` with `mongodb-memory-server` replset plus factories. One passing `/health` test.
- [ ] **P1-05 Dev infra.** `docker-compose.yml` with `mongo:7` as a single-node replset (`--replSet rs0` + init script). `server/.env.example`. Vite proxy `/api`.
- [ ] **P1-06 CI.** `.github/workflows/ci.yml` per [18 §5](./18-testing-strategy.md#5-ci-github-actions-githubworkflowsciyml).

## P2 — Auth & users

- [ ] **P2-01 User model** + `programs` model + seed for programs and the admin. ([14 §3.1–3.2](./14-database-schema.md#3-schemas))
- [ ] **P2-02 Auth module.** Register/login/refresh/logout/me, argon2id, JWT, refresh rotation + reuse detection, lockout, rate limits. (FR-AUTH-01/02/03/04/08/10, ADR-016)
- [ ] **P2-03 RBAC helpers.** `authenticate`, `requireRole`, `programScope`. RBAC matrix test skeleton.
- [ ] **P2-04 Admin users endpoints.** Create reviewer/admin, assign programs, can't demote the last admin. Audit log. (FR-AUTH-10)
- [ ] **P2-05 Frontend auth.** `src/services/api.js` (fetch wrapper with refresh), react-query provider, `authService` → API, token in memory, `authStore` rework, `VITE_USE_MOCKS` switch. (17 §3–4)

## P3 — Programs, question bank, exam cycles

- [ ] **P3-01 Question model + admin CRUD + lifecycle + search/filters/pagination.** (FR-QB-01/02/03)
- [ ] **P3-02 CSV import (dry run) / export.** (FR-QB-04)
- [ ] **P3-03 ExamCycle model + endpoints** (create/edit/publish/close, lock rule, pool sizes, program overrides). `GET /cycles/current`. (FR-CFG-01/02/03)
- [ ] **P3-04 Seed script** for questions/cycle/demo candidates/results. ([14 §5](./14-database-schema.md#5-seeding-serverscriptsseedjs))
- [ ] **P3-05 Frontend:** `questionService`, `examCycleService`, and the QuestionBank/QuestionForm/ExamConfig pages on react-query. Remove `questionStore`/`examConfigStore`.

## P4 — Test sessions (core)

- [ ] **P4-01 TestSession model + indexes.** ([14 §3.5](./14-database-schema.md#35-testsessions-the-core-document))
- [ ] **P4-02 Start** (`POST /sessions`): eligibility checks, served-paper sampling in a transaction, candidate projection without keys, cycle lock. (FR-TEST-01/02, FR-CFG-03)
- [ ] **P4-03 Get/resume** (`GET /sessions/current`), lazy expiry, `resumeCount`. (FR-TEST-07/09)
- [ ] **P4-04 Autosave** (`PATCH …/state`) with `seq`, events, risk recompute, server-side auto-submit. (FR-TEST-06/10, FR-AC-05/06)
- [ ] **P4-05 Submit + scoring + result insert** (idempotent). (FR-TEST-08, FR-SCORE-01…05)
- [ ] **P4-06 Expiry job.** (FR-TEST-09)
- [ ] **P4-07 Answer-key secrecy test suite.** (NFR-06)
- [ ] **P4-08 Frontend test engine on the API:** `testService` start/resume/save/submit, clock offset, offline queue + backoff, `pagehide` beacon, save indicator, server `autoSubmitted` handling. (FR-TEST-03…08, 17 §5)

## P5 — Results, merit, analytics, security review

- [ ] **P5-01 `GET /results/me`** + release policy. Result page + PDF on the API (dynamic cycle title). (FR-RES-01/02, FR-SCORE-07)
- [ ] **P5-02 Admin candidates list/detail/security endpoints** with reviewer scoping. (FR-RES-03/04)
- [ ] **P5-03 Merit list endpoint + CSV** (aggregation with `$rank`). Frontend program selector, CSV/PDF. (FR-RES-05/06)
- [ ] **P5-04 Analytics summary** (`$facet`) + frontend filters + real trend. (FR-ANL-01…04)
- [ ] **P5-05 Security review panel** (list + review decision + disqualify + audit). New `/admin/security` page. (FR-AC-07)
- [ ] **P5-06 Recompute results.** (FR-SCORE-06)
- [ ] **P5-07 Users page** (`/admin/users`). (FR-AUTH-10)

**Exit R2:** E2E specs 1, 2, 4, 5, 6 pass against the real API. No business logic is authoritative in localStorage.

## P6 — OTP & notifications

- [ ] **P6-01 OTP model/service**, mailer (SMTP + console), `/auth/otp/send|verify`. `EMAIL_NOT_VERIFIED` gate on start. (FR-AUTH-05)
- [ ] **P6-02 VerifyEmail page**, resend cooldown UI.
- [ ] **P6-03 Password reset** flow + page. (FR-AUTH-06)
- [ ] **P6-04 SMS driver interface** + one BD provider adapter (Could). (FR-AUTH-07)

## P7 — i18n, theming, a11y, performance

- [ ] **P7-01 i18n skeleton** (`src/i18n`, `useT`, `uiStore`, LanguageToggle in Header, Bangla font). (FR-I18N-01, ADR-017)
- [ ] **P7-02 Extract strings** on candidate pages and translate to Bangla. Admin pages in English with keys. (FR-I18N-02)
- [ ] **P7-03 Bangla question text support** (`textBn`) in form, API and test UI. (FR-I18N-03)
- [ ] **P7-04 Dark mode** (`@custom-variant dark`, toggle, `dark:` variants, chart colours). (FR-I18N-04)
- [ ] **P7-05 a11y pass**: keyboard answering, focus management in dialogs, `aria-live` timer, axe E2E clean. (NFR-08)
- [ ] **P7-06 Performance**: lazy admin routes, dynamic `jspdf`, no framer-motion on the test page, bundle check ≤ 300 KB gz on the candidate path (`rollup-plugin-visualizer`). (NFR-01)

## P8 — Hardening & deployment

- [ ] **P8-01 Security review** (OWASP checklist in [20 §6](./20-deployment-ops.md#6-security-checklist)), dependency audit, CSP.
- [ ] **P8-02 Load test** to 2,000 concurrent sessions; tune indexes/pool size. ([18 Load test](./18-testing-strategy.md#load-test), NFR-02/03)
- [ ] **P8-03 Deploy** staging + production per [20](./20-deployment-ops.md). Backups + restore drill. Monitoring + alerts. Exam-day runbook rehearsal.
- [ ] **P8-04 Pilot** with one program (R3 exit), then university rollout (R4).

---

## Requirement → task traceability

| Requirement group | Tasks |
|:--|:--|
| FR-AUTH-01…04, 08, 10 | P2-02…P2-05 |
| FR-AUTH-05…07 | P6-01…P6-04 |
| FR-AUTH-09 | P0-13 |
| FR-CFG-01…03 | P3-03 |
| FR-CFG-04 | P0-09 |
| FR-CFG-05 | backlog (Could) |
| FR-QB-01…04 | P3-01, P3-02 (prototype import P0-12) |
| FR-QB-05 | backlog (Should) |
| FR-QB-06, 07 | P0-13, P0-02 |
| FR-TEST-01…10 | P4-02…P4-08 (prototype versions P0-07…P0-10) |
| FR-TEST-11, 12 | existing, P0-10 |
| FR-AC-01…04 | P0-04, P0-05 |
| FR-AC-05…07 | P4-04, P5-05 |
| FR-SCORE-01…05, 07 | P0-03, P1-02, P4-05, P5-01 |
| FR-SCORE-06 | P5-06 |
| FR-RES-01…06 | P0-11, P0-12, P5-01…P5-03 |
| FR-ANL-01…04 | P0-11, P0-13, P5-04 |
| FR-ANL-05 | backlog (Could) |
| FR-I18N-01…05 | P7-01…P7-04 |
| NFR-01, 08 | P7-05, P7-06 |
| NFR-02…05, 12 | P8-02, P8-03 |
| NFR-06, 07 | P2-02, P4-07, P8-01 |
| NFR-11 | P0-01, P1-04, every task |
