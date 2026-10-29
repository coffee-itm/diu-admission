# 15 — REST API Specification (`/api/v1`)

> **Status:** Target contract for R2. Fastify implementation guide: [16](./16-backend-architecture.md).
> Data shapes: [14](./14-database-schema.md). Requirement IDs: [13](./13-srs.md).
> Request/response schemas are Zod objects in `packages/shared/schemas/*`, used by both the
> server (validation + serialization) and the client (form validation + types in JSDoc).

---

## 1. Conventions

| Topic | Rule |
|:--|:--|
| Base URL | `https://<host>/api/v1`. In dev, Vite proxies `/api` → `http://localhost:4000` |
| Format | JSON, UTF-8, `camelCase` fields. Ids are strings (`id`, never `_id`) |
| Auth | `Authorization: Bearer <accessToken>` (JWT, 15 min). Refresh token in the `diu_rt` cookie (`httpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`) |
| Time | ISO-8601 UTC strings. Every response carries the header `X-Server-Time` (and session payloads carry `serverTime`) for clock sync |
| Success | `200` with the resource (or `{ items, page, limit, total }` for lists), `201` on create, `204` on delete/logout |
| Pagination | `?page=1&limit=20` (limit max 100). Sorting: `?sort=-createdAt` |
| Errors | `{ "error": { "code": "SESSION_EXPIRED", "message": "Human readable", "details": [{ "path": "email", "message": "..." }] } }` |
| Validation | `422 VALIDATION_ERROR` with `details[]` |
| Idempotency | Submit and autosave are idempotent by design (session id / `seq`). `POST /admin/questions/import` accepts an `Idempotency-Key` header |
| Rate limits | Global 300 req/min/IP. Auth: 10/min/IP and 5 failed logins/15 min/email. OTP send: 1/min, 5/hour per user. Autosave: 30/min per session |
| Versioning | Breaking changes → `/api/v2`. Additive fields are allowed in v1 |

### Roles legend
`P` public · `C` candidate · `R` reviewer (program-scoped) · `A` admin

### Error codes

| HTTP | Code | When |
|:--|:--|:--|
| 400 | `BAD_REQUEST` | Malformed JSON / CSV |
| 401 | `UNAUTHENTICATED` | Missing or expired access token |
| 401 | `INVALID_CREDENTIALS` | Login failed |
| 403 | `FORBIDDEN` | Role or program scope not allowed |
| 403 | `EMAIL_NOT_VERIFIED` | Candidate tries to start a test before verifying |
| 404 | `NOT_FOUND` | — |
| 409 | `EMAIL_TAKEN` | Register with an existing email |
| 409 | `ALREADY_ATTEMPTED` | Start a session when attempts are used up |
| 409 | `NO_ACTIVE_CYCLE` | No published cycle, or outside the window |
| 409 | `POOL_TOO_SMALL` | Active questions < `questionCount` for a section |
| 409 | `SESSION_EXPIRED` | Save/submit after deadline + grace |
| 409 | `SESSION_CLOSED` | Save on a submitted session |
| 409 | `CYCLE_LOCKED` | Edit a structural field after sessions started |
| 409 | `QUESTION_IN_USE` | Delete a served question |
| 409 | `RESULT_NOT_RELEASED` | Candidate result under the `after_window` policy |
| 422 | `VALIDATION_ERROR` | Schema failure |
| 429 | `RATE_LIMITED` | — |
| 500 | `INTERNAL` | Unexpected (logged with request id) |

---

## 2. Auth — `/auth`

| Method & path | Role | Request | Response | Notes |
|:--|:--|:--|:--|:--|
| `POST /auth/register` | P | `{ name, email, phone, password, programCode, sscGpa, hscGpa, hscGroup }` | `201 { user, accessToken }` + sets `diu_rt` | Always creates `candidate`. Sends a verify-email OTP (FR-AUTH-01, 05) |
| `POST /auth/login` | P | `{ email, password }` | `200 { user, accessToken }` + `diu_rt` | FR-AUTH-02 |
| `POST /auth/refresh` | P (cookie) | — | `200 { accessToken, user }` + rotated `diu_rt` | Reuse of a rotated token → 401 + family revoked |
| `POST /auth/logout` | any | — | `204`, clears cookie | Revokes the refresh token |
| `GET /auth/me` | any | — | `{ user }` | `user` = `{ id, role, name, email, phone, emailVerified, programCode?, programCodes?, preferences }` |
| `POST /auth/otp/send` | any | `{ purpose: 'verify_email' \| 'verify_phone' }` | `204` | Cooldown 60 s |
| `POST /auth/otp/verify` | any | `{ purpose, code }` | `200 { user }` | Max 5 attempts per OTP |
| `POST /auth/password/forgot` | P | `{ email }` | `204` (always) | Sends a reset OTP if the account exists |
| `POST /auth/password/reset` | P | `{ email, code, newPassword }` | `204` | Revokes all refresh tokens |
| `PATCH /auth/me` | any | `{ name?, phone?, preferences? }` | `{ user }` | A candidate can't change `programCode` after starting a session |

## 3. Public reference data

| Method & path | Role | Response |
|:--|:--|:--|
| `GET /programs` | P | `[{ id, name, nameBn, faculty }]` (active only) |
| `GET /cycles/current` | P | `{ id, title, status, startAt, endAt, totalTimeMinutes, sections:[{sectionId,name,questionCount}], totalQuestions, thresholds, instructions, instructionsBn, antiCheat:{warnAtTabSwitches,maxTabSwitches,maxFullscreenExits,requireFullscreen} }` or `404 NO_ACTIVE_CYCLE`. **Program overrides aren't exposed.** |

## 4. Candidate test sessions — `/sessions` (role C)

### `GET /sessions/current`
Returns the candidate's session for the current cycle, or `204` if none.
```json
{
  "id": "6720…", "status": "active", "serverTime": "2026-06-20T04:10:05.120Z",
  "startedAt": "…", "deadline": "…", "examCycleId": "…",
  "sections": [{ "sectionId": "MATH", "name": "Mathematical Reasoning", "questionIds": ["…", "…"] }],
  "questions": [{ "id": "…", "section": "MATH", "text": "…", "textBn": null,
                  "options": [{ "id": "c", "text": "35" }, { "id": "a", "text": "25" }, …] }],
  "answers": { "<qId>": "c" }, "flags": ["<qId>"], "visited": ["<qId>"],
  "position": { "sectionId": "MATH", "index": 3 }, "lastSeq": 41,
  "antiCheat": { "warnAtTabSwitches": 2, "maxTabSwitches": 5, "maxFullscreenExits": 3, "autoSubmitOnViolation": true, "requireFullscreen": true },
  "violationCounts": { "tabSwitch": 1, "fullscreenExit": 0 }
}
```
- Options are already in the served (shuffled) order. Option `id`s stay the original
  `a–d`, so an answer is the original option id. **No `correctAnswer`, no `explanation`.**
- For `submitted`/`expired` sessions, it returns `{ id, status, submittedAt, resultId }` only.
- Side effects: an `active` session past its deadline is finalized lazily (FR-TEST-09).
  `resumeCount` is incremented when called from a new page load (`?resume=1`).

### `POST /sessions`: start (FR-TEST-01/02)
Request `{ integrityAcceptedAt: ISO, client: { userAgent } }` → `201` with the same payload as `GET /sessions/current`.
Errors: `EMAIL_NOT_VERIFIED`, `NO_ACTIVE_CYCLE`, `ALREADY_ATTEMPTED`, `POOL_TOO_SMALL`.
If an `active` session already exists, it returns `200` with that session (resume), not an error.

### `PATCH /sessions/:id/state`: autosave (FR-TEST-06)
```json
{
  "seq": 42,
  "answers": { "<qId>": "b", "<qId2>": null },     // null = cleared; only changed entries
  "flags": ["<qId>"],                                  // full set
  "visited": ["<qId>", "<qId2>"],                      // full set
  "position": { "sectionId": "LOGIC", "index": 0 },
  "timeDeltasMs": { "<qId>": 5300 },
  "events": [{ "type": "tab_switch", "clientAt": "…", "detail": "hidden", "questionId": "<qId>" }]  // ≤ 100
}
```
Response `200 { lastSeq, serverTime, deadline, violationCounts, riskLevel, autoSubmitted: false }`.
- `seq ≤ lastSeq` → `200` with `ignored: true` (stale retry).
- If the server-counted violations cross the cycle thresholds and `autoSubmitOnViolation` is
  set, the server force-submits and returns `autoSubmitted: true, resultId` (the server
  enforces thresholds even if the client was tampered with).
- Errors: `SESSION_EXPIRED`, `SESSION_CLOSED`, `VALIDATION_ERROR` (unknown qId / option).

### `POST /sessions/:id/submit` (FR-TEST-08)
Request `{ seq, answers?, flags?, visited?, timeDeltasMs?, events?, reason: 'manual' | 'anti_cheat' }`
(a final flush plus submit in one call) → `200 { resultId, status }`. Idempotent: on a second
call it returns the same `resultId`. Allowed until `deadline + 30 s`. After that, the server
has already expired the session, and the call returns the expired session's `resultId` with
`status: 'expired'`.

### `GET /results/me`
`200` the candidate's result for the current (or `?cycleId=`) cycle:
`{ id, examCycle:{id,title}, programCode, sectionScores, sectionTotals, sectionPercentages, totalScore, totalQuestions, answeredCount, percentage, eligibility, failedSections, timeTaken, submittedAt }`,
or `409 RESULT_NOT_RELEASED { releaseAt }`. Used for the result page and the client-side PDF.

## 5. Admin & reviewer — `/admin`

> `R` endpoints are filtered automatically to `reviewer.programCodes` (empty = all). A request
> for a candidate or result outside the scope returns `404` (no existence leak).

### 5.1 Dashboard & analytics
| Method & path | Role | Query | Response |
|:--|:--|:--|:--|
| `GET /admin/analytics/summary` | R A | `cycleId, programCode?` | `{ totals:{registrations, started, completed, inProgress, passRate, avgPercentage}, eligibility:{ELIGIBLE,CONDITIONALLY_ELIGIBLE,NOT_ELIGIBLE}, sectionAverages:{MATH:…}, byProgram:[{programCode, registrations, completed, avgPercentage, eligible}], perDay:[{date, count}] }` |
| `GET /admin/analytics/questions` | A | `cycleId, section?` | `[{ questionId, code, correctRate, avgTimeMs, timesServed }]` (FR-ANL-05) |
| `GET /admin/results/recent` | R A | `limit=5` | `[{ id, candidateName, programCode, percentage, eligibility, submittedAt }]` |

### 5.2 Questions (A)
| Method & path | Request | Response |
|:--|:--|:--|
| `GET /admin/questions` | `page, limit, q, section, difficulty, status, tag, sort` | `{ items:[Question+correctAnswer+explanation], page, limit, total }` |
| `GET /admin/questions/:id` | — | `Question` (incl. key) |
| `POST /admin/questions` | `QuestionInput` | `201 Question` (status `draft` unless given) |
| `PATCH /admin/questions/:id` | partial `QuestionInput` | `Question` |
| `POST /admin/questions/:id/status` | `{ status }` | `Question` (valid transitions only) |
| `DELETE /admin/questions/:id` | — | `204`, or `409 QUESTION_IN_USE` (retire instead) |
| `POST /admin/questions/import?dryRun=true` | `multipart/form-data` field `file` (CSV ≤ 2 MB) | `{ imported, skipped, errors:[{ row, messages[] }] }` |
| `GET /admin/questions/export` | filters | `text/csv` (same columns as import) |

### 5.3 Exam cycles (A; R read-only GET)
| Method & path | Request | Response |
|:--|:--|:--|
| `GET /admin/cycles` | — | `[ExamCycle]` |
| `GET /admin/cycles/:id` | — | `ExamCycle` + `{ poolSizes:{MATH: n, …}, sessionsStarted }` |
| `POST /admin/cycles` | `ExamCycleInput` | `201 ExamCycle` (`draft`) |
| `PATCH /admin/cycles/:id` | partial | `ExamCycle`, or `409 CYCLE_LOCKED` for structural fields once `lockedAt` is set |
| `POST /admin/cycles/:id/publish` | — | Checks pool sizes ≥ counts. Closes no other cycle automatically: `409` if another is published |
| `POST /admin/cycles/:id/close` | — | Sets `closed`. Releases results if `after_window` |
| `POST /admin/cycles/:id/recompute` | `{ reason }` | `{ recomputed, changed }` (FR-SCORE-06) |

### 5.4 Candidates & results (R A)
| Method & path | Query / request | Response |
|:--|:--|:--|
| `GET /admin/candidates` | `page, limit, q, programCode, testStatus(not_started\|in_progress\|completed), eligibility, cycleId` | `{ items:[{ id, name, email, phone, programCode, registeredAt, emailVerified, testStatus, result:{percentage, eligibility}? , riskLevel? }], … }` |
| `GET /admin/candidates/:id` | `cycleId?` | `{ candidate, session:{ status, startedAt, submittedAt, submitReason, violationCounts, riskLevel, riskScore, review, resumeCount }, result }` |
| `GET /admin/candidates/:id/security` | `cycleId?` | `{ events:[…], questionTimes:[{ questionId, code, section, ms, answered }], fastAnswers }` |
| `GET /admin/merit-list` | `cycleId, programCode (required), eligibility?, includeDisqualified=false, page, limit` | `{ items:[{ rank, resultId, candidateId, candidateName, candidateEmail, programCode, totalScore, percentage, sectionPercentages, eligibility, timeTaken, submittedAt }], total }` |
| `GET /admin/merit-list.csv` | same filters (no paging) | `text/csv; charset=utf-8` with BOM (FR-RES-06) |
| `GET /admin/security/sessions` | `cycleId, riskLevel?, decision?(none\|cleared\|suspicious\|disqualified), page, limit` | Sessions for the review panel |
| `POST /admin/security/sessions/:id/review` | `{ decision, note }` (A only) | Updates `session.review` and `result.disqualified`; writes an audit log |

### 5.5 Users (A)
| Method & path | Request | Response |
|:--|:--|:--|
| `GET /admin/users?role=reviewer\|admin` | — | `[User]` |
| `POST /admin/users` | `{ role: 'reviewer'\|'admin', name, email, password, programCodes? }` | `201 User` |
| `PATCH /admin/users/:id` | `{ status?, programCodes?, role? }` | `User` (can't demote the last admin) |

### 5.6 Ops
| Method & path | Role | Response |
|:--|:--|:--|
| `GET /health` | P | `{ status: 'ok' }` (liveness) |
| `GET /ready` | P | `{ status: 'ok', db: 'ok' }` or `503` |

---

## 6. Frontend service → endpoint map

Replace the mock internals of `src/services/*` with calls through the new `src/services/api.js`
(see [17](./17-frontend-spec.md#4-data-layer)). Function names may stay the same.

| Current function (file) | Endpoint |
|:--|:--|
| `authService.login` (`src/services/authService.js:18`) | `POST /auth/login` |
| `authService.register` (`:34`) | `POST /auth/register` |
| — (new) `authService.refresh / logout / me / sendOtp / verifyOtp` | `/auth/*` |
| `testService.loadTest` (`src/services/testService.js:9`) | `POST /sessions` (start) / `GET /sessions/current` (resume) |
| — (new) `testService.saveState` | `PATCH /sessions/:id/state` |
| `testService.submitTest` (`:26`) | `POST /sessions/:id/submit` |
| `testService.getResultForCandidate` (`:44`) | `GET /results/me` |
| `resultService.getAll` (`src/services/resultService.js:5`) | `GET /admin/candidates` (with result) |
| `resultService.getForCandidate` | `GET /admin/candidates/:id` |
| `resultService.getMeritList` (`:29`) | `GET /admin/merit-list` |
| `analyticsService.getSummary` (`src/services/analyticsService.js:7`) | `GET /admin/analytics/summary` |
| `questionStore.*` (`src/store/questionStore.js`) → new `questionService` | `/admin/questions*` |
| `examConfigStore.*` (`src/store/examConfigStore.js`) → new `examCycleService` | `/cycles/current`, `/admin/cycles*` |

## 7. CSV formats

**Question import/export** (header row required, UTF-8):
```
section,text,option_a,option_b,option_c,option_d,correct_answer,difficulty,explanation,tags
MATH,"What is 15% of 200?",25,30,35,40,b,easy,"0.15 × 200 = 30",percentage|arithmetic
```

**Merit list export:**
```
rank,name,email,phone,program,total_score,percentage,math_pct,logic_pct,it_pct,english_pct,business_pct,eligibility,time_taken,submitted_at
1,"Ayesha Rahman",ayesha@example.com,+8801712345678,CSE,46,92.0,100,90,90,90,90,ELIGIBLE,38:12,2026-06-20 10:41
```
