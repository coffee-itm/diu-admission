# 10 — Glossary

| Term | Definition |
|:---|:---|
| **Admin** | ITM faculty/staff role with full management access: questions, exam config, results, analytics. |
| **Analytics** | Admin aggregate views: section averages, eligibility distribution, score trends, completion stats. |
| **Answer** | A candidate's selected option for one question (`questionId → optionId`). |
| **Anti-cheat** | Client-side deterrence + audit layers (tab detection, fullscreen, input blocking, event log). Not prevention. |
| **Audit trail** | Timestamped SecurityEvent log plus per-question timing, stored per TestSession for admin review. |
| **Auto-save** | 5-second periodic persistence of session state (answers, progress, time) to localStorage. |
| **Auto-submit** | Forced submission on timer expiry or anti-cheat threshold breach (5 tab switches). |
| **Bulk import** | Admin CSV upload parsed client-side to create questions in batch. |
| **Candidate** | Prospective ITM student; registered user role taking the test. |
| **Conditionally Eligible** | Overall ≥ 40% but below section threshold in 1–2 sections; admissible with remedial support. |
| **Difficulty** | Question attribute: easy / medium / hard. Used for filtering and bank balancing. |
| **Eligibility** | Three-tier recommendation computed at scoring: ELIGIBLE / CONDITIONALLY_ELIGIBLE / NOT_ELIGIBLE. |
| **Eligible** | Overall ≥ 50% AND every section ≥ 40%. |
| **ExamConfig** | Per-cycle configuration: sections, counts, timing, thresholds, attempt limit, date window. |
| **Failed section** | Section scoring below `sectionMinPercent` (default 40%). |
| **Flag** | Candidate marker on a question to revisit before submitting. |
| **Fullscreen enforcement** | Anti-cheat layer requiring fullscreen during the test; exit detected and warned. |
| **Integrity declaration** | Checkbox consent to exam rules on the instructions page; required before starting. |
| **ITM** | B.Sc. in Information Technology & Management, DIU — 142-credit, 4-year program; majors: FinTech, IT Project Management. |
| **Merit list** | Candidates ranked by total score (desc), tie-broken by time taken (asc); exportable (PDF now, CSV planned). |
| **Mock data** | Prototype fixtures (50 questions, 15 candidates, 10 results, 1 exam config) standing in for a backend. |
| **Not Eligible** | Overall < 40% OR 3+ failed sections. |
| **OTP** | One-time password verification (email/SMS) — planned, not implemented. |
| **Passing thresholds** | `overallMinPercent` (50) and `sectionMinPercent` (40); admin-configurable. |
| **Question bank** | Admin-managed pool of questions with section, difficulty, tags, correct answer, explanation. |
| **Question timing** | Per-question seconds spent; anti-cheat telemetry for anomaly review. |
| **Reviewer** | Proposed read-only committee role (PRD persona Kamal); not yet implemented. |
| **Section** | One of five competency areas: MATH, LOGIC, IT, ENGLISH, BUSINESS (10 questions each). |
| **Section percentage** | Correct answers in a section ÷ section question count × 100. |
| **Security event** | Logged anti-cheat occurrence (tab switch, fullscreen exit, blocked input, etc.). |
| **Served paper** | Immutable per-session snapshot of question order and option order; required for correct scoring. |
| **Session recovery** | Restoring an interrupted test from persisted state on reload (same-browser only in prototype). |
| **Single attempt** | `maxAttempts: 1` — one test per candidate per exam; client-enforced now, must be server-enforced. |
| **Skill test** | The 50-question, 54-minute, 5-section aptitude assessment itself. |
| **Test engine** | The exam runtime: timer, navigation, answering, flagging, auto-save, anti-cheat, submission. |
| **TestSession** | One candidate's attempt: status, served paper, answers, flags, timings, events. Client-only today; must be a server entity. |
| **Time taken** | Total seconds from start to submission; merit-list tiebreaker. |
| **Thresholds** | See Passing thresholds. |
| **UTC+06:00** | Exam window timezone (Bangladesh Standard Time) in ExamConfig dates. |

### Abbreviations
DIU — Daffodil International University · GPA — Grade Point Average · MCQ — Multiple Choice Question ·
OTP — One-Time Password · PII — Personally Identifiable Information · RBAC — Role-Based Access Control ·
SRS — Software Requirements Specification · PRD — Product Requirements Document · SPA — Single Page Application ·
UGC — University Grants Commission (Bangladesh) · ADR — Architecture Decision Record