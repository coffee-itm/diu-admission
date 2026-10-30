# 16 — Backend Architecture (Fastify + Mongoose)

> **Status:** Target for R2. Nothing in `server/` exists yet; [19](./19-implementation-roadmap.md) phases P1–P5 build it.
> Decisions: ADR-013 (MongoDB), ADR-014 (Fastify + Mongoose), ADR-015 (server-authoritative
> sessions), ADR-016 (auth), ADR-019 (pnpm workspace + shared package) in [09](./09-adrs.md).

---

## 1. Repository layout (pnpm workspace)

The frontend **stays at the repo root**, so nothing moves and no import paths break. Two
workspace packages are added:

```
diu-admission/
├── package.json                 # frontend (existing) — adds "workspaces" scripts
├── pnpm-workspace.yaml          # packages: ['.', 'server', 'packages/*']   (keep allowBuilds)
├── src/                         # React SPA (existing)
├── packages/
│   └── shared/                  # @diu/shared — pure JS, no Node/DOM APIs
│       ├── package.json         # "type": "module", "exports": { ".": "./index.js", "./*": "./*.js" }
│       ├── index.js
│       ├── constants.js         # SECTION_IDS, ROLES, ELIGIBILITY, QUESTION_STATUS, SESSION_STATUS, SECURITY_EVENT_TYPES
│       ├── scoring.js           # calculateScore(), resolveThresholds()  ← moved from src/lib/scoring.js
│       ├── risk.js              # computeRisk(violationCounts, questionTimes) → { score, level, fastAnswers }
│       ├── shuffle.js           # Fisher–Yates (crypto-safe RNG injectable)
│       └── schemas/             # Zod 4 schemas: auth.js, question.js, cycle.js, session.js, common.js
│           └── *.test.js
└── server/                      # @diu/server
    ├── package.json
    ├── .env.example
    ├── src/
    │   ├── server.js            # entry: buildApp() → listen; graceful shutdown
    │   ├── app.js               # buildApp(opts): registers plugins + modules (used by tests too)
    │   ├── config.js            # env parsing with Zod (fail fast)
    │   ├── plugins/
    │   │   ├── mongoose.js      # connect, decorate fastify.mongoose, close on shutdown
    │   │   ├── auth.js          # @fastify/jwt + fastify.authenticate + fastify.requireRole(...roles)
    │   │   ├── security.js      # @fastify/helmet, @fastify/cors, @fastify/rate-limit
    │   │   ├── errors.js        # setErrorHandler → error envelope; Zod/Mongo dup-key mapping
    │   │   └── zod.js           # fastify-type-provider-zod validator/serializer compilers
    │   ├── modules/
    │   │   ├── auth/            # routes.js, service.js, refreshToken.model.js, otp.model.js, otp.service.js
    │   │   ├── users/           # model.js, routes.js (admin users), service.js
    │   │   ├── programs/        # model.js, routes.js
    │   │   ├── questions/       # model.js, routes.js, service.js, csv.js
    │   │   ├── cycles/          # model.js, routes.js, service.js
    │   │   ├── sessions/        # model.js, routes.js, service.js (start/save/submit/expire), paper.js
    │   │   ├── results/         # model.js, routes.js, service.js (merit list, recompute)
    │   │   ├── analytics/       # routes.js, service.js (aggregations)
    │   │   ├── security/        # routes.js, service.js (review panel)
    │   │   └── audit/           # model.js, service.js (log(actor, action, entity, diff))
    │   ├── jobs/
    │   │   └── expireSessions.js  # every 60 s: finalize active sessions past deadline + grace
    │   └── lib/
    │       ├── httpError.js     # httpError(status, code, message, details)
    │       ├── mailer.js        # nodemailer SMTP; 'console' driver in dev
    │       ├── sms.js           # provider interface; 'console' driver in dev
    │       └── csv.js           # csv-parse / csv-stringify helpers
    ├── scripts/
    │   └── seed.js              # see 14 §5
    ├── migrations/
    └── test/
        ├── helpers/app.js       # buildApp with mongodb-memory-server replset + factories
        └── *.test.js
```

Root `package.json` scripts to add:
```json
{
  "dev": "vite",
  "dev:server": "pnpm --filter @diu/server dev",
  "dev:all": "pnpm -r --parallel --filter . --filter @diu/server dev",
  "test": "vitest run",
  "test:all": "pnpm -r test",
  "seed": "pnpm --filter @diu/server seed"
}
```
`vite.config.js`: add `server.proxy = { '/api': 'http://localhost:4000' }`.

## 2. Dependencies (`server/package.json`)

| Package | Use |
|:--|:--|
| `fastify@5` | HTTP framework |
| `fastify-plugin` | Non-encapsulated plugins |
| `fastify-type-provider-zod` + `zod@4` | Route schema validation/serialization from shared Zod schemas |
| `@fastify/jwt` | Access tokens |
| `@fastify/cookie` | Refresh cookie |
| `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` | Security |
| `@fastify/multipart` | CSV upload |
| `@fastify/sensible` | `httpErrors` helpers |
| `mongoose@8` | ODM |
| `argon2` | Password hashing (argon2id) |
| `nodemailer` | Email OTP |
| `csv-parse`, `csv-stringify` | CSV import/export |
| `pino-pretty` (dev) | Readable logs |
| `vitest`, `mongodb-memory-server` (dev) | Tests |
| `@diu/shared` (`workspace:*`) | Scoring, schemas, constants |

Runtime: Node.js ≥ 22 LTS, ESM (`"type": "module"`), JavaScript (JSDoc types allowed, no TS build step).

## 3. Configuration (`server/.env.example`)

```dotenv
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/diu_admission?replicaSet=rs0
JWT_ACCESS_SECRET=change-me-at-least-32-bytes-long-random
JWT_ACCESS_TTL=15m
REFRESH_TTL_DAYS=7
COOKIE_SECURE=false            # true in production
CORS_ORIGINS=http://localhost:5173
PEPPER=change-me-random        # for OTP/IP hashing
MAIL_DRIVER=console            # smtp | console
SMTP_URL=smtp://user:pass@smtp.example.com:587
MAIL_FROM="DIU Admission <no-reply@diu.edu.bd>"
SMS_DRIVER=console             # console | <provider>
SESSION_GRACE_SECONDS=30
EXPIRE_JOB_INTERVAL_SECONDS=60
LOG_LEVEL=info
```
`config.js` validates these with Zod and refuses to start on missing or weak secrets in production.

## 4. Request pipeline

```
request ─► helmet/cors ─► rate-limit ─► route schema (Zod validate) ─► onRequest: authenticate ─►
preHandler: requireRole / scope ─► handler (thin) ─► service (business rules, Mongoose) ─►
serializer (Zod response schema — strips unknown fields such as correctAnswer) ─► reply
                                  └── throw httpError(...) ─► errors plugin ─► { error: {...} }
```

Rules:
- **Routes are thin.** They parse input, call one service function, and return. No Mongoose in routes.
- **Services own the business rules** and take plain arguments (`{ userId, ... }`), so they can be unit-tested.
- **Response schemas are mandatory** on candidate routes. The serializer is a second line of
  defence against leaking `correctAnswer` (invariant: answer key never sent to role C).
- Map Mongo duplicate-key errors (`E11000`) to the right 409 code in `errors.js`, by index name.

### Example route + service (pattern to copy)

```js
// server/src/modules/sessions/routes.js
import { startSessionBody, sessionPayload } from '@diu/shared/schemas/session';
import * as sessions from './service.js';

export default async function sessionRoutes(app) {
  app.addHook('onRequest', app.authenticate);
  app.addHook('preHandler', app.requireRole('candidate'));

  app.post('/sessions', {
    schema: { body: startSessionBody, response: { 200: sessionPayload, 201: sessionPayload } },
  }, async (req, reply) => {
    const { session, created } = await sessions.start({ userId: req.user.sub, ...req.body });
    return reply.code(created ? 201 : 200).send(session);
  });
}
```

```js
// server/src/modules/sessions/service.js (excerpt)
export async function start({ userId, integrityAcceptedAt, client }) {
  const user = await User.findById(userId);
  if (!user.emailVerifiedAt) throw httpError(403, 'EMAIL_NOT_VERIFIED');
  const cycle = await cycles.getOpenCycle();               // throws NO_ACTIVE_CYCLE
  const existing = await TestSession.findOne({ candidateId: userId, examCycleId: cycle._id, status: 'active' });
  if (existing) return { session: await toCandidatePayload(existing), created: false };
  // ... build paper (14 §4.1), insert in a transaction, catch E11000 → ALREADY_ATTEMPTED
}
```

## 5. Authentication design (ADR-016)

- **Access token:** JWT HS256 `{ sub: userId, role, pc?: programCodes }`, 15 min, sent in the
  `Authorization` header. The client keeps it **in memory only** (not localStorage).
- **Refresh token:** a 32-byte random opaque string. Only its sha256 is stored in
  `refreshTokens`. Cookie `diu_rt`, `Path=/api/v1/auth`. Each refresh **rotates** the token (the
  old one is marked `replacedBy`). Presenting an already-rotated token revokes the whole family
  (theft detection).
- **Passwords:** `argon2.hash(pw, { type: argon2id, memoryCost: 19456, timeCost: 2 })`.
- **Login throttling:** `failedLogins.count`, then `lockedUntil = now + 15 min` after 5 failures. Return the same 401 message either way.
- `fastify.requireRole(...roles)` checks `req.user.role`. `fastify.programScope(req)` returns the
  reviewer's `programCodes` filter, which services merge into queries.
- **CSRF:** the refresh endpoint is cookie-authenticated, so require `SameSite=Strict` and
  check the `Origin` header against `CORS_ORIGINS`.

## 6. Test-session engine on the server (ADR-015)

| Concern | Implementation |
|:--|:--|
| Deadline | `deadline = startedAt + totalTimeMinutes`. Every response includes `serverTime`. The client computes its offset |
| Autosave | `PATCH /sessions/:id/state` → one conditional `updateOne` (14 §3.5). `seq` gives idempotency and ordering |
| Events / risk | Append events (`$slice -2000`), `$inc` the counters, recompute `computeRisk()` from `@diu/shared/risk`. Server-side threshold check → force-submit |
| Submit | Flush the final state → score with `@diu/shared/scoring` → transaction: session status + insert result (unique `sessionId`) |
| Expiry | Lazy (any read/write on an overdue session finalizes it first) **and** `jobs/expireSessions.js` every 60 s: `find({ status:'active', deadline: { $lt: now − grace } }).limit(200)` → finalize each as `expired`. Run the job on one instance only (env `RUN_JOBS=true`) |
| Time taken | `min(submittedAt, deadline) − startedAt`, in seconds |
| Result release | If `cycle.resultRelease === 'after_window'`, `results.releasedAt` is null until the cycle closes. `GET /results/me` returns `RESULT_NOT_RELEASED` |
| Randomness | `crypto.randomInt` inside `shuffle()` on the server (unpredictable order) |

## 7. Scoring module (shared)

Move `src/lib/scoring.js` into `packages/shared/scoring.js` and implement FR-SCORE-01…04:

```js
/**
 * @param {{ items: { section: string, correctAnswer: string, questionId: string }[],
 *           answers: Record<string,string>, thresholds: Thresholds,
 *           negativeMarking?: { enabled: boolean, value: number }, timeTaken: number }} input
 */
export function calculateScore({ items, answers, thresholds, negativeMarking, timeTaken }) { /* pure */ }

export function resolveThresholds(cycle, programCode) {
  return { ...DEFAULT_THRESHOLDS, ...cycle.thresholds,
           ...(cycle.programOverrides?.find(o => o.programCode === programCode)?.thresholds ?? {}) };
}

export function classify({ percentage, failedCount }, t) {
  if (percentage >= t.overallMinPercent && failedCount === 0) return 'ELIGIBLE';
  if (percentage >= t.conditionalMinPercent && failedCount <= t.maxFailedSectionsForConditional) return 'CONDITIONALLY_ELIGIBLE';
  return 'NOT_ELIGIBLE';
}
```
The frontend prototype imports the same module (`@diu/shared/scoring`) until R2. After R2 the
client never scores; it only displays results.

## 8. Logging, errors, observability

- Fastify's built-in pino logger. `genReqId` uses the `X-Request-Id` header or a uuid. Redact `req.headers.authorization`, `req.headers.cookie`, `*.password` and `*.code`.
- Error handler: known `httpError` → its status/code. Zod → 422. Everything else → 500 `INTERNAL` (stack logged, never returned).
- `/health` and `/ready`. Optional: `@sentry/node` behind `SENTRY_DSN`.
- Metrics to log per minute during a window: active sessions, autosaves/min, submit errors, p95 autosave latency.

## 9. Graceful shutdown & scaling

- On SIGTERM: stop accepting requests, wait for in-flight requests (`app.close()`), close the Mongoose connection.
- The API is stateless (JWT plus Mongo), so it scales horizontally behind a load balancer. Rate limiting with more than one instance needs the Redis store (`@fastify/rate-limit` with `redis`). Optional for the pilot (single instance).
- Sizing for NFR-03: 2 API instances (1 vCPU / 1 GB each) + Atlas M10 handle about 400 autosaves/s. Verify with the load test in [18](./18-testing-strategy.md#load-test).

## 10. Coding rules for agents

1. JavaScript ESM, 2-space indent, single quotes, matching the frontend's style.
2. No business logic in route files. No Mongoose outside `modules/*/model.js` and `service.js`.
3. Every route declares `schema.body/querystring/params` **and** `schema.response`.
4. Every admin write calls `audit.log(...)`.
5. Never `select('+correctAnswer')` outside `sessions/service.js#score*` and `questions/*` admin paths.
6. Every new endpoint gets an integration test using `app.inject` ([18](./18-testing-strategy.md)).
7. Update [15-api-spec.md](./15-api-spec.md) in the same PR when you change the contract.
