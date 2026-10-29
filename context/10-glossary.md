# 10 — Glossary

| Term | Definition |
|:---|:---|
| **Admin** | Office of Admissions staff role with full management access: questions, exam cycles, results, analytics, users, security review. |
| **Analytics** | Admin aggregate views: section averages, eligibility distribution, score trends, completion stats. |
| **Answer** | A candidate's selected option for one question (`questionId → optionId`). |
| **Anti-cheat** | Client-side deterrence + audit layers (tab detection, fullscreen, input blocking, event log). Not prevention. |
| **Audit trail** | Timestamped SecurityEvent log plus per-question timing, stored per TestSession for admin review. |
| **Auto-save** | 5-second periodic persistence of session state (answers, flags, position, timings, events). Prototype: localStorage. Target: `PATCH /sessions/:id/state` with an offline queue. |
| **Auto-submit** | Forced submission on timer expiry or anti-cheat threshold breach (5 tab switches). |
| **Bulk import** | Admin CSV upload parsed client-side to create questions in batch. |
| **Candidate** | Applicant to any DIU program; registered user role taking the test. |
| **Conditionally Eligible** | Not fully Eligible, but overall ≥ `conditionalMinPercent` (40 %) and at most 2 failed sections (including 0 failed with overall < 50 %); admissible with remedial support. |
| **Difficulty** | Question attribute: easy / medium / hard. Used for filtering and bank balancing. |
| **Eligibility** | Three-tier recommendation computed at scoring: ELIGIBLE / CONDITIONALLY_ELIGIBLE / NOT_ELIGIBLE. |
| **Eligible** | Overall ≥ 50% AND every section ≥ 40%. |
| **Exam Cycle** | One admission round (`examCycles` document): window, sections + counts, total time, thresholds + per-program overrides, anti-cheat policy, result-release policy, status draft/published/closed/archived. Replaces the prototype's ExamConfig. |
| **ExamConfig** | Prototype name for the exam cycle configuration (`src/data/mockExamConfig.js`). |
| **Failed section** | Section scoring below `sectionMinPercent` (default 40%). |
| **Flag** | Candidate marker on a question to revisit before submitting. |
| **Fullscreen enforcement** | Anti-cheat layer requiring fullscreen during the test; exit detected and warned. |
| **Integrity declaration** | Checkbox consent to exam rules on the instructions page; required before starting. |
| **ITM** | B.Sc. in Information Technology Management — one of the 13 DIU programs; the project's original (pre-pivot) scope. |
| **Merit list** | Candidates of one program ranked by percentage (desc), tie-broken by time taken (asc), competition ranking (1,2,2,4); CSV/PDF export. |
| **Mock data** | Prototype fixtures (50 questions, 16 candidates + 1 admin, 15 results, 1 exam config) standing in for a backend; seed sources for MongoDB. |
| **Not Eligible** | Overall < 40% OR 3+ failed sections. |
| **OTP** | One-time password verification (email/SMS) — planned, not implemented. |
| **Passing thresholds** | `overallMinPercent` (50) and `sectionMinPercent` (40); admin-configurable. |
| **Program** | One of the 13 DIU undergraduate programs (`programs` collection; `_id` = code like `CSE`). Chosen by the candidate at registration; drives threshold overrides, merit lists and reviewer scope. |
| **Program override** | Per-program replacement of the default thresholds inside an Exam Cycle. |
| **Question bank** | Admin-managed pool of questions with section, difficulty, tags, correct answer, explanation, lifecycle status (draft → reviewed → active → retired). |
| **Question timing** | Per-question milliseconds spent; anti-cheat telemetry for anomaly review. |
| **Recommendation** | UI wording for the eligibility result ("Recommendation: Eligible") — advisory, the committee decides. |
| **Reviewer** | Read-only committee role (PRD persona Kamal), scoped to assigned programs. |
| **Risk level / risk score** | Server-computed weighted sum of security events (Low < 4 ≤ Medium < 10 ≤ High) plus a fast-answers flag; drives the security review list. |
| **Section** | One of five competency areas: MATH, LOGIC, IT, ENGLISH, BUSINESS (10 questions each). |
| **Section percentage** | Correct answers in a section ÷ section question count × 100. |
| **Security event** | Logged anti-cheat occurrence (tab switch, fullscreen exit, blocked input, etc.). |
| **Served paper** | Immutable per-session snapshot of question order and option order; required for correct scoring. |
| **Seq** | Monotonic autosave sequence number; lets the server ignore stale/out-of-order saves. |
| **Session recovery / resume** | Restoring an interrupted test. Prototype: same browser only. Target: any device from the server session. |
| **Single attempt** | `maxAttempts: 1` — one test per candidate per cycle; not enforced in the prototype (D-12), enforced by a unique index in the target. |
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
UGC — University Grants Commission (Bangladesh) · ADR — Architecture Decision Record ·
FR / NFR — Functional / Non-Functional Requirement · JWT — JSON Web Token · TTL — Time To Live (index) · RPO/RTO — Recovery Point/Time Objective