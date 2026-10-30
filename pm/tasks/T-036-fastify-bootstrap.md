# T-036 · Fastify 5 server bootstrap with `/health` and `/ready`

Status: ✅ Ready
Sprint: S2 · Role: backend-dev · Model: sonnet · Size: M
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
- `server/src/plugins/mongoose.js`, `security.js`, `errors.js`, `zod.js` (create): `fastify-plugin` wrapped. `mongoose.js` connects on `onReady`, closes on `onClose`, and decorates `fastify.mongoose`. `errors.js` maps httpError → status/code, Zod → 422 `VALIDATION`, anything else → 500 `INTERNAL` (no stack in the body).
- `server/src/lib/httpError.js` (create): `httpError(status, code, message, details)`.
- `server/src/modules/health/routes.js` (create): `/health` and `/ready` (`mongoose.connection.readyState === 1`, then `db.admin().ping()`).
- `eslint.config.js` (modify): a `server/**` block with Node globals. No React rules there.

## Acceptance criteria
1. [ ] With Mongo up (T-035) and `server/.env` copied from the example, `pnpm dev:server` starts on :4000. `curl -s localhost:4000/api/v1/ready` returns 200 `{ "status": "ok", "db": "ok" }`.
2. [ ] With Mongo stopped, `/api/v1/health` returns 200 and `/api/v1/ready` returns 503 with `db` not `ok`. The process doesn't crash.
3. [ ] A missing `MONGODB_URI` makes startup exit non-zero with a readable message.
4. [ ] SIGTERM closes the server and the Mongo connection and exits 0. Show the log lines in the Agent log.
5. [ ] An unknown route returns the JSON error envelope, and a thrown error gives 500 `INTERNAL` with no stack in the body.
6. [ ] `pnpm lint` passes for `server/**`, with no new warnings. `pnpm build` passes.

## Verify
```bash
docker compose up -d mongo && cp -n server/.env.example server/.env; (pnpm dev:server &) ; sleep 5; curl -s localhost:4000/api/v1/health; curl -s localhost:4000/api/v1/ready; pnpm lint && pnpm build
```

## Out of scope
- Auth, JWT, cookies, users (S3). The test helpers and automated tests (T-037). Rate-limit tuning.

## Agent log

## Review
