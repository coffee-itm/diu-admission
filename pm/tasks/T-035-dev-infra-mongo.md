# T-035 · Dev infra: Mongo 7 replica set, `server/.env.example`, Vite `/api` proxy

Status: ✅ Ready
Sprint: S2 · Role: devops · Model: free-ok · Size: S
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

## Review
