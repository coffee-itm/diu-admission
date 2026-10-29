# 06 — Defect Register, Doc Gaps, Open Questions & Risks

> **Re-verified against the code on 2026-10-29** (commit `37dfd1d`). This replaces the earlier version of this file.
> Defect IDs (D-xx) are stable. Requirements in [13-srs.md](./13-srs.md) and tasks in
> [19-implementation-roadmap.md](./19-implementation-roadmap.md) cite them.
> Severity: **P0** breaks a core flow or produces a wrong result · **P1** feature broken or misleading · **P2** quality/hygiene.

---

## 1. Defect register (prototype)

| ID | Sev | Area | Defect | Evidence | Fix (task) |
|:--|:--|:--|:--|:--|:--|
| D-01 | P0 | Data | `q_logic_010` answer key is `b` (13) but the correct answer is `a` (15); the explanation even says so | `src/data/mockQuestions.js:24` | P0-02 |
| D-02 | P0 | Anti-cheat | Counters read stale store values (`store.tabSwitchCount + 1` inside an effect with `[]` deps), so the count never passes `initial+1`. The warning at 2, auto-submit at 5 tab switches, and auto-submit at 3 fullscreen exits **never fire** | `src/features/test/useAntiCheat.js:17,35,133` | P0-04 |
| D-03 | P0 | Anti-cheat | `onAutoSubmit` is captured at mount, so even when fired it would submit the mount-time (empty) answers | `useAntiCheat.js:6,20` + `src/pages/candidate/TestPage.jsx` | P0-04 |
| D-04 | P1 | Anti-cheat | Fullscreen is requested from a `useEffect`, not a user gesture, so browsers may reject it. iOS Safari has no Fullscreen API | `TestPage.jsx:70-72` | P0-05 |
| D-05 | P1 | Anti-cheat | `antiCheat` summary is added to the result in the test store only, **not** saved to `itm-results`, so the admin never sees security data | `src/features/test/useTestEngine.js:47-49`, `src/services/testService.js:26-42` | P0-06 |
| D-06 | P0 | Engine | The timer counts down by ticks in the persisted store, not from a wall-clock deadline. Closing the tab pauses the exam | `src/features/test/useTimer.js:14-16`, `testStore.tickTimer` | P0-07 |
| D-07 | P2 | Engine | First question never marked visited. Next/Prev stop at section boundaries. Section tabs don't mark visited | `useTestEngine.js:61-73`, `TestPage.jsx:96` | P0-08 |
| D-08 | P0 | Config | Admin Exam Config edits are never used: `testService.loadTest` reads `mockExamConfig`/`mockQuestions` directly | `src/services/testService.js:9-24` | P0-09 |
| D-09 | P1 | Scoring | The conditional tier hard-codes `40` and `<= 2`. `scoringConfig.js` and `getGrade` are unused. Classification uses the **rounded** percentage | `src/lib/scoring.js:53-63` | P0-03 |
| D-10 | P1 | Admin | Candidates and Merit List only show `mockCandidates`. Newly registered candidates are invisible | `src/pages/admin/CandidatesPage.jsx:28`, `MeritListPage.jsx:21-23` | P0-11 |
| D-11 | P1 | Admin | CSV import is a stub (waits 1.5 s, toasts "imported 25"). Merit-list CSV export is a toast only | `src/features/questions/BulkImportModal.jsx:11-20`, `MeritListPage.jsx:33-36` | P0-12 |
| D-12 | P0 | Engine | `maxAttempts` is never enforced. Visiting `/candidate/instructions` again allows a retake that appends a duplicate result | `useTestEngine.js:17-32`, `testService.js` | P0-10 |
| D-13 | P1 | Engine | No "Resume test" path. Starting again re-shuffles and resets the session | `src/pages/candidate/DashboardPage.jsx` | P0-10 |
| D-14 | P2 | Auth | `LoginPage` computes the redirect-back path but always goes to the role's dashboard | `src/pages/public/LoginPage.jsx:18,24` | P0-13 |
| D-15 | P1 | Auth | Logout clears only `authStore`. The test and anti-cheat state leak to the next user on the same browser | `src/features/auth/useAuth.js`, `src/store/authStore.js` | P0-10 |
| D-16 | P0 | Admin | Candidate detail calls `resultService.getResultForCandidate`, which doesn't exist (it's `getForCandidate`). The error is swallowed, so the spinner never stops | `src/pages/admin/CandidateDetailPage.jsx:32` | P0-11 |
| D-17 | P2 | UI | Hard-coded "50 questions / 54 minutes / 50 %" copy instead of reading the config | `src/pages/candidate/InstructionsPage.jsx:37,44`, `src/pages/candidate/DashboardPage.jsx:46-47` | P0-09 |
| D-18 | P2 | Analytics | `totalRegistrations` adds mock candidates and stored candidates, but the stored list already contains the mocks, so they're counted twice | `src/services/analyticsService.js:7-36` | P0-11 |
| D-19 | P2 | Question bank | Question form has no tags input | `src/features/questions/QuestionForm.jsx` | P0-13 |
| D-20 | P2 | Analytics | Trend line chart uses hard-coded fake data | `src/pages/admin/AnalyticsPage.jsx:53-60` | P0-13 |
| D-21 | P1 | Question bank | `questionStore` isn't persisted (edits lost on reload) and the test never reads it | `src/store/questionStore.js:5` | P0-09 |
| D-22 | P1 | Security | Passwords stored and compared in plaintext (`mockCandidates`, `diu-candidates`) | `src/services/authService.js`, `src/data/mockCandidates.js` | P2-02 (backend) |
| D-23 | P2 | Engine | `useAutoSave` only diffs snapshots into a ref. The real saving is done by zustand `persist`, so the hook does nothing on its own | `src/features/test/useAutoSave.js:13-25` | P0-07 / P4-08 |
| D-24 | P1 | Engine | `section.questionCount` is ignored. The whole bank is served (no sampling from a larger pool) | `testService.js:9-24` | P0-09 / P4-02 |
| D-25 | P2 | Admin | Merit list empty-state says "No eligible candidates" but lists all statuses. `replace('_',' ')` replaces only the first underscore | `src/pages/admin/MeritListPage.jsx` | P0-11 |
| D-26 | P2 | Admin | Admin dashboard recent table shows the raw `candidateId`, not the name | `src/pages/admin/DashboardPage.jsx` | P0-11 |
| D-27 | P2 | Hygiene | No test runner/tests/CI. Zod 3 `required_error` in a Zod 4 project. Unused deps `@tanstack/react-query`, `date-fns`, `jspdf-autotable` | `package.json`, `src/features/questions/questionSchema.js` | P0-01, P0-13 |
| D-28 | P2 | Hygiene | Storage keys still `itm-auth`, `itm-test-session`, `itm-anti-cheat`, `itm-exam-config`, `itm-results`, `itm-lang` (only `diu-candidates` was renamed in the pivot) | `src/store/*.js`, `testService.js`, `LanguageToggle.jsx` | P0-13 |
| D-29 | P1 | UX | Bilingual EN/BN (PRD Must) and dark mode are not implemented. `LanguageToggle` exists but isn't rendered anywhere | `src/components/ui/LanguageToggle.jsx`, `src/index.css:50` | P7-01…04 |

## 2. Doc-vs-code gaps

Files listed in `AGENTS.md` that **don't exist**:
- `src/services/api.js`
- `src/services/questionService.js`
- `src/features/scoring/useScoring.js`
- `src/lib/csvExport.js`
- `src/hooks/` (`useLocalStorage`, `useMediaQuery`, `useDebounce`)
- `public/fonts/`. Fonts load from Google Fonts in `index.html`.

The roadmap creates `api.js` (P2-05), `questionService.js` (P3-05) and `csvExport.js` (P0-12).
Create `hooks/` only when needed (for example `useDebounce` for search).

Files that **exist but AGENTS.md didn't list** (now listed): `src/store/antiCheatStore.js`,
`src/features/test/useAntiCheat.js`, `src/features/test/SecurityWarningModal.jsx`.
`src/components/ui/LanguageToggle.jsx` exists but is unused (D-29).

Spec conflicts, resolved by [13-srs.md](./13-srs.md):

| Topic | Old docs | Code | Resolution |
|:--|:--|:--|:--|
| Autosave interval | AGENTS 5 s, PRD 30 s | 5 s | **5 s** (FR-TEST-06) |
| Conditional tier | "< 40 % in 1–2 sections" (excludes 0, which creates a dead zone) | `failed <= 2` (includes 0, so there's no dead zone) | Code behavior is right. Configurable thresholds (FR-SCORE-04) |
| Per-section time | config has `timeMinutes` | ignored | Informational unless `enforceSectionTime` (FR-CFG-05, Could) |
| Anti-cheat | README "7 layers", guide 10 features | 10 present in code, 3 broken (D-02/03/05) | FR-AC-01…07 |
| Persistence | "PostgreSQL" (proposal, README roadmap) | none | **MongoDB** (ADR-013) |
| Mock data counts | old docs: 15 candidates, 10 results | 16 candidates + 1 admin, 15 results | Docs corrected |

## 3. Open product questions

Each has an **assumed default** that agents should build against. Confirm with the Office of Admissions.

| # | Question | Assumed default | Affects |
|:--|:--|:--|:--|
| Q1 | Result is an admission gate or advisory? | Advisory ("Recommendation: …") | FR-SCORE-07, UI copy |
| Q2 | Test mandatory for all applicants? | Yes, per cycle | Analytics validity |
| Q3 | Same thresholds for all programs? | Default 50/40, per-program overrides allowed | FR-CFG-02 |
| Q4 | 40–49 % with no failed section? | Conditionally Eligible (as the code does today) | FR-SCORE-04 |
| Q5 | Result shown immediately? | Configurable, default immediate | FR-CFG-01, FR-RES-01 |
| Q6 | Hosting: DIU on-prem or cloud? | Atlas Mumbai for the pilot; on-prem possible | [20](./20-deployment-ops.md) |
| Q7 | Retakes? | No (`maxAttempts 1`) | FR-TEST-01 |
| Q8 | Enforce GPA/science background? | Collect only; don't block | FR-AUTH-01 |
| Q9 | Who owns the system: the Office of Admissions or each department? | Office of Admissions = admin; departments = reviewers scoped to programs | FR-AUTH-10 |
| Q10 | Bank size before the first live cycle? | ≥ 3× served per section (≥ 30 per section for 10 served); target 100+ per section | FR-CFG-01 publish check |
| Q11 | Program-specific sections/weights? | Not in R2–R4 (same 5 sections for all) | Future |
| Q12 | Year-round availability or windows only? | Windows only (one published cycle at a time) | FR-CFG-03 |

## 4. Production risks

| Risk | Detail | Mitigation (where) |
|:--|:--|:--|
| Client-authoritative state | Answers, timer and score live in localStorage today and can be tampered with | Server-authoritative sessions (ADR-015, P4) |
| Client-side anti-cheat | Deters casual cheating only | Server-side counting + risk + review panel (FR-AC-05…07) |
| Question bank leak | 50 questions, every candidate sees all of them | Pool sampling + bank growth + publish check (Q10, FR-TEST-02) |
| Identity | No verification today | Email OTP (P6), SMS later |
| Peak load | ~30× volume after the university-wide pivot | Load test 2,000 concurrent (P8-02), replica set, 2+ API nodes |
| Connectivity | Rural 3G | Offline autosave queue, absolute deadline, small bundle (NFR-01) |
| Privacy | PII: name, phone, GPA | Minimal data, retention job, region choice, legal sign-off ([20 §6](./20-deployment-ops.md#6-security-checklist)) |
| Scoring disputes | Result is high-stakes | Pure shared scoring + boundary tests + snapshots + recompute audit (FR-SCORE-*) |
| Mobile fullscreen | iOS has no Fullscreen API | Skip + log on unsupported browsers (FR-AC-04) |
