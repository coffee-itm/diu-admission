<div align="center">

# 🎓 DIU Admission

### University-Wide Web-Based Aptitude Assessment Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A modern, full-featured web application for administering the university admission assessment across **all departments** of **Daffodil International University** — one assessment, every program.

[Getting Started](#-quick-start) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Architecture](#-architecture) · [Demo](#-demo-credentials)

</div>

---

## 📋 Overview

DIU Admission is a comprehensive web platform designed to evaluate prospective students' aptitude across **5 foundational competency areas** before enrollment — for every DIU department. It replaces GPA-only admission screening with a structured, objective, and automated assessment system. Candidates select their intended program at registration.

### Why This Exists

| Problem | Solution |
|:---|:---|
| GPA alone doesn't measure domain-specific aptitude | 50-question MCQ admission exam across 5 aptitude areas |
| No pre-enrollment data on incoming cohort quality | Section-wise analytics and cohort profiling |
| Manual grading is slow and error-prone | Instant automated scoring with eligibility classification |
| Paper-based tests are inconsistent and unscalable | Digital, mobile-responsive, anti-cheat enabled platform |
| No merit-based ranking system | Automated merit list generation with CSV export |

---

## ✨ Features

### 🧑‍🎓 Candidate Portal

| Feature | Description |
|:---|:---|
| **Registration** | Form-validated signup with OTP-ready verification flow |
| **Exam Instructions** | Pre-test rules, academic integrity declaration with checkbox consent |
| **Timed MCQ Test** | Real-time countdown timer with auto-submit on expiry |
| **Section Navigation** | Free navigation across 5 sections — Math, Logic, IT, English, Business |
| **Question Navigator** | Visual panel showing answered ✅, unanswered ⬜, flagged 🚩 status per question |
| **Auto-Save** | Answers saved every 5 seconds with full session recovery on disconnect |
| **Instant Results** | Immediate score breakdown with section-wise percentages and eligibility status |
| **PDF Report** | Downloadable score report with performance visualization |

### 🛡️ Admin Panel

| Feature | Description |
|:---|:---|
| **Dashboard** | Live metrics — total registrations, completions, pass rate, average score |
| **Question Bank** | Full CRUD with difficulty levels (Easy/Medium/Hard), topic tags, and section assignment |
| **Bulk Import** | CSV upload for adding questions in bulk |
| **Exam Config** | Configure sections, timing, passing thresholds, and exam date windows |
| **Candidate Manager** | View all candidates with detailed individual performance reports |
| **Merit List** | Auto-ranked candidates by score with eligibility badges — top 3 get 🥇🥈🥉 |
| **Analytics** | Interactive charts — section averages (bar), eligibility distribution (pie), score trends (line) |

### 🔒 Anti-Cheating System (deterrence + audit)

```
Layer 1  │  Tab-Switch Detection        →  Warns at 2, auto-submits at 5 switches
Layer 2  │  Fullscreen Enforcement      →  Exit detection with re-enter prompt
Layer 3  │  Copy/Paste/Cut Blocking     →  All clipboard operations disabled
Layer 4  │  Right-Click Disabled        →  Context menu blocked and logged
Layer 5  │  Keyboard Shortcut Blocking  →  Ctrl+C/V/A/P/S/U, F12, DevTools shortcuts
Layer 6  │  DevTools Detection          →  Window resize heuristic check every 3s
Layer 7  │  Full Audit Trail            →  Every security event timestamped + per-question time tracking
```

---

## 📊 Assessment Structure

The admission exam evaluates **5 competency areas** common to all DIU programs:

```
┌─────────────────────────────────────────────────────────────────────┐
│                            DIU Admission                            │
│                  50 Questions  •  54 Minutes                       │
├─────────────────┬──────────┬──────────┬──────────────────────────── │
│  Section        │  Qs      │  Time    │  Topics                    │
├─────────────────┼──────────┼──────────┼──────────────────────────── │
│  🔢 Math        │  10      │  12 min  │  Algebra, geometry, %      │
│  🧠 Logic       │  10      │  12 min  │  Patterns, syllogisms      │
│  💻 IT          │  10      │  10 min  │  Hardware, web, OOP        │
│  📝 English     │  10      │  10 min  │  Grammar, comprehension    │
│  📈 Business    │  10      │  10 min  │  Finance, marketing, mgmt  │
└─────────────────┴──────────┴──────────┴────────────────────────────┘
```

### Scoring & Eligibility

| Classification | Criteria | Color |
|:---|:---|:---:|
| **✅ Eligible** | ≥ 50% overall **AND** ≥ 40% in every section | 🟢 |
| **⚠️ Conditionally Eligible** | ≥ 40% overall, but < 40% in 1–2 sections | 🟡 |
| **❌ Not Eligible** | < 40% overall **OR** < 40% in 3+ sections | 🔴 |

> **Scoring:** +1 per correct answer · No negative marking · All thresholds are admin-configurable

---

## 🛠 Tech Stack

| Layer | Technology | Version | Purpose |
|:---:|:---|:---:|:---|
| ⚛️ | **React** | 19.2 | UI framework with React Compiler |
| ⚡ | **Vite** | 8.0 | Build tool with HMR |
| 🎨 | **Tailwind CSS** | 4.3 | Utility-first responsive styling |
| 🏪 | **Zustand** | 5.0 | Lightweight state management with persistence |
| 🎭 | **Framer Motion** | 12.x | Smooth animations and transitions |
| 📊 | **Recharts** | 3.8 | Admin analytics charts (bar, pie, line) |
| 📄 | **jsPDF** | 4.2 | Client-side PDF report generation |
| 🧭 | **React Router** | 7.17 | SPA routing with role-based guards |
| 📋 | **React Hook Form** | 7.79 | Performant form handling |
| ✅ | **Zod** | 4.4 | Schema validation |
| 🔔 | **Sonner** | 2.0 | Toast notifications |
| 🎯 | **Lucide React** | 1.18 | Icon system |

---

## 🏗 Architecture

```
src/
├── components/                    # Reusable UI components
│   ├── charts/                    # Recharts wrappers
│   │   ├── MeritLineChart.jsx         # Score trend over time
│   │   ├── ScoreBarChart.jsx          # Section average scores
│   │   └── SectionPieChart.jsx        # Eligibility distribution
│   ├── layout/                    # App shell components
│   │   ├── AdminLayout.jsx            # Admin sidebar layout
│   │   ├── CandidateLayout.jsx        # Candidate header/footer layout
│   │   ├── Header.jsx                 # Top navigation bar
│   │   ├── Sidebar.jsx                # Admin sidebar navigation
│   │   └── Footer.jsx                 # Site footer
│   └── ui/                        # Primitive UI components
│       ├── Badge.jsx                  # Status badges
│       ├── Button.jsx                 # Button with variants & icons
│       ├── Card.jsx                   # Card + StatCard
│       ├── Input.jsx                  # Form input fields
│       ├── Modal.jsx                  # Dialog overlay
│       ├── ProgressBar.jsx            # Score progress bars
│       ├── Spinner.jsx                # Loading spinners
│       └── Timer.jsx                  # Countdown timer display
│
├── features/                      # Feature modules
│   ├── auth/                      # Authentication
│   │   ├── AuthProvider.jsx           # Auth context provider
│   │   ├── ProtectedRoute.jsx         # Role-based route guard
│   │   └── useAuth.js                 # Auth hook (login/logout)
│   ├── questions/                 # Question management
│   │   ├── QuestionForm.jsx           # Add/edit question form
│   │   ├── QuestionTable.jsx          # Question bank table
│   │   ├── BulkImportModal.jsx        # CSV bulk import
│   │   └── questionSchema.js          # Zod validation schema
│   ├── scoring/                   # Scoring & results
│   │   ├── ScoreCard.jsx              # Section-wise score display
│   │   ├── EligibilityBadge.jsx       # Eligibility status badge
│   │   └── scoringConfig.js           # Scoring thresholds
│   └── test/                      # Test engine
│       ├── QuestionCard.jsx           # MCQ question renderer
│       ├── QuestionNav.jsx            # Question navigation grid
│       ├── SectionHeader.jsx          # Section tab switcher
│       ├── SecurityWarningModal.jsx   # Anti-cheat warning popup
│       ├── TestSubmitDialog.jsx       # Submit confirmation dialog
│       ├── useAntiCheat.js            # Anti-cheat hook (deterrence + audit log)
│       ├── useAutoSave.js             # Periodic answer persistence
│       ├── useTestEngine.js           # Core test orchestration
│       └── useTimer.js                # Countdown timer logic
│
├── pages/                         # Route pages
│   ├── admin/                     # Admin pages
│   │   ├── DashboardPage.jsx          # Admin overview dashboard
│   │   ├── QuestionBankPage.jsx       # Question management
│   │   ├── QuestionFormPage.jsx       # Add/edit question
│   │   ├── ExamConfigPage.jsx         # Exam settings
│   │   ├── CandidatesPage.jsx         # Candidate list
│   │   ├── CandidateDetailPage.jsx    # Individual candidate report
│   │   ├── MeritListPage.jsx          # Ranked merit list
│   │   └── AnalyticsPage.jsx          # Charts & analytics
│   ├── candidate/                 # Candidate pages
│   │   ├── DashboardPage.jsx          # Candidate home
│   │   ├── InstructionsPage.jsx       # Pre-test instructions & integrity
│   │   ├── TestPage.jsx               # Full-screen exam interface
│   │   └── ResultPage.jsx             # Score results + PDF download
│   └── public/                    # Public pages
│       ├── LandingPage.jsx            # Hero + features overview
│       ├── LoginPage.jsx              # Login form
│       ├── RegisterPage.jsx           # Registration form
│       └── NotFoundPage.jsx           # 404 page
│
├── data/                          # Mock data (prototype)
│   ├── mockQuestions.js               # 50 sample questions (10 per section)
│   ├── mockExamConfig.js              # Exam configuration
│   ├── mockCandidates.js              # Sample candidate profiles
│   └── mockResults.js                 # Sample test results
│
├── services/                      # Data access layer
│   ├── authService.js                 # Auth operations (mock → API ready)
│   ├── testService.js                 # Test session operations
│   ├── resultService.js               # Results & merit list
│   └── analyticsService.js            # Analytics aggregation
│
├── store/                         # Zustand state stores
│   ├── authStore.js                   # Auth state (user, role)
│   ├── testStore.js                   # Test session state (answers, timer)
│   ├── antiCheatStore.js              # Security event tracking
│   ├── examConfigStore.js             # Exam configuration state
│   └── questionStore.js               # Question bank state
│
├── lib/                           # Utilities
│   ├── constants.js                   # Routes, sections, config values
│   ├── scoring.js                     # Score calculation & eligibility logic
│   ├── pdfGenerator.js                # jsPDF report builder
│   └── utils.js                       # Formatters & helpers
│
├── App.jsx                        # Root component with routing
├── App.css                        # Global styles
├── index.css                      # Tailwind base imports
└── main.jsx                       # Entry point
```

### Data Flow

```
┌────────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│   Pages    │ ──▶ │  Hooks   │ ──▶ │   Services   │ ──▶ │   Data   │
│ (UI Layer) │     │ (Logic)  │     │ (API Layer)  │     │  (Mock)  │
└────────────┘     └──────────┘     └──────────────┘     └──────────┘
                        │
                   ┌────▼────┐
                   │  Stores │  ◀──  Zustand (persisted to localStorage)
                   │ (State) │
                   └─────────┘
```

> **Backend-Ready:** The service layer abstracts all data access. Swapping from mock data to a real API requires only updating the service files — zero changes to components or hooks.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/diu-admission.git
cd diu-admission/prototype

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will open at **http://localhost:5173**

### Build for Production

```bash
pnpm build
pnpm preview
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|:---:|:---|:---|
| 🛡️ **Admin** | `admin@diu.edu` | `Admin@1234` |
| 🧑‍🎓 **Candidate** | `demo@candidate.com` | `Test@1234` |

> You can also **register a new candidate account** from the registration page.

### Candidate Flow
```
Landing Page  →  Register  →  Login  →  Dashboard  →  Instructions  →  Start Test  →  Results  →  Download PDF
```

### Admin Flow
```
Login  →  Dashboard  →  Question Bank  →  Exam Config  →  Candidates  →  Merit List  →  Analytics
```

---

## 🗺️ Route Map

| Route | Access | Page |
|:---|:---:|:---|
| `/` | Public | Landing page with hero section |
| `/login` | Public | Login form |
| `/register` | Public | Candidate registration |
| `/candidate/dashboard` | 🔒 Candidate | Test status and actions |
| `/candidate/instructions` | 🔒 Candidate | Exam rules + integrity declaration |
| `/candidate/test` | 🔒 Candidate | Full-screen exam interface |
| `/candidate/result` | 🔒 Candidate | Score breakdown + PDF download |
| `/admin/dashboard` | 🔒 Admin | Overview metrics + recent submissions |
| `/admin/questions` | 🔒 Admin | Question bank management |
| `/admin/questions/new` | 🔒 Admin | Add new question form |
| `/admin/exam-config` | 🔒 Admin | Exam settings configuration |
| `/admin/candidates` | 🔒 Admin | Candidate list + detail view |
| `/admin/merit-list` | 🔒 Admin | Ranked merit list with export |
| `/admin/analytics` | 🔒 Admin | Performance charts & reports |

---

## 📦 Key Dependencies

```json
{
  "react": "^19.2.6",
  "react-router": "^7.17.0",
  "zustand": "^5.0.14",
  "framer-motion": "^12.40.0",
  "recharts": "^3.8.1",
  "jspdf": "^4.2.1",
  "react-hook-form": "^7.79.0",
  "zod": "^4.4.3",
  "lucide-react": "^1.18.0",
  "sonner": "^2.0.7",
  "tailwindcss": "^4.3.1",
  "vite": "^8.0.12"
}
```

---

## 🗓 Roadmap

- [x] Candidate registration & login
- [x] 5-section timed MCQ test engine
- [x] Anti-cheating deterrence + audit log
- [x] Instant scoring with eligibility classification
- [x] PDF score report generation
- [x] Admin dashboard with metrics
- [x] Question bank CRUD + bulk import
- [x] Exam configuration panel
- [x] Merit list with ranking
- [x] Analytics charts (bar, pie, line)
- [ ] Backend API (Node.js + Fastify + MongoDB) — see [context/16-backend-architecture.md](context/16-backend-architecture.md)
- [ ] Email/SMS OTP verification
- [ ] Bilingual support (English + Bangla)
- [x] CSV merit list export
- [ ] Excel merit list export
- [ ] Production deployment

---

## 📚 Documentation

Full project documentation — PRD, SRS, MongoDB schema, API spec, backend/frontend specs, testing strategy, implementation roadmap and ops runbook — lives in [`context/`](context/README.md). Start with [`context/README.md`](context/README.md).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed by the **Office of Admissions**, **Daffodil International University** — serving all departments.

---

<div align="center">

**Built with ❤️ for DIU Admissions**

Office of Admissions · Daffodil International University · Daffodil Smart City, Birulia, Savar, Dhaka-1216

</div>
