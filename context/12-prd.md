# 12 — Product Requirements Document (PRD)

> **Status:** Living document · **Owner:** Office of Admissions, DIU · **Last updated:** 2026-10-29
> **Supersedes:** the external `PRD_Document.md` referenced by older docs (not in this repo).
> Detailed, testable requirements live in [13-srs.md](./13-srs.md). Build order lives in
> [19-implementation-roadmap.md](./19-implementation-roadmap.md).

---

## 1. Problem

Daffodil International University (DIU) admits students to every program mainly on SSC/HSC GPA.
GPA does not measure the aptitudes that predict first-year success: mathematical reasoning,
logical thinking, IT literacy, English proficiency and business awareness. As a result:

- Students enroll unprepared. First-semester performance suffers and dropout and course-repeat
  rates go up.
- The university has no data on an incoming cohort's strengths and weaknesses before classes
  start, so it can't plan bridge or remedial courses.
- Paper-based screening is slow, inconsistent and error-prone to grade.

## 2. Product summary

**DIU Admission** is a web application that runs **one university-wide aptitude assessment** for
applicants to **all DIU programs**. Candidates register, pick their intended program, and take a
timed 50-question MCQ test in five sections in their browser, including on a phone. The system
scores the test automatically, classifies each candidate as **Eligible / Conditionally Eligible /
Not Eligible**, and gives the Office of Admissions merit lists, analytics and integrity reports.

## 3. Goals and non-goals

### Goals
| # | Goal | Measured by |
|:--|:--|:--|
| G1 | Give admissions an objective aptitude signal alongside GPA, for every program | % of applicants with a scored result |
| G2 | Run a fair, tamper-resistant online test that works on a cheap phone on 3G | Completion rate, recovery success, p95 page load |
| G3 | Publish results and merit lists instantly with no manual grading | Time from submit to result; admin hours saved |
| G4 | Profile each cohort by section and program to plan remedial courses | Analytics usage per cycle |
| G5 | Protect exam integrity through deterrence and an audit trail | Share of sessions with a reviewed High-risk flag |

### Non-goals (this release)
- AI or video proctoring, webcam monitoring, or browser lockdown software.
- Payment or application-fee handling.
- Taking over the university's main admission or student-records system. DIU Admission
  **exports** data; it does not own enrollment.
- Question types other than single-answer MCQ with four options.
- Native mobile apps. The responsive web app is the mobile experience.

## 4. Personas

| Persona | Role in system | Context | Needs |
|:--|:--|:--|:--|
| **Rafiq, 18**: applicant | `candidate` | HSC graduate, mid-range Android phone, unstable 3G/4G, more comfortable in Bangla | Simple mobile UI, Bangla instructions, not losing answers when the connection drops, a quick result |
| **Dr. Fatema, 42**: Office of Admissions coordinator | `admin` | Runs the admission cycle for the whole university | Bulk question upload, configurable thresholds per program, merit lists per program, analytics, integrity review |
| **Kamal, 55**: department admission committee member | `reviewer` | Reviews applicants for one or more programs | Read-only results and merit list for *their* programs, simple filters, one-click PDF/CSV |

## 5. User journeys

### J1 — Candidate takes the test
1. Lands on `/`, reads about the assessment, clicks **Register**.
2. Registers with name, email, phone, intended **program**, SSC/HSC GPA and password, then
   verifies email (OTP).
3. Dashboard shows the exam window, status (Not started / In progress / Completed) and the CTA.
4. Instructions page: rules, format, timing. Ticks the **integrity declaration** and starts. The
   browser enters fullscreen.
5. Answers questions one at a time, moving freely between the five sections. Uses the question
   grid (not visited / answered / skipped / flagged) and flags questions for review. Progress
   saves automatically.
6. If the phone dies or the connection drops, logs back in on any device and **resumes with the
   remaining time held by the server**.
7. Submits (with confirmation), or the server auto-submits at the deadline.
8. Sees the score by section, the eligibility status and the time taken, and downloads a PDF
   report. The result may be withheld until the window closes if admin config says so.

### J2 — Admin runs an admission cycle
1. Creates or edits questions (single or CSV bulk import) and moves them through
   `draft → reviewed → active`.
2. Creates an **Exam Cycle**: title, window, sections (question count per section), total
   time, default thresholds, per-program threshold overrides, result-release policy.
3. Publishes the cycle. Candidates can start inside the window.
4. Watches the dashboard live: registrations, in progress, completed, pass rate.
5. Reviews flagged sessions (security events, risk level, time per question) and annotates a
   decision.
6. Exports merit lists per program (CSV and PDF) and reviews analytics.

### J3 — Reviewer checks applicants
1. Logs in and sees only the programs assigned to them.
2. Filters candidates and results, opens a candidate report, and downloads the merit list.

## 6. Feature scope (MoSCoW)

| Area | Must | Should | Could | Won't (now) |
|:--|:--|:--|:--|:--|
| Identity | Register/login, hashed passwords, JWT sessions, roles candidate/reviewer/admin, email OTP verification | Password reset by OTP | SMS OTP (BD gateway) | Social login |
| Test engine | Server-held 54-min timer, 5 sections, free navigation, one question per screen, flags, question grid, autosave every 5 s, resume on any device, submit confirmation, server auto-submit at deadline | Low-bandwidth mode (no animations) | Per-section time limits | Adaptive testing |
| Question selection | Randomized questions and option order per session, sampled from the active pool (`questionCount` per section) | Difficulty mix per section | Item analysis stats | IRT calibration |
| Scoring | Server-side, deterministic, configurable thresholds, three eligibility tiers, per-program overrides | Recompute results after a config fix | Section weights | Negative marking UI (flag exists) |
| Anti-cheat | Integrity declaration, tab/fullscreen/clipboard/shortcut/right-click/DevTools detection, events sent to server, risk level, admin review panel | Auto-submit on threshold (configurable) | IP/device fingerprint anomaly flags | Webcam proctoring |
| Question bank | CRUD, filters, CSV import with validation report, lifecycle states | Duplicate detection | Image support in questions | Rich media |
| Results | Candidate result page + PDF, admin candidate list/detail, merit list per program (CSV/PDF) | Result release policy | Signed/verifiable PDF | Email results automatically |
| Analytics | Totals, pass rate, section averages, eligibility distribution, per-program breakdown | Submissions-over-time trend | Difficulty/discrimination per question | Predictive models |
| UX | Mobile-first 360 px, accessible (WCAG 2.2 AA), **English + Bangla**, dark mode | Offline answer queue | PWA install | — |

## 7. Success metrics (observable by the app)

| KPI | Target | Source |
|:--|:--|:--|
| Test completion rate (submitted ÷ started) | ≥ 90 % | `testSessions` |
| Sessions recovered after an interruption without losing answers | ≥ 99 % | `testSessions.resumeCount`, autosave logs |
| API availability during the exam window | ≥ 99.5 % | Uptime monitor |
| Submit → result available | < 1 min (immediate release) | `results.createdAt − testSessions.submittedAt` |
| p95 candidate page load on throttled 3G | < 3 s | Lighthouse / RUM |
| Admin time per cycle vs manual | −70 % | Survey (manual) |
| Candidate satisfaction | ≥ 4.0 / 5 | Post-test 1-question survey (Could) |

> The earlier "+15 % first-year retention" KPI can't be observed by this system (see
> [07-grilling.md](./07-grilling.md) Q20). Measure it outside the app by joining the CSV export
> with registrar data each year.

## 8. Release plan

| Release | Contents | Exit criteria |
|:--|:--|:--|
| **R0 Prototype (done)** | Frontend-only demo with mock data | Mid-defense presented |
| **R1 Prototype fixes** | Defects D-01…D-20 from [06](./06-open-issues-doc-gaps.md) fixed, scoring tests | All P0/P1 defects closed, `pnpm test` green |
| **R2 MVP backend** | Fastify + MongoDB, auth, question bank, exam cycles, server-side sessions + scoring, results, merit list, analytics | End-to-end journey J1/J2 against the real API; no localStorage authority |
| **R3 Pilot** | OTP, i18n (EN/BN), dark mode, a11y pass, load test, deploy | Pilot with one program's applicants (≈ 200 candidates) |
| **R4 University rollout** | All programs, reviewer scoping, hardening | Admission window run with ≥ 99.5 % availability |

## 9. Assumptions and open questions

These are **Assumed defaults** so agents aren't blocked. Each one must be confirmed by the
Office of Admissions. The canonical list is in [06-open-issues-doc-gaps.md](./06-open-issues-doc-gaps.md#3-open-product-questions).

| # | Question | Assumed default |
|:--|:--|:--|
| Q1 | Is the result an admission gate or advisory? | **Advisory recommendation.** The UI says "Recommendation: Eligible". The committee decides. |
| Q2 | Is the test mandatory? | Mandatory for all undergraduate applicants in a cycle |
| Q3 | Same thresholds for every program? | One default (50 % overall / 40 % per section). Admins can override **per program** |
| Q4 | What about 40–49 % overall with no failed section (the dead zone)? | **Conditionally Eligible** |
| Q5 | Show the result immediately? | Configurable per cycle; default **immediate** |
| Q6 | Hosting? | MongoDB Atlas (Mumbai region) for the pilot; DIU on-prem stays possible (see [20](./20-deployment-ops.md)) |
| Q7 | Can a candidate retake? | No: `maxAttempts = 1` per cycle, enforced by the server |
| Q8 | GPA/background eligibility checks at registration? | Collect GPA and group; **do not block**. Show to reviewers only |
