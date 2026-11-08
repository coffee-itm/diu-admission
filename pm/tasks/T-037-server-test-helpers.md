# T-037 · Server test helpers (mongodb-memory-server replica set) + health tests

Status: ✔️ Done
Sprint: S2 · Role: test-engineer · Model: build · Size: S
Tier rationale: test-infra design + mongodb-memory-server replset flakiness (PROCESS §2.3)
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
1. [x] `pnpm --filter @diu/server test` passes from a clean checkout, with no Docker running.
2. [x] `pnpm test:all` passes (frontend + shared + server).
3. [x] The tests leave no open handles: vitest exits on its own, without `--forceExit`.
4. [x] No new lint warnings.

## Verify
```bash
pnpm --filter @diu/server test && pnpm test:all && pnpm lint
```

## Out of scope
- Coverage thresholds for the server (set once real modules exist). E2E.

## Agent log
- Added `mongodb-memory-server` ^11.3.0 (dev). `server/vitest.config.js`: node env, `include: test/**/*.test.js`, `hookTimeout` 120 s, `testTimeout` 30 s. `scripts.test` is now `vitest run` (dropped `--passWithNoTests`, so an empty suite fails).
- `test/helpers/app.js`: `startTestApp()` -> `{ app, stop, stopDb }`. Config built from an explicit env, never `process.env`. Binary pinned to **7.0.14** (matches `mongo:7` in docker-compose; library default is 8.2.6), override with `MONGOMS_VERSION`. Extra `stopDb()` lets a test kill only the DB. Cleans up if start fails.
- `test/health.test.js` (5 tests): /health 200, /ready 200 `db: ok`, request-id/server-time headers, /health stays 200 and /ready 503 after the replset is stopped. Mutation check: removing `stopDb()` makes the 503 test fail.
- **Cold run (binary download, 175 MB in `~/.cache/mongodb-binaries`): 43.8 s wall** (vitest "Duration 41.66s"). **Warm: 6.8-7.7 s wall**, 3 runs + 2 more via `test:all`, all 5/5. T-038: cache `~/.cache/mongodb-binaries` (key on the pinned version); an uncached CI job costs about 40 s extra.
- `pnpm-workspace.yaml`: pnpm wrote a placeholder `mongodb-memory-server: set this to true or false`; set to `false`. The postinstall download is skipped, so the binary downloads lazily on the first test run (the 120 s hook covers it) and `pnpm install` stays fast.
- Counts, before -> after: root `pnpm test` 29 files / 225 tests -> 29 / 225 (unchanged; `include: src/**`). `test:all`: shared 40 passed + 2 todo (unchanged), server 0 -> 5. Lint clean (no output), build OK.
- No open handles: vitest exited by itself on every run, no `--forceExit`, no stray mongod left (the only mongod is the docker one). The helper never touches :27017; each run uses a random port.
- Mongoose is a process singleton: one `startTestApp()` live at a time per test file (documented in the helper). Vitest isolates files, so parallel files are fine.

## Review
T-037: APPROVED
- AC1: `MongoMemoryReplSet` supplies the explicit test URI and is stopped with the app (`server/test/helpers/app.js:27-56`); with `docker compose stop mongo`, server tests passed 1 file / 5 tests, then Mongo was restarted.
- Health/readiness behavior is asserted for DB-up and DB-down states (`server/test/health.test.js:13-22, 34-52`) against the actual readiness branch (`server/src/modules/health/routes.js:14-18`).
- Mutation checks (reverted): removing `await ctx.stopDb()` and separately forcing `/ready` to always return 200 each made the 503 assertion fail (expected 503, received 200 at `server/test/health.test.js:49`).
- AC2/no root leakage: root config includes only `src/**` (`vite.config.js:16`); `pnpm test` passed 29 files / 225 tests; `pnpm test:all` passed shared 40 + 2 todo and server 5.
- AC3: two additional server-suite runs passed (5/5; 4.13 s no-Docker, 6.08 s after restart); `pgrep -a mongod` showed only Docker's `mongo:7` process afterwards. AC4: `pnpm lint` passed; `pnpm build` passed (Vite chunk-size warning only).
- Decisions accepted: plain `vitest run` (`server/package.json:21`) makes an empty server suite fail; lazy binary download (`pnpm-workspace.yaml:8`) is acceptable within the 120 s hook (`server/vitest.config.js:10`). T-038 explicitly caches `~/.cache/mongodb-binaries` (`pm/tasks/T-038-github-actions-ci.md:17`), so it can amortize the measured 43.8 s cold download.
- Verification: `pnpm --filter @diu/server test` (including Docker-stopped run), `pnpm test`, `pnpm test:all`, `pnpm lint`, and `pnpm build` all passed.
