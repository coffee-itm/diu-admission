# T-036 · Fastify 5 server bootstrap with `/health` and `/ready`

Status: ✔️ Done
Sprint: S2 · Role: backend-dev · Model: build · Size: M
Tier rationale: server bootstrap, config validation, error envelope, shutdown semantics (PROCESS §2.3)
Depends on: T-033, T-035
Implements: P1-03, ADR-014

## Goal
Create a running `@diu/server`. It validates its env on startup, connects Mongoose, and registers the security, error and Zod plugins. It serves `GET /api/v1/health` (always 200) and `GET /api/v1/ready` (200 with `db: ok` only when Mongo is reachable, else 503). It logs with pino (with redaction) and shuts down cleanly on SIGTERM. `buildApp()` is exported for tests.

## Context to read
- `context/16-backend-architecture.md` §1 (server tree), §2 (dependencies), §3 (env), §4 (request pipeline, example route pattern), §8 (logging and errors), §9 (graceful shutdown), §10 (coding rules)
- `context/15-api-spec.md`: the error envelope and the health/ready endpoints, if listed
- `pm/agents/backend-dev.md`

## Files
- `server/package.json` (modify): dependencies `fastify@5`, `fastify-plugin`, `fastify-type-provider-zod`, `zod@4`, `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/sensible`, `mongoose@8`. Dev dependencies `pino-pretty`, `vitest`. Scripts `dev: node --watch --env-file-if-exists=.env src/server.js` and `start: node src/server.js`.
- `server/src/config.js` (create): Zod-parsed env using the keys from 16 §3. Fail fast with a clear message. In production, refuse default or short secrets.
- `server/src/app.js` (create): `buildApp(opts)`, with `genReqId` from `X-Request-Id` or a UUID, logger redaction (authorization, cookie, `*.password`, `*.code`), the plugins, and the routes under the `/api/v1` prefix.
- `server/src/server.js` (create): loads config, `buildApp`, `listen`. SIGTERM/SIGINT → `app.close()` → exit 0.
- `server/src/plugins/mongoose.js`, `security.js`, `errors.js`, `zod.js` (create): `fastify-plugin` wrapped. `mongoose.js` connects on `onReady`, closes on `onClose`, and decorates `fastify.mongoose`. `errors.js` maps httpError → status/code, Zod → 422 `VALIDATION_ERROR` (the code in [15 §1](../../context/15-api-spec.md); an earlier draft of this card said `VALIDATION` — the spec wins), anything else → 500 `INTERNAL` (no stack in the body).
- `server/src/lib/httpError.js` (create): `httpError(status, code, message, details)`.
- `server/src/modules/health/routes.js` (create): `/health` and `/ready` (`mongoose.connection.readyState === 1`, then `db.admin().ping()`).
- `eslint.config.js` (modify): a `server/**` block with Node globals. No React rules there.

## Acceptance criteria
1. [x] With Mongo up (T-035) and `server/.env` copied from the example, `pnpm dev:server` starts on :4000. `curl -s localhost:4000/api/v1/ready` returns 200 `{ "status": "ok", "db": "ok" }`.
2. [x] With Mongo stopped, `/api/v1/health` returns 200 and `/api/v1/ready` returns 503 with `db` not `ok`. The process doesn't crash.
3. [x] A missing `MONGODB_URI` makes startup exit non-zero with a readable message.
4. [x] SIGTERM closes the server and the Mongo connection and exits 0. Show the log lines in the Agent log.
5. [x] An unknown route returns the JSON error envelope, and a thrown error gives 500 `INTERNAL` with no stack in the body.
6. [x] `pnpm lint` passes for `server/**`, with no new warnings. `pnpm build` passes.

## Verify
```bash
docker compose up -d mongo && cp -n server/.env.example server/.env; (pnpm dev:server &) ; sleep 5; curl -s localhost:4000/api/v1/health; curl -s localhost:4000/api/v1/ready; pnpm lint && pnpm build
```

## Out of scope
- Auth, JWT, cookies, users (S3). The test helpers and automated tests (T-037). Rate-limit tuning.

## Agent log
Added `server/src/{config,app,server}.js`, `plugins/{mongoose,security,errors,zod}.js`, `lib/httpError.js`, `modules/health/{routes,service}.js`; deps per card (pino-pretty, vitest dev); `server/**` ESLint block (Node globals, no React rules; the SPA block now ignores `server/**`). Every output below is real, from a live run against the T-035 Mongo (left running).
- **1 ✅** `pnpm dev:server` → `mongoose connected` / `Server listening at http://127.0.0.1:4000`; `GET /api/v1/health` → `200 {"status":"ok"}`, `GET /api/v1/ready` → `200 {"status":"ok","db":"ok"}`. Headers carry helmet, `x-request-id`, `x-server-time`.
- **2 ✅** `docker compose stop mongo` while running: `/health` → `{"status":"ok"} [200]`; `/ready` → `{"status":"unavailable","db":"down"} [503]` (≈4 ms, 3 polls over 9 s), process alive. `compose up` → `/ready` back to `200` after ≈10 s (driver reconnect). Mongo down **at startup**: `ERROR: mongoose initial connect failed, will retry`, `/health` 200 and `/ready` 503; starting Mongo later → `mongoose connected`, `/ready` 200 (5 s retry loop).
- **3 ✅** no `MONGODB_URI` → stderr `Invalid configuration:\n  - MONGODB_URI: is required`, exit 1. `http://x` → `must start with mongodb://…`, exit 1. `NODE_ENV=production` with the example secrets → 3 lines (JWT_ACCESS_SECRET, PEPPER, COOKIE_SECURE), exit 1; with random secrets it starts. Values are never echoed.
- **4 ✅** `kill -TERM` on `node --env-file=.env src/server.js`: `INFO: shutdown signal received, closing server  signal: "SIGTERM"` → `INFO: mongoose connection closed` → `INFO: server closed`; exit code 0, port closed afterwards. Same with Mongo down (exit 0), and as JSON logs in production mode.
- **5 ✅** probe via `app.inject`: unknown route → `404 {"error":{"code":"NOT_FOUND","message":"Route GET /api/v1/nope not found"}}`; route throwing `Error('SECRET-INTERNAL mongodb://user:pw@host/db')` → `500 {"error":{"code":"INTERNAL","message":"Internal server error"}}` (stack only in the server log, level 50); Zod body failure → `422 VALIDATION_ERROR` + `details[{path:'email',…}]`; bad JSON → `400 BAD_REQUEST`; response-schema mismatch → `500 INTERNAL` (not 422). Redaction: pino with `REDACT_PATHS` logging `req.headers.authorization/cookie`, `res.headers[set-cookie]`, `body.password`, `body.code` → all `[Redacted]`, `x-ok` stays visible. A hostile `X-Request-Id` (`a b\nINJECT`) is replaced by a UUID; `abc-123` is echoed.
- **6 ✅** `pnpm lint` exit 0, no warnings; `pnpm test` 225 passed; `pnpm test:all` ok (server has no tests yet, T-037); `pnpm build` exit 0 (only the baseline chunk-size note).
- Deviations: (a) error code is `VALIDATION_ERROR` (context/15 §1 table), not `VALIDATION` as the card says; (b) added `modules/health/service.js` so routes stay free of DB logic (16 §10); (c) `/health`+`/ready` have `rateLimit: false`; (d) `onReady` blocks `listen` for up to 5 s when Mongo is down at boot (`serverSelectionTimeoutMS`).
- Follow-ups: `*.code` redaction also masks `err.code` in error logs (e.g. Mongo codes), as specified in 16 §8. E11000 → 409 mapping is not added (no index names exist yet; unmapped dup keys give 500 INTERNAL). No `trustProxy` option yet, so behind a load balancer rate-limiting would key on the LB IP.

## Review
T-036: APPROVED (reviewed commit `8b1581f`).

- ✅ AC1/2 — liveness is unconditional and readiness calls a bounded live Mongo ping, returning 503 on a dead/connecting DB: `server/src/modules/health/routes.js:13-18`, `server/src/modules/health/service.js:10-25`. Live probes: up → 200 `{status:"ok",db:"ok"}`; Mongo stopped → health 200, ready 503 `{status:"unavailable",db:"down"}`, process stayed alive; recovery returned 200 (not cached).
- ✅ AC3 — required URI is Zod-validated and production rejects default/short JWT/pepper and insecure cookies without including values: `server/src/config.js:9-13,32-46,61-73`; entry fails before app construction: `server/src/server.js:8-14`. Direct and subprocess probes rejected production defaults/short values, and a sentinel secret/URI was absent from diagnostics.
- ✅ AC4 — SIGTERM/SIGINT closes Fastify then Mongoose and exits 0: `server/src/server.js:18-31`; Mongo close hook: `server/src/plugins/mongoose.js:28-34`. Fresh process: exit 0, port closed, logs showed shutdown → mongoose closed → server closed.
- ✅ AC5 — known errors map to envelopes and every unmapped error is generic 500: `server/src/plugins/errors.js:26-53`. Live HTTP routes throwing and rejecting errors containing a URI/path/marker both returned only `{"error":{"code":"INTERNAL","message":"Internal server error"}}` (no stack, path, URI, or original message).
- ✅ Request-log invariant — the real Fastify request pipeline uses the configured pino redact paths: `server/src/app.js:11-18,27-43`. A live POST carrying authorization, cookie, password, and code produced no marker values; logged body fields were `[Redacted]` and a safe field remained visible. (Fastify's standard request serializer omits headers, so they were not emitted.)
- ✅ AC6 — separate Node-only lint block retains the SPA block: `eslint.config.js:10-32`; `eslint src` reported 112/112 JS/JSX files, 0 errors/warnings. No answer-key exposure remains in server source (repo grep; only defensive comment at `server/src/plugins/zod.js:5`).
- Mutation check: temporarily changed the generic INTERNAL message in `server/src/plugins/errors.js:44`; the live generic-envelope assertion failed as expected (500 body exposed `MUTATION_LEAK`), then reverted. Automated server integration coverage is explicitly deferred to T-037.
- Verification (main tree): card dev/health/ready probe PASS; Mongo down/up probes PASS; `pnpm lint` PASS (0 warnings); `pnpm test` PASS (29 files/225 tests); `pnpm build` PASS (baseline Vite chunk-size warning only).
