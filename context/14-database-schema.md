# 14 — Database Design (MongoDB + Mongoose)

> **Decision:** MongoDB ≥ 7 with Mongoose 8. See ADR-013/014 in [09-adrs.md](./09-adrs.md).
> **Status:** Target design for R2. Nothing here exists in code yet.
> Models live in `server/src/modules/<domain>/model.js` ([16](./16-backend-architecture.md)).

---

## 1. Principles

1. **Model documents on how data is accessed.** A test session is read and written as one unit
   (autosave), so answers, flags, timings and security events are **embedded** in it.
   Results are queried and ranked on their own, so they get their own collection.
2. **Snapshot what scoring depends on.** The served paper (question ids + option order) and
   the thresholds used are copied into the session/result. Later edits to questions or config
   never silently change a past result (invariant I-2 in [08](./08-domain-model.md)).
3. **The answer key never leaves the server** for candidates. `questions.correctAnswer` and
   `explanation` have `select: false`. Candidate-facing projections are built explicitly.
4. **The database enforces the invariants** (unique indexes) instead of relying only on
   application checks.
5. All timestamps are UTC `Date`. Every collection has `timestamps: true` (`createdAt`, `updatedAt`).
6. Documents use `ObjectId` `_id`, except `programs` (`_id` = program code such as `"CSE"`).

## 2. Collections overview

| Collection | Purpose | Approx. size / cycle | Key relations |
|:--|:--|:--|:--|
| `users` | Candidates, reviewers, admins | 30 k | `programCode → programs._id` |
| `programs` | 13 DIU programs (seeded) | 13 | — |
| `questions` | Question bank with lifecycle | 500 → 5 k | — |
| `examCycles` | One admission round's config | 2–3 / year | — |
| `testSessions` | One attempt: served paper, answers, events | 30 k | `candidateId`, `examCycleId` |
| `results` | Scored outcome (1 per submitted session) | 30 k | `sessionId`, `candidateId`, `examCycleId` |
| `otpCodes` | Email/SMS OTPs (TTL) | transient | `userId` |
| `refreshTokens` | Rotating refresh tokens (TTL) | transient | `userId` |
| `auditLogs` | Admin writes, reviews, recomputes | 10 k | `actorId` |

```
programs ◄── users(candidate) ──1:N── testSessions ──1:1── results
                                        │   ▲
examCycles ──1:N────────────────────────┘   │ (servedPaper.questionIds)
questions ───────────────────────────────────┘
```

## 3. Schemas

> Written as Mongoose definitions. Shared enums come from `packages/shared/constants.js`
> (`SECTION_IDS = ['MATH','LOGIC','IT','ENGLISH','BUSINESS']`, `ROLES`, `ELIGIBILITY`,
> `QUESTION_STATUS`, `SESSION_STATUS`, `SECURITY_EVENT_TYPES`).

### 3.1 `programs`

```js
const ProgramSchema = new Schema({
  _id:     { type: String, uppercase: true, match: /^[A-Z]{2,10}$/ }, // 'CSE'
  name:    { type: String, required: true },                        // 'B.Sc. in Computer Science & Engineering'
  nameBn:  { type: String },
  faculty: { type: String, required: true, enum: ['Science & Technology', 'Business & Entrepreneurship', 'Arts & Humanities'] },
  active:  { type: Boolean, default: true },
}, { timestamps: true });
```
Seed: the 13 entries in `src/lib/constants.js:8-22` (`PROGRAMS`).

### 3.2 `users`

```js
const UserSchema = new Schema({
  role:          { type: String, enum: ['candidate', 'reviewer', 'admin'], required: true, index: true },
  name:          { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  email:         { type: String, required: true, lowercase: true, trim: true },
  phone:         { type: String, trim: true },                       // normalized +8801XXXXXXXXX
  passwordHash:  { type: String, required: true, select: false },    // argon2id
  emailVerifiedAt: { type: Date, default: null },
  phoneVerifiedAt: { type: Date, default: null },
  status:        { type: String, enum: ['active', 'disabled'], default: 'active' },
  lastLoginAt:   Date,
  failedLogins:  { count: { type: Number, default: 0 }, lockedUntil: Date },

  // candidate-only
  candidate: {
    programCode: { type: String, ref: 'Program' },
    sscGpa:      { type: Number, min: 0, max: 5 },
    hscGpa:      { type: Number, min: 0, max: 5 },
    hscGroup:    { type: String, enum: ['science', 'commerce', 'arts', 'other'] },
    board:       String,
  },
  // reviewer-only
  reviewer: {
    programCodes: [{ type: String, ref: 'Program' }],               // empty = all programs
  },
  preferences: { lang: { type: String, enum: ['en', 'bn'], default: 'en' } },
}, { timestamps: true });

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
UserSchema.index({ role: 1, 'candidate.programCode': 1, createdAt: -1 });
UserSchema.index({ name: 'text', email: 'text', phone: 'text' });   // admin search
```

`toJSON` transform: drop `passwordHash`, `failedLogins` and `__v`; rename `_id` → `id`.

### 3.3 `questions`

```js
const OptionSchema = new Schema({
  id:     { type: String, enum: ['a', 'b', 'c', 'd'], required: true },
  text:   { type: String, required: true, maxlength: 300 },
  textBn: { type: String, maxlength: 300 },
}, { _id: false });

const QuestionSchema = new Schema({
  code:          { type: String, required: true },                   // 'q_math_001' (human id, also used by CSV)
  section:       { type: String, enum: SECTION_IDS, required: true },
  text:          { type: String, required: true, minlength: 5, maxlength: 1000 },
  textBn:        String,
  options:       { type: [OptionSchema], validate: v => v.length === 4 },
  correctAnswer: { type: String, enum: ['a', 'b', 'c', 'd'], required: true, select: false },
  explanation:   { type: String, select: false },
  difficulty:    { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  tags:          { type: [String], default: [] },
  status:        { type: String, enum: ['draft', 'reviewed', 'active', 'retired'], default: 'draft' },
  timesServed:   { type: Number, default: 0 },                       // > 0 ⇒ cannot hard-delete
  stats:         { correctRate: Number, avgTimeMs: Number },         // FR-ANL-05, filled by a job
  createdBy:     { type: Types.ObjectId, ref: 'User' },
  updatedBy:     { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

QuestionSchema.index({ code: 1 }, { unique: true });
QuestionSchema.index({ section: 1, status: 1, difficulty: 1 });      // pool sampling + filters
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ text: 'text', tags: 'text' });
```

Code generation: `q_<section lower>_<zero-padded seq>`, using a per-section counter
(a `counters` doc or `max+1` inside a transaction).

### 3.4 `examCycles`

```js
const ThresholdsSchema = new Schema({
  overallMinPercent:               { type: Number, min: 0, max: 100, default: 50 },
  sectionMinPercent:               { type: Number, min: 0, max: 100, default: 40 },
  conditionalMinPercent:           { type: Number, min: 0, max: 100, default: 40 },
  maxFailedSectionsForConditional: { type: Number, min: 0, max: 5, default: 2 },
}, { _id: false });

const ExamCycleSchema = new Schema({
  title:            { type: String, required: true },                // 'DIU Admission — Spring 2026'
  status:           { type: String, enum: ['draft', 'published', 'closed', 'archived'], default: 'draft', index: true },
  startAt:          { type: Date, required: true },
  endAt:            { type: Date, required: true },
  totalTimeMinutes: { type: Number, required: true, min: 5, max: 240, default: 54 },
  sections: [{
    _id: false,
    sectionId:     { type: String, enum: SECTION_IDS, required: true },
    questionCount: { type: Number, required: true, min: 1 },
    timeMinutes:   { type: Number, min: 1 },                         // informational unless enforceSectionTime
  }],
  enforceSectionTime: { type: Boolean, default: false },             // FR-CFG-05
  thresholds:       { type: ThresholdsSchema, default: () => ({}) },
  programOverrides: [{ _id: false, programCode: { type: String, ref: 'Program' }, thresholds: ThresholdsSchema }],
  negativeMarking:  { enabled: { type: Boolean, default: false }, value: { type: Number, default: 0.25 } },
  maxAttempts:      { type: Number, default: 1, min: 1 },
  resultRelease:    { type: String, enum: ['immediate', 'after_window'], default: 'immediate' },
  antiCheat: {
    warnAtTabSwitches:     { type: Number, default: 2 },
    maxTabSwitches:        { type: Number, default: 5 },
    maxFullscreenExits:    { type: Number, default: 3 },
    autoSubmitOnViolation: { type: Boolean, default: true },
    requireFullscreen:     { type: Boolean, default: true },
  },
  instructions:    [String],
  instructionsBn:  [String],
  lockedAt:        Date,                                             // set when first session starts (FR-CFG-03)
}, { timestamps: true });

// at most one published cycle
ExamCycleSchema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: 'published' } });
```

Seed: from `src/data/mockExamConfig.js` (rename `passingThresholds` → `thresholds` and add the
two conditional fields).

### 3.5 `testSessions`, the core document

```js
const ServedQuestionSchema = new Schema({
  questionId:  { type: Types.ObjectId, ref: 'Question', required: true },
  section:     { type: String, enum: SECTION_IDS, required: true },
  optionOrder: { type: [String], required: true },                   // e.g. ['c','a','d','b']
}, { _id: false });

const SecurityEventSchema = new Schema({
  type:       { type: String, enum: SECURITY_EVENT_TYPES, required: true },
  clientAt:   { type: Date, required: true },
  serverAt:   { type: Date, default: Date.now },
  detail:     { type: String, maxlength: 200 },
  questionId: Types.ObjectId,
}, { _id: false });

const TestSessionSchema = new Schema({
  candidateId:  { type: Types.ObjectId, ref: 'User', required: true },
  examCycleId:  { type: Types.ObjectId, ref: 'ExamCycle', required: true },
  attempt:      { type: Number, default: 1 },
  programCode:  { type: String, required: true },                    // snapshot at start
  status:       { type: String, enum: ['active', 'submitted', 'expired', 'force_submitted'], default: 'active' },

  integrityAcceptedAt: { type: Date, required: true },
  startedAt:    { type: Date, required: true },
  deadline:     { type: Date, required: true },                      // startedAt + totalTimeMinutes
  submittedAt:  Date,
  submitReason: { type: String, enum: ['manual', 'timeout', 'anti_cheat'] },

  servedPaper:  { type: [ServedQuestionSchema], required: true },    // IMMUTABLE after insert
  // state: keyed by questionId string
  answers:      { type: Map, of: String, default: {} },              // qId → 'a'..'d'
  flags:        { type: [String], default: [] },                     // qIds
  visited:      { type: [String], default: [] },
  questionTimeMs: { type: Map, of: Number, default: {} },
  position:     { sectionId: String, index: Number },
  lastSeq:      { type: Number, default: 0 },                        // autosave idempotency
  lastSavedAt:  Date,
  resumeCount:  { type: Number, default: 0 },

  securityEvents:  { type: [SecurityEventSchema], default: [] },     // capped at 2,000 by the service
  violationCounts: {
    tabSwitch: { type: Number, default: 0 }, fullscreenExit: { type: Number, default: 0 },
    copy: { type: Number, default: 0 }, paste: { type: Number, default: 0 }, cut: { type: Number, default: 0 },
    rightClick: { type: Number, default: 0 }, blockedKey: { type: Number, default: 0 }, devtools: { type: Number, default: 0 },
  },
  riskScore:    { type: Number, default: 0 },
  riskLevel:    { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  review: {
    decision:   { type: String, enum: ['cleared', 'suspicious', 'disqualified'] },
    note:       String,
    reviewedBy: { type: Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  client: { userAgent: String, ip: String },                         // ip stored hashed (sha256 + pepper)
}, { timestamps: true });

// INVARIANT I-1: one session per attempt per candidate per cycle
TestSessionSchema.index({ candidateId: 1, examCycleId: 1, attempt: 1 }, { unique: true });
// expiry sweep
TestSessionSchema.index({ status: 1, deadline: 1 });
// security review list
TestSessionSchema.index({ examCycleId: 1, riskLevel: 1, 'review.decision': 1 });
```

**Autosave write** (one round trip, optimistic on `seq` and deadline):

```js
await TestSession.updateOne(
  { _id, candidateId, status: 'active', deadline: { $gt: new Date(Date.now() - GRACE_MS) }, lastSeq: { $lt: seq } },
  { $set: { [`answers.${qId}`]: opt /* per changed entry */, flags, visited, position, lastSeq: seq, lastSavedAt: new Date() },
    $unset: { /* cleared answers */ },
    $inc:  { /* questionTimeMs.<qId>: delta */ } },
  { writeConcern: { w: 'majority' } },
);
// matchedCount 0 → re-read to tell apart: stale seq (200, ignored) | expired (409) | not found (404)
```

Events are appended with `$push: { securityEvents: { $each: batch, $slice: -2000 } }` and
`$inc` on `violationCounts`. Risk is recomputed with the shared `computeRisk()`.

### 3.6 `results`

```js
const ResultSchema = new Schema({
  sessionId:    { type: Types.ObjectId, ref: 'TestSession', required: true },
  candidateId:  { type: Types.ObjectId, ref: 'User', required: true },
  examCycleId:  { type: Types.ObjectId, ref: 'ExamCycle', required: true },
  programCode:  { type: String, required: true },
  // denormalized for fast lists/exports (refreshed if the user edits their profile)
  candidateName:  String,
  candidateEmail: String,

  sectionScores:      { type: Map, of: Number },   // { MATH: 7, ... }
  sectionTotals:      { type: Map, of: Number },   // { MATH: 10, ... }
  sectionPercentages: { type: Map, of: Number },
  totalScore:     Number,
  totalQuestions: Number,
  answeredCount:  Number,
  percentage:     Number,                           // 1 decimal
  eligibility:    { type: String, enum: ['ELIGIBLE', 'CONDITIONALLY_ELIGIBLE', 'NOT_ELIGIBLE'], required: true },
  failedSections: [String],
  timeTaken:      Number,                           // seconds, min(submittedAt, deadline) − startedAt
  submittedAt:    { type: Date, required: true },
  thresholdsUsed: ThresholdsSchema,                 // snapshot
  riskLevel:      String,                           // copied from session at scoring; updated on review
  disqualified:   { type: Boolean, default: false },
  releasedAt:     Date,                             // null until released (after_window policy)
  history: [{ _id: false, at: Date, by: Types.ObjectId, reason: String, eligibility: String, percentage: Number }],
}, { timestamps: true });

ResultSchema.index({ sessionId: 1 }, { unique: true });              // idempotent submit
ResultSchema.index({ examCycleId: 1, programCode: 1, disqualified: 1, percentage: -1, timeTaken: 1, submittedAt: 1 }); // merit list
ResultSchema.index({ candidateId: 1, examCycleId: 1 });
ResultSchema.index({ examCycleId: 1, eligibility: 1 });
```

### 3.7 `otpCodes`

```js
const OtpSchema = new Schema({
  userId:    { type: Types.ObjectId, ref: 'User', required: true },
  channel:   { type: String, enum: ['email', 'sms'], required: true },
  purpose:   { type: String, enum: ['verify_email', 'verify_phone', 'reset_password'], required: true },
  codeHash:  { type: String, required: true },     // sha256(code + pepper); never store the code itself
  attempts:  { type: Number, default: 0 },          // max 5
  expiresAt: { type: Date, required: true },        // now + 10 min
}, { timestamps: true });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });          // TTL
OtpSchema.index({ userId: 1, purpose: 1, createdAt: -1 });
```

### 3.8 `refreshTokens`

```js
const RefreshTokenSchema = new Schema({
  userId:     { type: Types.ObjectId, ref: 'User', required: true, index: true },
  familyId:   { type: String, required: true, index: true },        // rotation chain
  tokenHash:  { type: String, required: true, unique: true },       // sha256 of opaque token
  replacedBy: String,
  revokedAt:  Date,
  expiresAt:  { type: Date, required: true },
  userAgent:  String,
}, { timestamps: true });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### 3.9 `auditLogs`

```js
const AuditLogSchema = new Schema({
  actorId:  { type: Types.ObjectId, ref: 'User', required: true },
  action:   { type: String, required: true },  // 'question.create' | 'cycle.publish' | 'result.recompute' | 'session.review' | 'user.create' ...
  entity:   { type: String, required: true },  // 'Question' | 'ExamCycle' | ...
  entityId: { type: String, required: true },
  diff:     Schema.Types.Mixed,                 // { before, after } (shallow, no secrets)
  ip:       String,
}, { timestamps: { createdAt: true, updatedAt: false } });
AuditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
```

## 4. Key operations

### 4.1 Start session: build the served paper

```js
// inside a transaction (session) to keep the "one attempt" check atomic with the insert
for (const { sectionId, questionCount } of cycle.sections) {
  const picked = await Question.aggregate([
    { $match: { section: sectionId, status: 'active' } },
    { $sample: { size: questionCount } },
    { $project: { _id: 1, section: 1 } },
  ]);
  if (picked.length < questionCount) throw httpError(409, 'POOL_TOO_SMALL');
  served.push(...shuffle(picked).map(q => ({ questionId: q._id, section: q.section, optionOrder: shuffle(['a','b','c','d']) })));
}
// insert TestSession → a duplicate-key error on (candidateId, examCycleId, attempt) → 409 ALREADY_ATTEMPTED
// Question.updateMany({ _id: { $in: ids } }, { $inc: { timesServed: 1 } })
// cycle.lockedAt ??= now
```

Candidate projection: `Question.find({ _id: { $in: ids } }).select('section text textBn options')`.
Re-order the options per `optionOrder`. **Never** `.select('+correctAnswer')` in candidate code paths.

### 4.2 Submit / expire: score

1. Load the session (status `active`) and its questions with `+correctAnswer`.
2. `const outcome = calculateScore({ servedPaper, questionsById, answers, thresholds: resolveThresholds(cycle, session.programCode), negativeMarking, timeTaken })` (shared pure function).
3. Transaction: set the session status (`submitted` / `expired` / `force_submitted`) and insert the
   result (the unique `sessionId` index makes a retry safe: on duplicate, return the existing result).

### 4.3 Merit list

```js
Result.aggregate([
  { $match: { examCycleId, programCode, disqualified: false, ...(eligibility && { eligibility }) } },
  // single numeric key so $rank sorts on one field: higher % first, then faster (timeTaken < 1e6 s)
  { $set: { meritKey: { $subtract: [{ $multiply: ['$percentage', 1e6] }, '$timeTaken'] } } },
  { $setWindowFields: {
      sortBy: { meritKey: -1 },
      output: { rank: { $rank: {} } },          // competition ranking: 1,2,2,4 (ties = same % and same time)
  } },
  { $sort: { rank: 1, submittedAt: 1 } },       // submittedAt only orders rows that share a rank
  { $project: { rank: 1, candidateName: 1, candidateEmail: 1, programCode: 1, totalScore: 1, percentage: 1,
                sectionPercentages: 1, eligibility: 1, timeTaken: 1, submittedAt: 1 } },
  { $skip: (page - 1) * limit }, { $limit: limit },
]);
```

### 4.4 Analytics summary (one round trip with `$facet`)

```js
Result.aggregate([
  { $match: { examCycleId, ...(programCode && { programCode }) } },
  { $facet: {
      totals:      [{ $group: { _id: null, completed: { $sum: 1 }, avgPct: { $avg: '$percentage' },
                                eligible: { $sum: { $cond: [{ $eq: ['$eligibility', 'ELIGIBLE'] }, 1, 0] } } } }],
      eligibility: [{ $group: { _id: '$eligibility', count: { $sum: 1 } } }],
      sections:    [{ $project: { s: { $objectToArray: '$sectionPercentages' } } }, { $unwind: '$s' },
                    { $group: { _id: '$s.k', avg: { $avg: '$s.v' } } }],
      byProgram:   [{ $group: { _id: '$programCode', completed: { $sum: 1 }, avgPct: { $avg: '$percentage' } } }],
      perDay:      [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt', timezone: 'Asia/Dhaka' } }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }],
  } },
]);
// registrations: User.countDocuments({ role: 'candidate', ...program filter })
// started:       TestSession.countDocuments({ examCycleId })
```

## 5. Seeding (`server/scripts/seed.js`)

| Source | Target | Notes |
|:--|:--|:--|
| `src/lib/constants.js` `PROGRAMS` | `programs` | 13 docs |
| `src/data/mockQuestions.js` (50) | `questions` | `id` → `code`, `status: 'active'`, **fix `q_logic_010` → `a`** |
| `src/data/mockExamConfig.js` | `examCycles` | `status: 'published'`, add conditional thresholds |
| `src/data/mockCandidates.js` (16 candidates + 1 admin) | `users` | hash `Test@1234` / `Admin@1234` with argon2id; set `emailVerifiedAt` |
| `src/data/mockResults.js` (15) | `results` (+ synthetic `testSessions`) | dev/demo only (`SEED_DEMO_RESULTS=true`) |

The seed is idempotent (upsert by `code` / `email` / `_id`). It refuses to run when
`NODE_ENV=production` unless `--force`.

## 6. Operations

- **Deployment:** 3-node replica set (Atlas M10+ in `ap-south-1` Mumbai, or DIU on-prem). Transactions require a replica set; dev uses `mongodb-memory-server` replset or a single-node replset in Docker.
- **Write concern:** `majority` for autosave/submit; default for the rest.
- **Read preference:** `primary` for session endpoints; `secondaryPreferred` allowed for analytics.
- **Backups:** Atlas continuous backup, or `mongodump` nightly to off-site storage. 30-day retention, quarterly restore test ([20](./20-deployment-ops.md)).
- **Retention job:** after `cycle.endAt + 365 d`, strip `securityEvents` and `questionTimeMs` from sessions (keep the counts). Results are kept 5 years.
- **Migrations:** versioned scripts in `server/migrations/` (e.g. `migrate-mongo`), run in CI before deploy.
