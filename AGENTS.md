# AGENTS.md — DIU Admission WebApp Prototype
## Complete Build Instructions for AI Agents

---

## Project Identity

| Field | Value |
|:---|:---|
| **Project Name** | DIU Admission |
| **Description** | A web-based aptitude assessment platform for screening prospective students during admission across **all departments** of Daffodil International University. One university-wide admission assessment; candidates select their intended program at registration. (Originally scoped for ITM only — pivoted to university-wide.) |
| **Type** | Full-stack SPA (Single Page Application) |
| **Package Manager** | pnpm |
| **Build Tool** | Vite |
| **Framework** | React 19 (JavaScript) + React Compiler |
| **Styling** | Tailwind CSS v4 |
| **Routing** | React Router v7 |
| **Language** | JavaScript (ES2025+, JSX) |

---

## Tech Stack & Dependencies

### Core

| Package | Purpose |
|:---|:---|
| `react` `react-dom` | UI framework (v19+) |
| `@vitejs/plugin-react` | Vite React plugin |
| `babel-plugin-react-compiler` | React Compiler (auto-memoization) |
| `@rolldown/plugin-babel` `@babel/core` | Babel integration for React Compiler in Vite 8+ |
| `react-router` | Client-side routing (v7, library mode) |
| `tailwindcss` `@tailwindcss/vite` | Utility-first CSS framework (v4) |

### UI & Visualization

| Package | Purpose |
|:---|:---|
| `lucide-react` | Modern icon set |
| `recharts` | Charts for analytics dashboard (admin) |
| `framer-motion` | Animations and micro-interactions |
| `clsx` | Conditional className utility |

### Data & State

| Package | Purpose |
|:---|:---|
| `zustand` | Lightweight state management |
| `@tanstack/react-query` | Server state, caching, data fetching |

### Forms & Validation

| Package | Purpose |
|:---|:---|
| `react-hook-form` | Performant form management |
| `zod` | Schema validation |
| `@hookform/resolvers` | Zod ↔ react-hook-form bridge |

### Utilities

| Package | Purpose |
|:---|:---|
| `date-fns` | Date formatting and manipulation |
| `sonner` | Toast notifications |
| `jspdf` | Client-side PDF generation |
| `jspdf-autotable` | Table support for jsPDF |

### Dev Dependencies

| Package | Purpose |
|:---|:---|
| `vite` | Build tool and dev server |
| `eslint` | Linting |
| `eslint-plugin-react-hooks` | React Hooks lint rules |
| `eslint-plugin-react-compiler` | React Compiler lint rules |
| `@types/react` `@types/react-dom` | Type definitions for IDE support (even in JS) |

---

## Project Scaffolding

### Step 1: Create Vite Project

```bash
pnpm create vite@latest ./ -- --template react
```

### Step 2: Install Dependencies

```bash
# Core
pnpm add react-router zustand @tanstack/react-query

# UI
pnpm add lucide-react recharts framer-motion clsx sonner

# Forms
pnpm add react-hook-form zod @hookform/resolvers

# Utilities
pnpm add date-fns jspdf jspdf-autotable

# Dev: Tailwind CSS v4
pnpm add -D tailwindcss @tailwindcss/vite

# Dev: React Compiler
pnpm add -D babel-plugin-react-compiler @rolldown/plugin-babel @babel/core

# Dev: Linting
pnpm add -D eslint-plugin-react-compiler
```

### Step 3: Configure Vite (`vite.config.js`)

```javascript
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({
      filter: /\.[jt]sx?$/,
      presets: [reactCompilerPreset()],
    }),
  ],
  server: {
    port: 5173,
    open: true,
  },
});
```

### Step 4: Configure CSS (`src/index.css`)

```css
@import "tailwindcss";

/* Custom theme tokens */
@theme {
  --color-primary: #1e40af;
  --color-primary-light: #3b82f6;
  --color-primary-dark: #1e3a8a;
  --color-secondary: #0f766e;
  --color-accent: #f59e0b;
  --color-success: #16a34a;
  --color-warning: #ea580c;
  --color-danger: #dc2626;
  --color-surface: #ffffff;
  --color-surface-dark: #0f172a;
  --color-muted: #64748b;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Step 5: Configure ESLint — add React Compiler rules

In your ESLint config, add:

```javascript
// eslint.config.js
import reactCompiler from 'eslint-plugin-react-compiler';

// Add to plugins and rules:
// plugins: { 'react-compiler': reactCompiler },
// rules: { 'react-compiler/react-compiler': 'error' },
```

---

## Directory Structure

```
prototype/
├── public/
│   ├── favicon.svg
│   └── fonts/
├── src/
│   ├── main.jsx                    # App entry point
│   ├── App.jsx                     # Root component with router
│   ├── index.css                   # Tailwind + theme tokens
│   │
│   ├── components/                 # Shared/reusable components
│   │   ├── ui/                     # Primitive UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── Timer.jsx
│   │   │   └── LanguageToggle.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Sidebar.jsx         # Admin sidebar nav
│   │   │   ├── CandidateLayout.jsx
│   │   │   └── AdminLayout.jsx
│   │   └── charts/
│   │       ├── ScoreBarChart.jsx
│   │       ├── SectionPieChart.jsx
│   │       └── MeritLineChart.jsx
│   │
│   ├── pages/                      # Route-level page components
│   │   ├── public/
│   │   │   ├── LandingPage.jsx     # Program info + CTA
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── candidate/
│   │   │   ├── DashboardPage.jsx   # Test status, profile
│   │   │   ├── InstructionsPage.jsx
│   │   │   ├── TestPage.jsx        # Exam interface (THE CORE)
│   │   │   └── ResultPage.jsx      # Score breakdown + eligibility
│   │   └── admin/
│   │       ├── DashboardPage.jsx   # Overview stats
│   │       ├── QuestionBankPage.jsx
│   │       ├── QuestionFormPage.jsx
│   │       ├── ExamConfigPage.jsx
│   │       ├── CandidatesPage.jsx  # All candidates + results
│   │       ├── CandidateDetailPage.jsx
│   │       ├── MeritListPage.jsx
│   │       └── AnalyticsPage.jsx   # Charts + trends
│   │
│   ├── features/                   # Feature-specific logic
│   │   ├── auth/
│   │   │   ├── useAuth.js          # Auth hook
│   │   │   ├── AuthProvider.jsx    # Auth context
│   │   │   └── ProtectedRoute.jsx
│   │   ├── test/
│   │   │   ├── useTestEngine.js    # Test state machine
│   │   │   ├── useTimer.js         # Countdown timer hook
│   │   │   ├── useAutoSave.js      # Auto-save hook
│   │   │   ├── QuestionCard.jsx
│   │   │   ├── QuestionNav.jsx     # Navigation panel
│   │   │   ├── SectionHeader.jsx
│   │   │   └── TestSubmitDialog.jsx
│   │   ├── questions/
│   │   │   ├── QuestionTable.jsx
│   │   │   ├── QuestionForm.jsx
│   │   │   ├── BulkImportModal.jsx
│   │   │   └── questionSchema.js   # Zod schema
│   │   └── scoring/
│   │       ├── useScoring.js       # Score calculation
│   │       ├── ScoreCard.jsx
│   │       ├── EligibilityBadge.jsx
│   │       └── scoringConfig.js    # Thresholds, rules
│   │
│   ├── store/                      # Zustand stores
│   │   ├── authStore.js
│   │   ├── testStore.js
│   │   ├── questionStore.js
│   │   └── examConfigStore.js
│   │
│   ├── services/                   # API layer (mock for prototype)
│   │   ├── api.js                  # Base API client
│   │   ├── authService.js
│   │   ├── testService.js
│   │   ├── questionService.js
│   │   ├── resultService.js
│   │   └── analyticsService.js
│   │
│   ├── data/                       # Mock data for prototype
│   │   ├── mockQuestions.js        # 50+ sample questions (5 sections)
│   │   ├── mockCandidates.js
│   │   ├── mockResults.js
│   │   └── mockExamConfig.js
│   │
│   ├── lib/                        # Utility functions
│   │   ├── utils.js                # General helpers
│   │   ├── scoring.js              # Scoring algorithm
│   │   ├── pdfGenerator.js         # PDF report generation
│   │   ├── csvExport.js            # CSV export utility
│   │   └── constants.js            # App-wide constants
│   │
│   └── hooks/                      # Shared custom hooks
│       ├── useLocalStorage.js
│       ├── useMediaQuery.js
│       └── useDebounce.js
│
├── index.html
├── vite.config.js
├── package.json
├── pnpm-lock.yaml
├── eslint.config.js
├── AGENTS.md
└── README.md
```

---

## Application Routes

```
PUBLIC ROUTES:
  /                         → LandingPage (program info + register CTA)
  /login                    → LoginPage
  /register                 → RegisterPage

CANDIDATE ROUTES (Protected — role: candidate):
  /candidate/dashboard      → DashboardPage (test status)
  /candidate/instructions   → InstructionsPage (rules, format)
  /candidate/test           → TestPage (THE EXAM — core feature)
  /candidate/result         → ResultPage (score + eligibility)

ADMIN ROUTES (Protected — role: admin):
  /admin/dashboard          → DashboardPage (stats overview)
  /admin/questions          → QuestionBankPage (list + filters)
  /admin/questions/new      → QuestionFormPage (create)
  /admin/questions/:id/edit → QuestionFormPage (edit)
  /admin/exam-config        → ExamConfigPage (sections, time, thresholds)
  /admin/candidates         → CandidatesPage (all results)
  /admin/candidates/:id     → CandidateDetailPage (individual report)
  /admin/merit-list         → MeritListPage (ranked export)
  /admin/analytics          → AnalyticsPage (charts, trends)

FALLBACK:
  /*                        → NotFoundPage
```

---

## Core Feature Specifications

### 1. Test Engine (`TestPage.jsx`)
This is the **most critical component**. It must implement:

- **Timer:** Global countdown (54 min default) displayed prominently. Auto-submit on expiry.
- **Section Navigation:** 5 sections — candidate can navigate freely between sections.
- **Question Display:** One question at a time with 4 options (radio buttons for MCQ).
- **Question Navigation Panel:** Grid of question numbers showing status:
  - ⚪ Not visited
  - 🟢 Answered
  - 🔴 Not answered (visited but skipped)
  - 🟡 Flagged for review
- **Auto-Save:** Every 5 seconds, save current answers to localStorage (prototype) or API.
- **Anti-Cheat System:** Tab-switch detection, fullscreen enforcement, copy/paste blocking, keyboard shortcut blocking, DevTools detection, right-click prevention, time-per-question tracking, integrity declaration, and security event logging with admin review panel. See [Anti-Cheat Implementation Guide](./ANTI_CHEAT_IMPLEMENTATION.md) for full step-by-step instructions with complete code.
- **Submit Confirmation:** Modal dialog before final submission.
- **Randomization:** Shuffle question order and option order per session.

### 2. Scoring Engine (`lib/scoring.js`)
```
Input: { answers[], questions[], examConfig }
Output: {
  sectionScores: { math: 7, logic: 8, it: 6, english: 9, business: 5 },
  totalScore: 35,
  totalQuestions: 50,
  percentage: 70,
  sectionPercentages: { math: 70, logic: 80, it: 60, english: 90, business: 50 },
  eligibility: "ELIGIBLE" | "CONDITIONALLY_ELIGIBLE" | "NOT_ELIGIBLE",
  failedSections: ["business"],
  timeTaken: 2400 // seconds
}

Rules (default, configurable):
  - ELIGIBLE: ≥ 50% overall AND ≥ 40% in ALL sections
  - CONDITIONALLY_ELIGIBLE: ≥ 40% overall AND < 40% in 1-2 sections
  - NOT_ELIGIBLE: < 40% overall OR < 40% in 3+ sections
```

### 3. Question Bank (Admin)
- Table view with columns: ID, Question (truncated), Section, Difficulty, Status
- Filters: Section dropdown, Difficulty dropdown, Search text
- CRUD: Create/Edit form with live preview
- Bulk import: CSV upload modal (for prototype, parse client-side)

### 4. Analytics Dashboard (Admin)
- **Cards:** Total registrations, Tests completed, Pass rate, Avg score
- **Bar Chart:** Section-wise average scores
- **Pie Chart:** Eligibility distribution (Eligible / Conditional / Not Eligible)
- **Table:** Recent test results (candidate name, score, eligibility, date)

---

## Mock Data Requirements

### `mockQuestions.js`
Create **at least 50 questions** (10 per section):

**Sections:**
1. `MATH` — Mathematical Reasoning
2. `LOGIC` — Logical & Analytical Thinking
3. `IT` — Basic IT Literacy
4. `ENGLISH` — English Proficiency
5. `BUSINESS` — Business & Management Aptitude

**Question Schema:**
```javascript
{
  id: "q_math_001",
  section: "MATH",
  text: "What is 15% of 200?",
  options: [
    { id: "a", text: "25" },
    { id: "b", text: "30" },
    { id: "c", text: "35" },
    { id: "d", text: "40" }
  ],
  correctAnswer: "b",
  difficulty: "easy",      // easy | medium | hard
  explanation: "15% of 200 = 0.15 × 200 = 30",
  tags: ["percentage", "arithmetic"]
}
```

### `mockCandidates.js`
Create **15–20 mock candidates** with varied profiles and results.

### `mockExamConfig.js`
```javascript
{
  id: "exam_spring_2026",
  title: "DIU Admission — Spring 2026",
  sections: [
    { id: "MATH", name: "Mathematical Reasoning", questionCount: 10, timeMinutes: 12 },
    { id: "LOGIC", name: "Logical & Analytical Thinking", questionCount: 10, timeMinutes: 12 },
    { id: "IT", name: "Basic IT Literacy", questionCount: 10, timeMinutes: 10 },
    { id: "ENGLISH", name: "English Proficiency", questionCount: 10, timeMinutes: 10 },
    { id: "BUSINESS", name: "Business & Management Aptitude", questionCount: 10, timeMinutes: 10 }
  ],
  totalTimeMinutes: 54,
  passingThresholds: {
    overallMinPercent: 50,
    sectionMinPercent: 40
  },
  negativeMarking: false,
  maxAttempts: 1,
  startDate: "2026-06-15T00:00:00+06:00",
  endDate: "2026-07-15T23:59:59+06:00"
}
```

---

## Design System

### Color Palette
- **Primary:** Blue (#1e40af → #3b82f6) — Trust, education, technology
- **Secondary:** Teal (#0f766e) — Growth, management
- **Accent:** Amber (#f59e0b) — CTAs, highlights
- **Success:** Green (#16a34a) — Eligible, correct
- **Warning:** Orange (#ea580c) — Conditionally eligible
- **Danger:** Red (#dc2626) — Not eligible, errors
- **Background:** White (#ffffff) / Slate-950 (#0f172a) for dark mode

### Typography
- **Headings:** Inter (700, 600)
- **Body:** Inter (400)
- **Mono:** JetBrains Mono (code blocks, timers)

### Design Guidelines
- Use **glassmorphism** for cards and modals (backdrop-blur, semi-transparent backgrounds).
- Add **micro-animations** on hover, page transitions (Framer Motion).
- Use **gradient headers** for landing page hero section.
- Timer should use **monospace font** with a pulsing animation when < 5 minutes remain.
- Eligibility badges should use **color-coded backgrounds** with icons.
- Mobile-first: All views must work perfectly at 360px width.

---

## Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint
pnpm lint
```

---

## Important Notes for Agents

0. **UNIVERSITY-WIDE SCOPE:** This app serves ALL DIU departments, not just ITM. Candidates pick an intended program at registration (`PROGRAMS` in `src/lib/constants.js`). Branding/wording must never be ITM-specific. Per-program exam configs and program-specific question sections are future work.
1. **This is a PROTOTYPE** — use mock data, localStorage for persistence, no real backend.
2. **React Compiler** is enabled — do NOT use `React.memo()`, `useMemo()`, or `useCallback()` manually. The compiler handles it.
3. **Tailwind CSS v4** uses `@import "tailwindcss"` and `@theme {}` — no `tailwind.config.js` needed.
4. **React Router v7** — import from `react-router`, not `react-router-dom`.
5. **All interactive elements** must have unique `id` attributes for testing.
6. **Accessibility:** Use semantic HTML, ARIA labels, proper focus management.
7. **Responsive:** Test at 360px (mobile), 768px (tablet), 1280px (desktop).
8. **Dark mode:** Support via Tailwind's `dark:` variant.
9. **Bilingual:** Prepare i18n structure (EN/BN) — can use a simple JSON-based approach for prototype.
10. **No placeholder images** — use CSS gradients, icons, or generate images as needed.

---

## Reference Documents
- [SRS Document](../SRS_Document.md)
- [PRD Document](../PRD_Document.md)
- [Project Proposal](../Project_Proposal.md)
- [ITM Brochure](../ITM_BSc_Program_Brochure.md)
- [Anti-Cheat Implementation Guide](./ANTI_CHEAT_IMPLEMENTATION.md) — **MUST IMPLEMENT** — Complete step-by-step guide for all 10 anti-cheating features with exact code, file paths, and integration instructions.

---

*End of AGENTS.md*
