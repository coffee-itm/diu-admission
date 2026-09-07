# 05 — Roles, Features & Routes (Consolidated)

## Roles & Access

| Role | Auth | Scope |
|:---|:---|:---|
| `candidate` | Register (RHF+Zod) → login | Dashboard → Instructions → Test → Result |
| `admin` | Login (seeded credentials) | Full admin panel |
| (reviewer — PRD persona Kamal) | Not modeled | Read-only results access is NOT implemented |

Auth: `authStore` (persisted) + `AuthProvider` context + `ProtectedRoute role=...`.
Prototype uses mock credentials; no JWT/OTP yet (OTP-ready flow only).

## Route Table

```
PUBLIC
  /                          LandingPage
  /login                     LoginPage
  /register                  RegisterPage

CANDIDATE (protected)
  /candidate/dashboard       status + profile + CTA
  /candidate/instructions    rules, format, integrity declaration
  /candidate/test            THE EXAM (fullscreen)
  /candidate/result          score breakdown, eligibility, PDF download

ADMIN (protected)
  /admin/dashboard           stats overview + recent submissions
  /admin/questions           bank list + filters + bulk import
  /admin/questions/new       create
  /admin/questions/:id/edit  edit
  /admin/exam-config         sections, time, thresholds, window
  /admin/candidates          all candidates + results table
  /admin/candidates/:id      individual detail report
  /admin/merit-list          ranked list + export
  /admin/analytics           charts + trends

FALLBACK  /*                 NotFoundPage
```

## Feature Inventory by Module

### features/auth
- `useAuth.js` — login/logout, register, current user/role
- `AuthProvider.jsx` — context wiring
- `ProtectedRoute.jsx` — role gate + redirect to /login

### features/test
- `useTestEngine.js` — state machine (start/answer/flag/navigate/submit)
- `useTimer.js` — countdown, expiry callback
- `useAutoSave.js` — 5 s persistence
- `useAntiCheat.js` — event listeners, thresholds, forced submit
- UI: QuestionCard, QuestionNav, SectionHeader, SecurityWarningModal, TestSubmitDialog

### features/questions (admin)
- `QuestionTable.jsx` — columns: ID, text (truncated), section, difficulty, status; row actions
- `QuestionForm.jsx` — create/edit with live preview
- `BulkImportModal.jsx` — CSV upload, client-side parse + validation
- `questionSchema.js` — Zod schema (section enum, 4 options, difficulty, tags)

### features/scoring
- `ScoreCard.jsx` — per-section score display
- `EligibilityBadge.jsx` — color-coded status badge
- `scoringConfig.js` — threshold copy/constants for UI

### pages/admin highlights
- DashboardPage: StatCards (registrations, completions, pass rate, avg score) + recent table
- ExamConfigPage: edit sections/time/thresholds/window → examConfigStore
- MeritListPage: rank desc by score, tie-break by timeTaken, top-3 medals, PDF export
- AnalyticsPage: ScoreBarChart (section averages), SectionPieChart (eligibility distribution),
  MeritLineChart (score trend), recent results table

### services (mock, API-swappable)
- `authService` — login/register/logout against mock candidates
- `testService` — session create/get, answers persistence helpers
- `resultService` — results list, by-candidate lookup, merit ranking
- `analyticsService` — aggregate stats, section averages, distributions, trends

### lib
- `scoring.js` — the scoring/eligibility algorithm (single source of truth)
- `pdfGenerator.js` — jsPDF candidate report
- `utils.js` — formatters (date, duration, percent), id generation
- `constants.js` — routes, section metadata, storage keys

## MoSCoW Snapshot (PRD) vs Prototype

| PRD Must-Have | Prototype status |
|:---|:---|
| Registration + auth | ✅ (mock, no OTP) |
| Test engine (50 Q, 5 sec, timed, randomized) | ✅ |
| Auto-save + recovery | ✅ (5 s) |
| Question navigation panel | ✅ |
| Automated scoring + eligibility | ✅ |
| Result view | ✅ |
| Admin question bank CRUD | ✅ |
| Exam config | ✅ |
| Results dashboard | ✅ |
| Merit list export | ⚠️ PDF yes, CSV missing (csvExport.js absent) |
| Responsive design | ✅ |
| Bilingual EN/BN | ❌ not started |