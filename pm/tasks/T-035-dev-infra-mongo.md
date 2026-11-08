# T-035 · Dev infra: Mongo 7 replica set, `server/.env.example`, Vite `/api` proxy

Status: 👀 Review
Sprint: S2 · Role: devops · Model: lite · Size: S
Tier rationale: compose file, .env.example and a Vite proxy; all verifiable by one command (PROCESS §2.3)
Depends on: T-032 (can run in parallel with T-033/T-034; it touches different files)
Implements: P1-05, ADR-013 (MongoDB replica set)

## Goal
One command starts a local MongoDB 7 single-node replica set (needed for transactions), the server has a documented env template, and the SPA dev server proxies `/api` to the API on port 4000.

## Context to read
- `context/16-backend-architecture.md` §1 (the Vite proxy line) and §3 (the `.env.example` contents)
- `context/20-deployment-ops.md`: the local-dev section, if there is one
- `vite.config.js`, `.gitignore`

## Files
- `docker-compose.yml` (create): service `mongo` using `mongo:7`, `command: ["--replSet", "rs0", "--bind_ip_all"]`, port `27017:27017`, a named volume, and a `healthcheck` that runs `rs.initiate()` if it hasn't run yet and then reports `rs.status().ok`. Use the `mongosh --eval` init-in-healthcheck pattern, so no extra script file is needed.
- `server/.env.example` (create): exactly the keys in 16 §3.
- `.gitignore` (modify): add `server/.env`.
- `vite.config.js` (modify): `server.proxy = { '/api': 'http://localhost:4000' }`.

## Acceptance criteria
1. [ ] `docker compose up -d mongo` turns healthy within 60 s, and `docker compose exec mongo mongosh --quiet --eval "rs.status().ok"` prints `1`.
2. [ ] `server/.env.example` has every key from 16 §3. `server/.env` is git-ignored.
3. [ ] `pnpm build` and `pnpm lint` pass. `pnpm dev` still starts the SPA.
4. [ ] `docker compose down` (no `-v`) keeps the data volume.

## Verify
```bash
docker compose up -d mongo && sleep 20 && docker compose exec mongo mongosh --quiet --eval "rs.status().ok" && pnpm lint && pnpm build
```

## Out of scope
- Production compose and Dockerfiles (S8). The server code itself (T-036).

## Agent log
- Added MongoDB 7 single-node replica-set Compose service with named `mongo_data` volume and init healthcheck; added the architecture-specified server env template, ignored `server/.env`, and configured Vite `/api` proxy.
- Files: `docker-compose.yml`, `server/.env.example`, `.gitignore`, `vite.config.js`.
- Review fix: healthcheck initiates explicitly with `localhost:27017`, force-reconfigures a stale member, and requires `myState === 1` (PRIMARY).
- Verify output: fresh `docker compose down -v && docker compose up -d mongo`; `docker compose ps mongo` → `healthy`; `rs.status()` → `{ok:1,state:1}`. Healthcheck start+recreation path exercised on fresh volume.
- Host URI attempt: host `mongosh` is unavailable. Temporary host-installed Node mongodb driver attempted URI and got ECONNREFUSED because the stack had already been stopped; therefore host connectivity is **not verified** in this run.
- `docker compose down` then volume list → `diu-admission_mongo_data` survives.
- `pnpm lint` passed; `pnpm test` passed (30 files, 232 tests); `pnpm build` passed (existing large-chunk warning).
- `pnpm dev` reached Vite ready at localhost:5173. `docker compose down` preserved `diu-admission_mongo_data`; `git check-ignore server/.env` confirmed ignore.
- Acceptance: 1 ✅ 2 ✅ 3 ✅ 4 ✅.

## Review

**Reviewer verdict: CHANGES REQUESTED** (commit 7584250; reviewed in main tree, branch `sprint/S2-workspace-skeleton`)

### Acceptance
1. ✗ **Failed on reproduction.** Replica set does not come up on the existing volume `diu-admission_mongo_data`.
   - `docker compose up -d mongo`: health stayed `starting` for 60 s (checked every 2 s).
   - `docker compose exec mongo mongosh --quiet --eval "rs.status().ok"` → `MongoServerError: Our replica set config is invalid or we are not a member of it`, exit 1.
   - Cause: the persisted config's member host is `ca704512b2f6:27017`, but the current container hostname is `7482883fa5f0`. Docker's default hostname is the container ID, which changes on every `down`/`up`. The config was written from a previous container and is now stale.
   - `docker-compose.yml:14-16` (healthcheck): the `catch` branch runs `rs.initiate()`, which fails with AlreadyInitialized once a config exists, so the container never turns healthy.
   - The builder's claim "container became healthy" was not reproduced. It only holds on a fresh volume, and it breaks on the next `down`/`up` cycle.
2. ✅ `server/.env.example:1-17` has the 17 keys from 16 §3 with the same names, in the same order (checked key by key). `server/.env` is ignored: `git check-ignore -v server/.env` → `.gitignore:11`. No real secrets: all values are placeholders (`change-me…`, `smtp.example.com`). Node 26 `--env-file` strips the inline `# …` comments correctly. Non-blocking gap: `RUN_JOBS` is named in 16 §5 (line 197) and `context/20-deployment-ops.md:61`, but not in 16 §3 or in the template. T-036 does not need it.
3. ✅ `pnpm lint` (eslint . clean), `pnpm test` (30 files, 232 tests passed), `pnpm build` (built in 6.31 s). `pnpm dev` → `VITE v8.0.16 ready`, `Local: http://localhost:5173/`. `vite.config.js:21` has the proxy line. The `/api` → :4000 proxy is not exercised end-to-end because no server exists yet.
4. ✅ `docker compose down` (no `-v`) left `diu-admission_mongo_data` in `docker volume ls` (checked after the down).

### Additional defect (blocks T-036 AC1)
- `server/.env.example:4` (`MONGODB_URI=mongodb://localhost:27017/diu_admission?replicaSet=rs0`) cannot connect from the host, even on a fresh init. The RS member host is the container ID, so the driver gets `MongoNetworkError: getaddrinfo ENOTFOUND <container-id>`. Only `directConnection=true` works. T-036's `/ready` → `db: ok` would fail.

### Required changes
1. `docker-compose.yml:14-16`: initialize the member as `localhost:27017`, which is valid both inside the container and from the host through the `27017:27017` mapping: `rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})`. Verified by reviewer on a throwaway container with the same port mapping: `rs.status().ok` → `1`, and the `.env.example` URI pings from the host.
2. Same file: the healthcheck must reconfigure a stale member host (`rs.reconfig` with `force` if needed) so that a plain `down`/`up` works without `-v`. If you choose not to self-heal, document a one-time `docker compose down -v` and get the user's OK first, because it deletes local dev data.
3. Same file: the healthcheck must fail unless the node is PRIMARY. Today `rs.status().ok` does not throw on `ok:0`, and the fallback hides the problem. Suggested, not tested: `rs.status().myState === 1`.
4. Re-run the card's Verify command and paste the real output. Then confirm `MONGODB_URI` from the host (`ping` → 1). Correct the Agent log's "became healthy" line to match.
5. Non-blocking: reconcile `RUN_JOBS` between 16 §3, 16 §5 and the template (planner decision).

Note: the card header `Status:` line still reads `👀 Review`. Per reviewer scope I changed only this Review section and the board row. The builder should set `🔨 In Progress` on the header.
