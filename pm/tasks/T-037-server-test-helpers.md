# T-037 · Server test helpers (mongodb-memory-server replica set) + health tests

Status: ✅ Ready
Sprint: S2 · Role: test-engineer · Model: free-ok · Size: S
Depends on: T-036
Implements: P1-04

## Goal
Server tests run with no Docker: one helper starts an in-memory Mongo replica set, builds the app against it, and tears everything down afterwards. Prove it works with tests for `/health` and `/ready`.

## Context to read
- `context/18-testing-strategy.md`: the server/integration test section
- `context/16-backend-architecture.md` §1 (`server/test/helpers/app.js`)
- `server/src/app.js` (`buildApp`), `server/src/config.js`

## Files
- `server/package.json` (modify): dev dependency `mongodb-memory-server`. `scripts.test: "vitest run"`.
- `server/vitest.config.js` (create): `environment: 'node'`, and `hookTimeout` long enough for the first binary download (120 s).
- `server/test/helpers/app.js` (create): `startTestApp()` starts `MongoMemoryReplSet` (1 node), builds the app with `MONGODB_URI` set to its URI and test secrets, awaits `app.ready()`, and returns `{ app, stop }`. `stop` closes the app and the replica set.
- `server/test/helpers/factories.js` (create): an empty export with a comment (user and question factories arrive in S3/S4).
- `server/test/health.test.js` (create): `/api/v1/health` gives 200. `/api/v1/ready` gives 200 with `db: 'ok'`. After the replica set is stopped, `/ready` gives 503.

## Acceptance criteria
1. [ ] `pnpm --filter @diu/server test` passes from a clean checkout, with no Docker running.
2. [ ] `pnpm test:all` passes (frontend + shared + server).
3. [ ] The tests leave no open handles: vitest exits on its own, without `--forceExit`.
4. [ ] No new lint warnings.

## Verify
```bash
pnpm --filter @diu/server test && pnpm test:all && pnpm lint
```

## Out of scope
- Coverage thresholds for the server (set once real modules exist). E2E.

## Agent log

## Review
