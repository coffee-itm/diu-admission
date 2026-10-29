# 02 — Technology & Architecture

> Part A is the **current prototype**, verified against the code on 2026-10-29. Part B is the **target**
> architecture agents build towards. Details are in [14](./14-database-schema.md) (DB),
> [15](./15-api-spec.md) (API), [16](./16-backend-architecture.md) (server) and
> [17](./17-frontend-spec.md) (frontend).

---

## Part A — Current prototype (as built)

### Stack (from `package.json`)

| Layer | Choice | Version |
|:---|:---|:---|
| UI framework | React (JavaScript, JSX) | 19.2.x |
| Build tool | Vite | 8.x |
| React Compiler | `babel-plugin-react-compiler` via `@rolldown/plugin-babel` (`vite.config.js`) | 1.0 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, `@theme {}` tokens in `src/index.css`) | 4.3.x |
| Routing | React Router v7 (import from `react-router`, `BrowserRouter` in `src/main.jsx`) | 7.17.x |
| State | Zustand v5 (4 of 5 stores persisted) | 5.0.x |
| Charts | Recharts | 3.8.x |
| Animation | Framer Motion | 12.x |
| Forms | React Hook Form + Zod v4 + @hookform/resolvers | 7.79 / 4.4 / 5.4 |
| Icons / toasts | lucide-react / sonner | 1.18 / 2.0 |
| PDF | jsPDF (`jspdf-autotable` installed but unused) | 4.2.x |
| Unused deps | `@tanstack/react-query`, `date-fns`, `jspdf-autotable` | — |
| Lint | eslint 10 flat config + react-hooks + react-refresh + `react-compiler/react-compiler: error` | — |
| Tests | **none** | — |

Compiler rule: **no manual `React.memo` / `useMemo` / `useCallback`**.

### Directory layout (actual)

```
src/
├── main.jsx, App.jsx, index.css, App.css
├── components/
│   ├── ui/        Badge, Button, Card(+StatCard), Input, LanguageToggle (unused), Modal, ProgressBar, Spinner, Timer
│   ├── layout/    AdminLayout, CandidateLayout, Footer, Header, Sidebar
│   └── charts/    MeritLineChart, ScoreBarChart, SectionPieChart
├── pages/
│   ├── public/    LandingPage, LoginPage, NotFoundPage, RegisterPage
│   ├── candidate/ DashboardPage, InstructionsPage, ResultPage, TestPage
│   └── admin/     AnalyticsPage, CandidateDetailPage, CandidatesPage, DashboardPage,
│                  ExamConfigPage, MeritListPage, QuestionBankPage, QuestionFormPage
├── features/
│   ├── auth/      AuthProvider.jsx (pass-through), ProtectedRoute.jsx, useAuth.js
│   ├── test/      useTestEngine, useTimer, useAutoSave, useAntiCheat,
│   │              QuestionCard, QuestionNav, SectionHeader, SecurityWarningModal, TestSubmitDialog
│   ├── questions/ BulkImportModal (stub), QuestionForm, QuestionTable, questionSchema.js
│   └── scoring/   EligibilityBadge, ScoreCard, scoringConfig.js (unused)
├── store/         authStore, testStore, questionStore, examConfigStore, antiCheatStore
├── services/      authService, testService, resultService, analyticsService   (no api.js, no questionService)
├── data/          mockQuestions (50), mockCandidates (16 + 1 admin), mockResults (15), mockExamConfig
└── lib/           constants.js, scoring.js, utils.js, pdfGenerator.js          (no csvExport.js)
```

### Data flow (actual)

```
Pages ─► feature hooks ─► services (mock, setTimeout latency) ─► src/data/* + localStorage
  │            │
  │            └─► Zustand stores (persist → localStorage)
  └─► admin pages ALSO import mockCandidates / questionStore / examConfigStore directly  ← seam is leaky (D-08, D-10)
```

### Stores & storage keys (actual)

| Store / writer | localStorage key | Holds |
|:---|:---|:---|
| `authStore` | `itm-auth` | `user`, `isAuthenticated` |
| `testStore` | `itm-test-session` | sessionId, examConfig, shuffled questions (**with `correctAnswer`**), answers, questionStatus, position, `timeRemaining` (tick-based), result |
| `antiCheatStore` | `itm-anti-cheat` | counters, `securityEvents[]`, `integrityAgreedAt`, `questionTimeMap` |
| `examConfigStore` | `itm-exam-config` | `config` (copy of mock; **not read by the test**, D-08) |
| `questionStore` | *not persisted* | `questions` (copy of mock; **not read by the test**, D-21) |
| `authService` | `diu-candidates` | registered candidates (plaintext passwords, D-22) |
| `testService` | `itm-results` | submitted results (no anti-cheat summary, D-05) |
| `LanguageToggle` | `itm-lang` | unused |

### Routing & guards (actual)

`src/App.jsx`: `AuthProvider` wraps everything. Public pages and `*` sit under `CandidateLayout`.
Candidate routes use `ProtectedRoute role="candidate"` + `CandidateLayout`. Admin routes use `ProtectedRoute role="admin"` + `AdminLayout`.
`ProtectedRoute` (`src/features/auth/ProtectedRoute.jsx:9-16`) sends unauthenticated users to `/login` and wrong roles to their own dashboard.
`TestPage` covers the layout with a `fixed inset-0` overlay. Full route table: [05](./05-roles-features-routes.md).

---

## Part B — Target architecture (R2+)

### Decisions (see [09-adrs.md](./09-adrs.md))
- **MongoDB** (ADR-013) with **Mongoose 8** and **Fastify 5** (ADR-014) on Node 22. All JavaScript ESM.
- **Server-authoritative test sessions** (ADR-015): the server owns the deadline, served paper, answer keys and scoring.
- **JWT access token in memory + rotating httpOnly refresh cookie + argon2id** (ADR-016).
- **pnpm workspace** with `packages/shared` for scoring, risk, constants and Zod schemas (ADR-019).

### System diagram

```
┌──────────────── Browser ────────────────┐         ┌──────────── API (Fastify, 2+ instances) ───────────┐
│ React SPA (Vite build, static/CDN)      │  HTTPS  │ plugins: helmet · cors · rate-limit · jwt · zod     │
│  pages ─► react-query ─► services ─► api.js ─────►│ modules: auth · users · programs · questions ·      │
│  testStore (offline queue, clock offset) │ /api/v1 │          cycles · sessions · results · analytics ·  │
│  @diu/shared (schemas, display helpers)  │◄────────│          security · audit                           │
└──────────────────────────────────────────┘ JSON   │ jobs: expireSessions (1 instance)                   │
                                                     │ @diu/shared: scoring · risk · shuffle · schemas     │
                                                     └───────────────┬─────────────────────┬───────────────┘
                                                                     │ Mongoose (majority) │ SMTP / SMS
                                                     ┌───────────────▼──────────┐   ┌──────▼──────┐
                                                     │ MongoDB replica set (3)  │   │ OTP delivery │
                                                     │ users programs questions │   └─────────────┘
                                                     │ examCycles testSessions  │
                                                     │ results otpCodes         │
                                                     │ refreshTokens auditLogs  │
                                                     └──────────────────────────┘
```

### Target repository layout

```
diu-admission/
├── src/                 # React SPA (stays at the root)
├── packages/shared/     # @diu/shared
├── server/              # @diu/server (Fastify)
├── e2e/                 # Playwright
├── load/                # k6
├── context/             # these docs
└── pnpm-workspace.yaml  # packages: ['.', 'server', 'packages/*']
```

### What moves where

| Concern | Prototype | Target |
|:--|:--|:--|
| Question selection & shuffle | `testService.loadTest` (client) | `POST /sessions` (server, `crypto.randomInt`) |
| Answer keys | In `testStore` (readable in DevTools) | Server only (`select: false`) |
| Timer | Tick countdown in localStorage | `deadline` on the server, client shows `deadline − serverNow` |
| Autosave | zustand persist | `PATCH /sessions/:id/state` every 5 s with an offline queue |
| Scoring | `src/lib/scoring.js` in the browser | `@diu/shared/scoring` run by the server at submit/expiry |
| Anti-cheat counts | Client counters | Client events → server counts, risk level, auto-submit |
| Results / merit / analytics | localStorage + mocks | MongoDB aggregations |
| Auth | Plaintext mock compare | argon2id + JWT + refresh rotation + OTP |

### Design tokens (unchanged)

`src/index.css` `@theme`: primary #1e40af / light #3b82f6 / dark #1e3a8a · secondary #0f766e · accent #f59e0b ·
success #16a34a · warning #ea580c · danger #dc2626 · surface #ffffff / surface-dark #0f172a · muted #64748b ·
Inter / JetBrains Mono. Dark mode and i18n: [17 §6–7](./17-frontend-spec.md#6-internationalization-fr-i18n-adr-017).

### Commands

```bash
pnpm dev            # frontend :5173
pnpm dev:server     # API :4000 (after P1)
pnpm dev:all        # both
pnpm lint
pnpm test           # frontend tests (after P0-01)
pnpm test:all       # all workspace packages
pnpm build
pnpm seed           # seed MongoDB from src/data (after P3-04)
```
