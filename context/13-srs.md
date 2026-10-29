# 13 — Software Requirements Specification (SRS)

> **Status:** Baseline v1.0 · **Last updated:** 2026-10-29
> **Scope:** DIU Admission R1–R4 (see [12-prd.md](./12-prd.md) §8).
> **Supersedes:** the external `SRS_Document.md` referenced by older docs (not in this repo).
> Each requirement has a stable ID. Code, tests and PR descriptions must cite these IDs.
> **Priority:** M = Must, S = Should, C = Could. **Release:** the first release that must satisfy it.

---

## 1. Introduction

### 1.1 Purpose
This document defines the functional and non-functional requirements for DIU Admission, a
university-wide online aptitude assessment. It is the **source of truth for behavior**. Where it
conflicts with any other document in `context/`, this document wins, except where an ADR in
[09-adrs.md](./09-adrs.md) is newer.

### 1.2 System context

```
 Candidate browser ─┐                       ┌─► MongoDB (replica set)
 Admin browser    ──┼─► React SPA ─HTTPS─► Fastify API ──┤
 Reviewer browser ─┘   (static/CDN)     /api/v1          └─► SMTP / SMS gateway (OTP)
```

- **Frontend:** React 19 SPA in the repo root (`src/`). See [17-frontend-spec.md](./17-frontend-spec.md).
- **Backend:** Fastify + Mongoose in `server/`. See [16-backend-architecture.md](./16-backend-architecture.md).
- **Data:** MongoDB. See [14-database-schema.md](./14-database-schema.md).
- **Contract:** REST `/api/v1`. See [15-api-spec.md](./15-api-spec.md).

### 1.3 Roles

| Role | Description |
|:--|:--|
| `candidate` | Applicant. Registers, takes one test per exam cycle, sees own result |
| `reviewer` | Committee member. Read-only access to candidates, results, merit list and analytics, **scoped to assigned programs** |
| `admin` | Office of Admissions. Full access to everything |

### 1.4 Definitions
See [10-glossary.md](./10-glossary.md). Key terms: Exam Cycle, Served Paper, Test Session,
Result, Risk Level, Program.

---

## 2. Functional requirements

### 2.1 Identity and access — `FR-AUTH`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-AUTH-01 | M | R2 | A visitor can register as a candidate with: full name (3–100 chars), email (unique, lowercased), BD mobile number (`^(\+?880)?1[3-9]\d{8}$`), program (one of the active programs), SSC GPA and HSC GPA (0.00–5.00), HSC group (`science`/`commerce`/`arts`/`other`), password (≥ 8 chars, at least one letter and one digit). | Invalid input returns 422 with per-field messages. A duplicate email returns 409. The password is stored only as an argon2id hash. |
| FR-AUTH-02 | M | R2 | A user logs in with email and password. On success the server issues a short-lived access JWT (15 min) and a rotating refresh token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie (7 days). | Wrong credentials return 401 with a generic message (doesn't reveal whether the email exists). 5 failed attempts per email per 15 min return 429. |
| FR-AUTH-03 | M | R2 | The SPA silently refreshes the access token with the refresh cookie. A refresh token can be used only once; reusing a rotated token revokes the whole token family. | Covered by integration tests for rotation and for reuse detection. |
| FR-AUTH-04 | M | R2 | Logout revokes the refresh token and clears **all** client test and anti-cheat state. | After logout, a different user on the same browser sees no previous session data. |
| FR-AUTH-05 | M | R3 | Email verification by 6-digit OTP (10-min expiry, max 5 attempts, resend cooldown 60 s). Unverified candidates can log in but **cannot start a test**. | `POST /sessions` returns 403 `EMAIL_NOT_VERIFIED` until verified. |
| FR-AUTH-06 | S | R3 | Password reset via email OTP. | A reset invalidates all refresh tokens for that user. |
| FR-AUTH-07 | C | R4 | SMS OTP through a pluggable BD SMS gateway. | Provider is chosen by env var; a console driver exists for dev. |
| FR-AUTH-08 | M | R2 | Route guards: candidate routes need the `candidate` role; admin routes need `admin`, or `reviewer` for read-only pages. The server enforces the same rules on every endpoint (the client guard is UX only). | RBAC matrix test in [18](./18-testing-strategy.md) passes. |
| FR-AUTH-09 | M | R1 | After login, the user is sent to the page they originally asked for (`location.state.from`) if their role is allowed there; otherwise to their role's dashboard. | Fixes defect D-14. |
| FR-AUTH-10 | M | R2 | Admins can create `reviewer` and `admin` accounts and set `reviewer.programCodes`. Public registration only ever creates candidates. | `POST /auth/register` ignores any `role` field. |

### 2.2 Exam cycle configuration — `FR-CFG`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-CFG-01 | M | R2 | An admin creates and edits an **Exam Cycle** with: title, `startAt`, `endAt` (Asia/Dhaka shown, UTC stored), sections (`{sectionId, questionCount, timeMinutes?}`), `totalTimeMinutes`, default thresholds (`overallMinPercent`, `sectionMinPercent`, `conditionalMinPercent`, `maxFailedSectionsForConditional`), `negativeMarking` (bool, default false), `maxAttempts` (default 1), `resultRelease` (`immediate`/`after_window`), `antiCheat` policy. | Validation: `startAt < endAt`; each `questionCount` ≥ 1 and ≤ the active pool size for that section when publishing; thresholds 0–100. |
| FR-CFG-02 | M | R2 | Per-program threshold overrides: `programOverrides[{programCode, thresholds}]`. Scoring uses the override for the candidate's program if one exists, else the default. | Unit test: a CSE override (60/50) changes the CSE classification only. |
| FR-CFG-03 | M | R2 | Cycle status: `draft → published → closed → archived`. Only **one** cycle may be `published` at a time. Structural fields (sections, counts, time) are **locked** once any session has started. Thresholds stay editable and trigger FR-SCORE-06. | Editing a locked field returns 409 `CYCLE_LOCKED`. |
| FR-CFG-04 | M | R1 | The test **must** use the active cycle's config. Nothing may read `mockExamConfig` directly at runtime. Instructions/Dashboard copy (question count, minutes, thresholds) comes from the config. | Fixes D-08 and D-17. |
| FR-CFG-05 | C | R4 | Per-section time limits are enforced when `timeMinutes` is set and `enforceSectionTime = true`. Otherwise `timeMinutes` is informational only. | Resolves ADR-004. Default: off. |

### 2.3 Question bank — `FR-QB`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-QB-01 | M | R2 | Admin CRUD for questions: section, text (5–1000 chars), exactly 4 options `a–d` (1–300 chars, unique text), `correctAnswer ∈ {a,b,c,d}`, difficulty, explanation (optional), tags (0–10, lowercased), status. | 422 on violation; the Zod schema is shared between client and server (`packages/shared`). |
| FR-QB-02 | M | R2 | Lifecycle `draft → reviewed → active → retired`. Only `active` questions can be served. A question that has ever been served can't be hard-deleted, only retired. | `DELETE` on a served question returns 409 `QUESTION_IN_USE`. |
| FR-QB-03 | M | R2 | List with server-side pagination, text search, and filters (section, difficulty, status, tag). | p95 < 300 ms at 5,000 questions. |
| FR-QB-04 | M | R2 | CSV bulk import. Columns: `section,text,option_a,option_b,option_c,option_d,correct_answer,difficulty,explanation,tags` (tags separated by `|`). Max 2 MB / 2,000 rows. Valid rows are imported as `draft`. Invalid rows are reported (row number + messages) and skipped. A dry-run mode exists. | Response `{imported, skipped, errors:[{row, messages}]}`. Fixes the D-11 stub. |
| FR-QB-05 | S | R3 | Duplicate detection: the same normalized text in the same section gets a warning on create/import. | — |
| FR-QB-06 | M | R1 | The question form edits tags. | Fixes D-19. |
| FR-QB-07 | M | R1 | Fix the wrong answer key for `q_logic_010` (correct is `a` = 15). | Fixes D-01. |

### 2.4 Test engine — `FR-TEST`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-TEST-01 | M | R2 | A candidate can start a session only if: email verified, a cycle is `published` and `now ∈ [startAt, endAt]`, no existing session for this cycle (unless `maxAttempts > 1`), and the integrity declaration was accepted (`integrityAcceptedAt` sent with the start request). | Each violation returns a distinct error code (see [15](./15-api-spec.md#error-codes)). |
| FR-TEST-02 | M | R2 | On start, the server builds the **Served Paper**: for each section in cycle order, randomly sample `questionCount` questions from that section's `active` pool, shuffle their order, and shuffle each question's option order. It stores a snapshot (question ids plus option order) and returns the questions **without `correctAnswer` or `explanation`**. | Security test: no response to a candidate ever contains `correctAnswer`. |
| FR-TEST-03 | M | R2 | Deadline `= startedAt + totalTimeMinutes`. The client shows `deadline − serverNow`; it syncs clock offset from the `serverTime` field on every response. | Closing the tab doesn't pause the timer (fixes D-06). |
| FR-TEST-04 | M | R2 | One question per screen with 4 radio options, previous/next **across** section boundaries, section tabs, and a question grid with statuses `not_visited`, `answered`, `skipped` (visited, unanswered), `flagged`. The first question shown is marked visited. | Fixes D-07. |
| FR-TEST-05 | M | R2 | A candidate can select, change and clear an answer, and flag/unflag a question. | — |
| FR-TEST-06 | M | R2 | Autosave: the client sends dirty state (answers, flags, visited, current position, per-question time deltas) every **5 s** while dirty and on every section change. Saves are idempotent and carry an increasing `seq`; the server ignores stale `seq`. While offline the client queues saves and flushes them on reconnect. | Killing the network for 60 s then restoring loses no answers. |
| FR-TEST-07 | M | R2 | Resume: if an `active` session exists, the dashboard shows **Resume test**. Resuming on any device restores answers, flags, position and remaining time from the server. | Fixes D-13. `resumeCount` is incremented. |
| FR-TEST-08 | M | R2 | Submit needs confirmation (dialog shows answered/unanswered/flagged counts). Submit is idempotent: a second submit returns the existing result. | — |
| FR-TEST-09 | M | R2 | The server finalizes any `active` session whose deadline has passed (grace 30 s) with its last saved answers, as status `expired`. This happens both lazily on the next request and in a 1-minute sweep job. | A session left open past its deadline gets a result without any client action. |
| FR-TEST-10 | M | R2 | Saves arriving after `deadline + 30 s` are rejected with 409 `SESSION_EXPIRED`. | — |
| FR-TEST-11 | M | R1 | Timer turns warning-coloured and pulses under 5 min, using the mono font. | Exists; keep. |
| FR-TEST-12 | M | R1 | In the prototype (R1), retakes are blocked, the attempt-count check uses `examConfig.maxAttempts`, and logout clears test state. | Fixes D-12 and D-15. |

### 2.5 Anti-cheat and integrity — `FR-AC`

Philosophy: **deterrence + audit, not prevention** (ADR-005).

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-AC-01 | M | R1 | The integrity declaration checkbox must be ticked before Start. Its timestamp is stored on the session. | — |
| FR-AC-02 | M | R1 | Detect and log `tab_switch` (visibilitychange hidden), `fullscreen_exit`, `copy_attempt`, `paste_attempt`, `cut_attempt`, `right_click`, `blocked_key`, `devtools_open` (heuristic), `fullscreen_entered`, `integrity_agreed`, `auto_submit_cheat`. | Counters increment **every** time (fixes D-02, the stale closure). Regression test exists. |
| FR-AC-03 | M | R1 | Warning modal from `warnAtTabSwitches` (default 2). Auto-submit at `maxTabSwitches` (5) or `maxFullscreenExits` (3) if `autoSubmitOnViolation` is true (default true). Auto-submit sends the **current** answers. | Fixes D-03. |
| FR-AC-04 | M | R1 | Fullscreen is requested inside the Start button's click handler (a user gesture), with a "Return to fullscreen" button in the warning modal. On iOS Safari (no Fullscreen API) the check is skipped and an event `fullscreen_unsupported` is logged. | Fixes D-04. |
| FR-AC-05 | M | R2 | Events are batched to `POST /sessions/:id/events` with every autosave (max 100 per batch). The server stores them on the session, adds a server timestamp, and recomputes `violationCounts` and `riskLevel` on the server. | Client-reported counters are never trusted for risk. |
| FR-AC-06 | M | R2 | Risk level from weighted violations `W = 2·tab + 2·fullscreenExit + 3·devtools + 1·(copy+paste+cut) + 0.5·(rightClick+blockedKey)`: **Low** < 4, **Medium** 4–9.5, **High** ≥ 10. Also flag `fastAnswers` when more than 30 % of answered questions took under 3 s. | Unit-tested on the shared function. |
| FR-AC-07 | M | R2 | Admin security review: list of sessions filtered by risk level, with event timeline, time per question, and a review decision (`cleared`/`suspicious`/`disqualified` + note) recorded in `auditLogs`. A `disqualified` result is shown to reviewers with a badge and excluded from merit lists by default. | Fixes D-05 (anti-cheat summary not persisted) and the "admin review panel" gap. |

### 2.6 Scoring — `FR-SCORE`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-SCORE-01 | M | R1 | Scoring is a **pure function** in `packages/shared/scoring.js`, used by the server (authoritative) and the prototype. Input: served questions with keys, answers, thresholds, `timeTaken`. | Same input gives the same output (deterministic). |
| FR-SCORE-02 | M | R1 | +1 per correct answer, 0 for wrong or blank. If `negativeMarking` is set, `−negativeMarkValue` per wrong answer, floored at 0 per section. | — |
| FR-SCORE-03 | M | R1 | Section % = correct ÷ served-in-section × 100. Overall % = total correct ÷ total served × 100. Classification compares **unrounded** values. Values are rounded to 1 decimal for display and storage. | Test: 49.99… is not ≥ 50. |
| FR-SCORE-04 | M | R1 | Classification (thresholds from the program override or the cycle default): **ELIGIBLE** if overall ≥ `overallMinPercent` and there are 0 failed sections. Else **CONDITIONALLY_ELIGIBLE** if overall ≥ `conditionalMinPercent` (default 40) and failed sections ≤ `maxFailedSectionsForConditional` (default 2). This includes the former dead zone. Else **NOT_ELIGIBLE**. A failed section is one where section % < `sectionMinPercent`. | Boundary table in [18](./18-testing-strategy.md#31-scoring-boundary-table). Replaces the hard-coded 40/2 (D-09). |
| FR-SCORE-05 | M | R2 | A result stores: sectionScores, sectionTotals, sectionPercentages, totalScore, totalQuestions, percentage, eligibility, failedSections, timeTaken, answeredCount, the thresholds used (snapshot), and the program code. | — |
| FR-SCORE-06 | S | R2 | An admin can **recompute** all results of a cycle after a threshold change or a corrected answer key. The change and counts are written to `auditLogs`. | Old values kept in `results.history[]`. |
| FR-SCORE-07 | M | R2 | UI wording: "Recommendation: Eligible / Conditionally Eligible / Not Eligible" (advisory, PRD Q1). | — |

### 2.7 Results and merit list — `FR-RES`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-RES-01 | M | R1 | The candidate result page shows total, %, eligibility badge, section score cards, time taken, and a PDF download. With `resultRelease = after_window` it shows "Results will be published on <endAt>". | — |
| FR-RES-02 | M | R2 | PDF report (client-side jsPDF) shows: DIU header, cycle title (from data, not hard-coded), candidate name/email/program, the section table, eligibility, a generation timestamp, and the result id. | Fixes the hard-coded "Spring 2026". |
| FR-RES-03 | M | R1 | Admin candidates list shows **all** registered candidates (not only the mocks), with search (name/email/phone), filters (program, test status, eligibility), and pagination. | Fixes D-10. |
| FR-RES-04 | M | R1 | Candidate detail: profile, result, section breakdown, security report (counts, risk level, event timeline, time per question), PDF. | Fixes D-05 and D-16. |
| FR-RES-05 | M | R2 | Merit list **per program**: rank by percentage desc, then timeTaken asc, then submittedAt asc. Standard competition ranking (1,2,2,4). Excludes `disqualified` by default. Filter by eligibility. Reviewers see only their programs. | Aggregation in [14](./14-database-schema.md#43-merit-list). |
| FR-RES-06 | M | R1 | Merit list CSV export (UTF-8 with BOM so Excel shows Bangla). Columns: rank, name, email, phone, program, totalScore, percentage, MATH…BUSINESS %, eligibility, timeTaken (mm:ss), submittedAt (Asia/Dhaka). Also a PDF export. | Fixes the D-11 stub. |

### 2.8 Analytics — `FR-ANL`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-ANL-01 | M | R1 | Cards: total registrations (counted once each, fixes D-18), sessions started, completed, pass rate (eligible ÷ completed), average %. | — |
| FR-ANL-02 | M | R1 | Bar chart: average % per section. Pie chart: eligibility distribution. | — |
| FR-ANL-03 | M | R2 | All analytics can be filtered by cycle and program. A table shows each program's registrations, completed, average % and eligibility split. | — |
| FR-ANL-04 | S | R2 | Line chart: submissions per day across the window, from real data (fixes D-20, which is hard-coded today). | — |
| FR-ANL-05 | C | R4 | Per-question stats: % correct and average time, for bank quality. | — |

### 2.9 Internationalization and theming — `FR-I18N`

| ID | Pri | Rel | Requirement | Acceptance criteria |
|:--|:--|:--|:--|:--|
| FR-I18N-01 | M | R3 | All UI strings come from `src/i18n/en.json` and `src/i18n/bn.json` through `useT()`. The language toggle sits in the header; the choice persists (`diu-lang`) and sets `<html lang>`. | No hard-coded user-facing English in JSX (lint/grep check). |
| FR-I18N-02 | M | R3 | Candidate-facing pages and instructions are fully translated to Bangla. Admin pages may fall back to English. | — |
| FR-I18N-03 | S | R3 | Questions may have an optional `textBn`/`options[].textBn`; the test shows Bangla when available and the language is `bn`. | — |
| FR-I18N-04 | M | R3 | Dark mode toggle (system / light / dark), persisted (`diu-theme`), implemented with Tailwind `dark:` variants and the existing tokens. | Contrast still passes AA in both themes. |
| FR-I18N-05 | M | R3 | Numbers and dates are formatted per locale (Bangla digits optional), with Asia/Dhaka time zone for display. | — |

---

## 3. Non-functional requirements — `NFR`

| ID | Category | Requirement |
|:--|:--|:--|
| NFR-01 | Performance | Candidate route JS ≤ **300 KB gzipped** at first load. Admin code (Recharts, jsPDF) is lazy-loaded. p95 LCP < 3 s on "Fast 3G" throttling at 360 px. |
| NFR-02 | Performance | API p95 latency < 300 ms for autosave/session endpoints at 1,000 concurrent active sessions; < 1 s for analytics. |
| NFR-03 | Capacity | Designed for 30,000 registrations per cycle and **2,000 concurrent test sessions** (autosave ≈ 400 writes/s peak). |
| NFR-04 | Availability | ≥ 99.5 % during an open exam window. MongoDB replica set (3 nodes). No single-node API in production. |
| NFR-05 | Durability | No acknowledged autosave is lost (`writeConcern: majority`). Daily backups, 30-day retention, quarterly restore drill. |
| NFR-06 | Security | OWASP ASVS L1 baseline: argon2id passwords, JWT HS256 with a secret ≥ 32 bytes (RS256 optional), HTTPS only, Helmet headers + CSP, CORS allowlist, rate limiting, input validation on every endpoint, no answer keys sent to candidates, audit log for admin writes. |
| NFR-07 | Privacy | Collect only the PII needed (name, email, phone, GPA, program). Data stays in the agreed region (Atlas Mumbai or DIU on-prem). Candidates can download their own data. Retention: sessions + events 1 year after the cycle closes, results 5 years (configurable). Follows the Bangladesh Personal Data Protection framework / ICT Act guidance. |
| NFR-08 | Accessibility | WCAG 2.2 AA: keyboard operable (including answering with 1–4/A–D keys, which are **not** blocked), visible focus, labels on every control, `aria-live` for timer warnings (not every second), contrast ≥ 4.5:1, touch targets ≥ 24 px. |
| NFR-09 | Responsiveness | Every view works at 360 px, 768 px and 1280 px with no horizontal scroll. |
| NFR-10 | Browser support | Last 2 versions of Chrome, Edge, Firefox and Safari; Chrome Android ≥ 100; Samsung Internet ≥ 18. |
| NFR-11 | Testability | Every interactive element has a unique `id` (AGENTS.md rule). Coverage ≥ 80 % on `packages/shared` and `server/src/modules/*/service.js`. |
| NFR-12 | Observability | Structured JSON logs (pino) with request id; `/health` (liveness) and `/ready` (DB ping); error tracking (Sentry or equivalent); dashboard of active sessions during a window. |
| NFR-13 | Maintainability | JavaScript (ESM) everywhere; React Compiler rules (no manual memo); ESLint clean; Conventional Commits. |
| NFR-14 | Time | All timestamps stored in UTC (`Date`). Displayed in Asia/Dhaka. The server clock is authoritative. |

---

## 4. Constraints

- Frontend stack fixed by AGENTS.md: React 19 + Vite + React Compiler + Tailwind v4 + React Router v7 (`react-router`) + Zustand. Package manager: pnpm.
- Backend: Fastify 5 + Mongoose 8 on Node.js ≥ 22 LTS (ADR-014).
- Database: MongoDB ≥ 7 (ADR-013).
- No paid proctoring services. The budget assumes Atlas M10 or a DIU VM.

## 5. Traceability

Every FR maps to a roadmap task in [19-implementation-roadmap.md](./19-implementation-roadmap.md),
and every defect ID (D-xx) to [06-open-issues-doc-gaps.md](./06-open-issues-doc-gaps.md).
