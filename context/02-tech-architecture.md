# 02 — Technology & Architecture (Consolidated from code)

## Stack (actual, from package.json)

| Layer | Choice | Version |
|:---|:---|:---|
| UI framework | React (JavaScript, JSX) | 19.2.x |
| Build tool | Vite | 8.x |
| React Compiler | `babel-plugin-react-compiler` via `@rolldown/plugin-babel` | dev |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, `@theme {}` tokens in `src/index.css`) | 4.3.x |
| Routing | React Router v7 (import from `react-router`, library mode) | 7.17.x |
| State | Zustand v5, all stores persisted to localStorage | 5.0.x |
| Charts | Recharts | 3.8.x |
| Animation | Framer Motion | 12.x |
| Forms | React Hook Form + Zod v4 + @hookform/resolvers | 7.79.x |
| Icons | lucide-react | 1.18.x |
| Toasts | sonner | 2.0.x |
| PDF | jspdf (+ jspdf-autotable) | 4.2.x |
| Dates | date-fns | — |
| Conditional classes | clsx | — |
| Lint | eslint + eslint-plugin-react-hooks + eslint-plugin-react-compiler | — |
| Package manager | pnpm | — |

Compiler rules: React Compiler is enabled → **no manual `React.memo` / `useMemo` / `useCallback`**.

## Directory Layout (as implemented)

```
src/
├── main.jsx, App.jsx, index.css
├── components/
│   ├── ui/        Button, Input, Card(+StatCard), Badge, Modal, Spinner, ProgressBar, Timer
│   ├── layout/    Header, Footer, Sidebar, CandidateLayout, AdminLayout
│   └── charts/    ScoreBarChart, SectionPieChart, MeritLineChart
├── pages/
│   ├── public/    LandingPage, LoginPage, RegisterPage, NotFoundPage
│   ├── candidate/ DashboardPage, InstructionsPage, TestPage, ResultPage
│   └── admin/     DashboardPage, QuestionBankPage, QuestionFormPage, ExamConfigPage,
│                  CandidatesPage, CandidateDetailPage, MeritListPage, AnalyticsPage
├── features/
│   ├── auth/      AuthProvider.jsx, ProtectedRoute.jsx, useAuth.js
│   ├── test/      useTestEngine.js, useTimer.js, useAutoSave.js, useAntiCheat.js,
│   │              QuestionCard, QuestionNav, SectionHeader, SecurityWarningModal, TestSubmitDialog
│   ├── questions/ QuestionTable, QuestionForm, BulkImportModal, questionSchema.js
│   └── scoring/   ScoreCard, EligibilityBadge, scoringConfig.js
├── store/         authStore, testStore, questionStore, examConfigStore, antiCheatStore
├── services/      authService, testService, resultService, analyticsService   (mock, API-swappable)
├── data/          mockQuestions (50), mockCandidates (15), mockResults (10), mockExamConfig
└── lib/           constants.js, scoring.js, utils.js, pdfGenerator.js
```

## Data Flow

```
Pages ──▶ Hooks (features/*) ──▶ Services (mock/API layer) ──▶ data/ (mock)
               │
               ▼
        Zustand stores (persisted to localStorage)
```

Services layer is the single seam for backend integration: components/hooks never touch
mock data directly — swap service internals from mock → REST without UI changes.

## State Stores (Zustand, persisted)

| Store | Holds |
|:---|:---|
| `authStore` | current user, role (`admin` \| `candidate`), login/logout |
| `testStore` | test session: question order, answers map, flags, visited set, timer state, status |
| `questionStore` | question bank CRUD state |
| `examConfigStore` | exam window, sections, thresholds |
| `antiCheatStore` | security event log, tab-switch count, fullscreen state |

## Routing & Access Control

- `AuthProvider` wraps the app; `ProtectedRoute role="admin"|"candidate"` guards subtrees.
- PUBLIC: `/`, `/login`, `/register`
- CANDIDATE: `/candidate/dashboard`, `/candidate/instructions`, `/candidate/test`, `/candidate/result`
- ADMIN: `/admin/dashboard`, `/admin/questions`, `/admin/questions/new`,
  `/admin/questions/:id/edit`, `/admin/exam-config`, `/admin/candidates`,
  `/admin/candidates/:id`, `/admin/merit-list`, `/admin/analytics`
- Fallback: `/*` → NotFoundPage
- TestPage runs full-screen (fullscreen enforcement is part of anti-cheat).

## Design System (Tailwind v4 @theme tokens)

- primary #1e40af → primary-light #3b82f6 → primary-dark #1e3a8a
- secondary #0f766e (teal), accent #f59e0b (amber)
- success #16a34a, warning #ea580c, danger #dc2626
- surface #ffffff / surface-dark #0f172a, muted #64748b
- font-sans: Inter; font-mono: JetBrains Mono (timer uses mono, pulses < 5 min)
- Glassmorphism cards/modals, Framer Motion micro-animations, gradient hero.
- Mobile-first (360px), tested at 768/1280.

## Commands

```bash
pnpm dev       # dev server :5173
pnpm build     # production build
pnpm preview   # preview build
pnpm lint      # eslint
```

## Known Doc-vs-Code Gaps (verified by file audit)

Files referenced in `AGENTS.md` directory tree but **absent from the codebase**:
- `src/services/api.js`, `src/services/questionService.js`
- `src/lib/csvExport.js` (README roadmap confirms merit-list CSV export not done)
- `src/hooks/` (useLocalStorage, useMediaQuery, useDebounce) — directory does not exist
- `components/ui/LanguageToggle.jsx`, `features/scoring/useScoring.js`

Spec conflicts:
- Auto-save interval: AGENTS.md says 5 s; PRD says 30 s. Code uses 5 s (useAutoSave).
- ANTI_CHEAT_IMPLEMENTATION.md specifies 10 features; README claims 7 layers implemented.
- PRD Must-Have: bilingual EN/BN → **not implemented** (no i18n structure, no toggle).
- PRD Must-Have: OTP verification → prototype is "OTP-ready" only (no OTP flow).
- Per-section time limits exist in mockExamConfig (12/12/10/10/10) but the engine enforces a
  **single global 54-min timer**; section-level enforcement is PRD Phase-3 "Could have".