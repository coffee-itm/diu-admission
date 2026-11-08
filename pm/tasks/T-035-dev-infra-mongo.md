# T-035 · Dev infra: Mongo 7 replica set, `server/.env.example`, Vite `/api` proxy

Status: ✔️ Done
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

### Round 2 — re-review of fix commit 7a1869f

**Reviewer verdict: APPROVED** (main tree, branch `sprint/S2-workspace-skeleton`; the stack was brought up and down by the reviewer, the project volume was reset with `-v` several times; throwaway `mongo:7` containers were created and removed; no other containers were touched; the card header `Status:` line was set to `✔️ Done` by the reviewer)

#### Acceptance
1. ✅ **Met.** Fresh volume (`docker compose down -v && up -d mongo`): `healthy` after 6 s. Stale-config recovery (seeded `diu-admission_mongo_data` with a set whose member host was `ca704512b2f6:27017`, then `up -d mongo`): `healthy` after 13 s, `rs.status().ok` → `1`. Literal card command `docker compose up -d mongo && sleep 20 && docker compose exec mongo mongosh --quiet --eval "rs.status().ok" && pnpm lint && pnpm build` → prints `1`, exit 0 (also works with stdin from `/dev/null`).
   - Code: `docker-compose.yml:14` (healthcheck: `rs.status()`, `myState !== 1`, `rs.initiate` with `localhost:27017`, host check and `rs.reconfig(c,{force:true})`).
2. ✅ **Met** (unchanged from round 1; `server/.env.example:1-17`, `.gitignore:11`). The round-1 non-blocking note on `RUN_JOBS` still stands. It is a planner decision, not a blocker.
3. ✅ **Met.** `pnpm lint` → exit 0. `pnpm build` → `✓ built in 6.50s` (existing large-chunk warning). `pnpm test` → `Test Files 30 passed (30)`, `Tests 232 passed (232)`. `vite.config.js:21` has the `/api` proxy. The `pnpm dev` check is unchanged from round 1, since 7a1869f does not touch Vite.
4. ✅ **Met.** `docker compose down` (no `-v`) → `local diu-admission_mongo_data` still listed. A probe document written before the down was still there after the next `up` (`probe survives: true`).

#### Round-1 required changes
1. ✅ Host URI. `docker-compose.yml:14` seeds `localhost:27017`. `rs.conf().members[].host` → `localhost:27017`. `docker run --rm --network host mongo:7 mongosh "mongodb://localhost:27017/diu_admission?replicaSet=rs0"` (the exact `server/.env.example:4` value) → `ok: 1`, exit 0.
2. ✅ Self-heal. `docker compose up -d --force-recreate mongo` → `healthy` after 7 s, `ok 1`, `state 1`. The stale-volume case above is also fixed by the healthcheck and not by `-v`.
3. ✅ PRIMARY gate. I ran the exact healthcheck script (extracted from `docker compose config`) on throwaway `mongo:7` containers. A real PRIMARY node → exit 0. Stubbed `rs` with `myState=2` on the healthy-config path → exit 1. Stubbed `status()` that throws once and then returns `myState=2` → exit 1. Stubbed `myState=1` → exit 0. So a non-PRIMARY member never reports healthy.
4. ✅ Verify and host-ping results are recorded above. The Agent log's "became healthy" wording is now backed by the fresh-volume and stale-volume runs.
5. ⏸ Non-blocking, still open: `RUN_JOBS` reconciliation (planner).

#### Non-blocking observations (no change required)
- `docker-compose.yml:14`: the self-heal path uses `rs.reconfig(..., {force:true})` and collapses any multi-member config to one member. That is acceptable for a local dev single-node set, but the Agent log should say so for anyone who later adds members.
- `⚠️ not verified`: the `/api` → `:4000` proxy end-to-end. No server exists yet (T-036).

#### Checks: `pnpm lint` ✅ (exit 0), `pnpm test` ✅ (232/232), `pnpm build` ✅, verify command ✅.
