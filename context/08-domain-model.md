# 08 — Domain Model

> Conceptual model. The physical MongoDB collections that implement it are in [14-database-schema.md](./14-database-schema.md):
> User → `users` · Program → `programs` (new since the pivot) · Question → `questions` · ExamConfig → `examCycles` ·
> TestSession (+ ServedPaper, Answers, SecurityEvents, timings embedded) → `testSessions` · Result → `results` ·
> OTP → `otpCodes` · audit trail → `auditLogs`. Role `reviewer` is now accepted (FR-AUTH-10). Users carry `programCode`.

## Ubiquitous Language → Entities

```
Candidate ──registers──▶ User(role=candidate) ──consents──▶ TestSession
Admin     ──authors────▶ Question ──pooled by──▶ Section ──composed into──▶ ExamConfig
Reviewer  ──reads──────▶ Result ──ranked into──▶ MeritList ──aggregated into──▶ Analytics

TestSession ──serves──▶ ServedPaper (snapshot: questionOrder + optionOrder)
TestSession ──records──▶ Answer[] + Flag[] + SecurityEvent[] + QuestionTiming[]
TestSession ──expires/submits──▶ ScoringRun ──yields──▶ Result(eligibility)
```

## Entities

### User
| Field | Type | Notes |
|:---|:---|:---|
| id | string | PK |
| name, email, phone | string | phone BD format |
| role | enum | `candidate` \| `admin` \| (`reviewer` — proposed) |
| passwordHash | string | production only |
| sscGpa, hscGpa | number | admission eligibility inputs |
| board, group | string | science-group check (brochure rule) |
| verified | bool | OTP status (planned) |

### Candidate (User projection)
Adds: registrationDate, testStatus (`NOT_STARTED` \| `IN_PROGRESS` \| `COMPLETED`).

### Question
| Field | Type | Notes |
|:---|:---|:---|
| id | string | `q_<section>_<n>` |
| section | enum | MATH, LOGIC, IT, ENGLISH, BUSINESS |
| text | string | |
| options | Option[4] | `{ id: a\|b\|c\|d, text }` |
| correctAnswer | optionId | |
| difficulty | enum | easy \| medium \| hard |
| explanation | string | post-test review, admin-facing |
| tags | string[] | topic taxonomy |
| status | enum | **proposed**: draft \| reviewed \| active \| retired |

### ExamConfig (per admission cycle)
Sections[] (id, name, questionCount, timeMinutes), totalTimeMinutes (54),
passingThresholds { overallMinPercent: 50, sectionMinPercent: 40 },
negativeMarking (false), maxAttempts (1), startDate, endDate.

### TestSession — **first-class, currently implicit**
The prototype keeps this in testStore/localStorage; production must persist it.
| Field | Type | Notes |
|:---|:---|:---|
| id | string | |
| candidateId | FK | |
| examConfigId | FK | |
| status | enum | ACTIVE \| SUBMITTED \| EXPIRED \| FORCE_SUBMITTED |
| startedAt, submittedAt | datetime | deadline = startedAt + totalTime |
| servedPaper | snapshot | questionOrder[], per-question optionOrder[] |
| answers | map | questionId → optionId |
| flags, visited | sets | |
| questionTimings | map | questionId → seconds |
| securityEvents | SecurityEvent[] | audit trail |

### Result
| Field | Type | Notes |
|:---|:---|:---|
| sessionId, candidateId | FK | |
| sectionScores, sectionPercentages | map | per section |
| totalScore / totalQuestions (50) | number | |
| percentage | number | |
| eligibility | enum | ELIGIBLE \| CONDITIONALLY_ELIGIBLE \| NOT_ELIGIBLE |
| failedSections | sectionId[] | sections < sectionMinPercent |
| timeTaken | seconds | |
| rank | derived | merit list: score desc, timeTaken asc tiebreak |

### SecurityEvent
`{ type, timestamp, detail }` — types: TAB_SWITCH, FULLSCREEN_EXIT, CLIPBOARD_BLOCKED,
RIGHT_CLICK, SHORTCUT_BLOCKED, DEVTOOLS_SUSPECTED, AUTO_SUBMIT_TRIGGERED.

## Invariants

1. One candidate ⇒ at most `maxAttempts` (1) TestSession per ExamConfig.
2. ServedPaper is immutable once the session starts (scoring depends on it).
3. Timer deadline is authoritative server-side in production; client clock is display-only.
4. Eligibility is a pure function of (answers, servedPaper, thresholds) — deterministic, re-computable.
5. Questions served must have status `active` at session start.
6. Test can start only inside [startDate, endDate] and after integrity consent.

## Classification function (formal)

```
let overall = totalScore/totalQuestions
let failed  = sections where sectionPct < sectionMinPercent

ELIGIBLE               ⟺ overall ≥ overallMin ∧ |failed| = 0
CONDITIONALLY_ELIGIBLE ⟺ ¬ELIGIBLE ∧ overall ≥ conditionalMin (40) ∧ |failed| ≤ maxFailed (2)
NOT_ELIGIBLE           ⟺ otherwise
```
This matches the current code (`src/lib/scoring.js:56-63`, where 40 and 2 are hard-coded) and FR-SCORE-04 (configurable).
The earlier version of this section said `1 ≤ |failed|`, which created a "dead zone" that **never existed in code**. See 07 Q7.

## State Machines

**TestSession:** `NOT_STARTED → ACTIVE → (SUBMITTED | EXPIRED | FORCE_SUBMITTED)` — terminal.
**Candidate flow:** `REGISTERED → INSTRUCTED(consent) → IN_TEST → RESULT_VIEWED`.

## Bounded Contexts

| Context | Owns | Prototype location |
|:---|:---|:---|
| Identity & Access | User, roles, OTP (planned) | features/auth, authStore |
| Assessment Authoring | Question lifecycle, ExamConfig | features/questions, questionStore, examConfigStore |
| Test Execution | TestSession, timer, autosave, anti-cheat events | features/test, testStore, antiCheatStore |
| Evaluation | Scoring rules, Result, eligibility | lib/scoring.js |
| Admissions Reporting | MeritList, Analytics, PDF/CSV export | pages/admin, resultService, analyticsService |