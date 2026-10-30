# 20 — Deployment & Operations

> **Status:** Target for R3/R4. Hosting is still an open product question (Q6 in [06](./06-open-issues-doc-gaps.md#3-open-product-questions)).
> Both options below are supported by the same code. Only the configuration differs.

---

## 1. Environments

| Env | Purpose | Frontend | API | Database |
|:--|:--|:--|:--|:--|
| `local` | Development | `pnpm dev` (Vite :5173, proxy `/api`) | `pnpm dev:server` (:4000) | Docker `mongo:7` single-node replset, or `VITE_USE_MOCKS=true` with no DB |
| `test` / CI | Automated tests | — | `buildApp()` in-process | `mongodb-memory-server` replset |
| `staging` | UAT, demo, load tests | Static hosting | 1 instance | Atlas M10 (or a DIU staging VM) |
| `production` | Admission windows | Static hosting + CDN | ≥ 2 instances behind an LB | Atlas M10+ 3-node replset (Mumbai) **or** DIU on-prem 3-node replset |

## 2. Hosting options

### Option A — Managed (recommended for the pilot)
- **Database:** MongoDB Atlas, region `ap-south-1` (Mumbai) for the lowest latency to Bangladesh. M10 during the window (scale down to M0/M2 for staging off-season). Continuous backup on.
- **API:** containers on a PaaS (Render / Railway / Fly.io / DigitalOcean App Platform) or a VPS with Docker. Region Singapore or Mumbai. 2 × (1 vCPU, 1 GB).
- **Frontend:** `pnpm build` → `dist/` on Cloudflare Pages / Netlify / Vercel, with an SPA fallback to `index.html`. `VITE_API_URL=https://api.admission.diu.edu.bd/api/v1`.
- **Email:** SMTP from the university mail server, or a transactional provider (SES/SendGrid/Brevo).

### Option B — DIU on-premises (data residency)
- 3 VMs for a MongoDB replica set (`mongod --replSet rs0`, keyfile auth, TLS), on separate hosts or racks.
- 2 VMs for the API (Docker or systemd + Node 22) behind Nginx (TLS via the DIU certificate or Let's Encrypt), with the Nginx upstream doing load balancing.
- Nginx also serves the frontend `dist/` with `try_files $uri /index.html`.
- Backups: `mongodump --oplog` nightly to a different site plus a weekly snapshot. Test restores.

### API container (`server/Dockerfile`)
```dockerfile
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared packages/shared
COPY server server
RUN pnpm install --frozen-lockfile --filter @diu/server...
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "server/src/server.js"]
```

### Nginx reverse proxy (essentials)
```nginx
location /api/ {
  proxy_pass http://diu_api;                  # upstream with 2+ servers
  proxy_set_header X-Request-Id $request_id;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  client_max_body_size 3m;                    # CSV import
}
```
Fastify must use `trustProxy: true` so rate limiting sees the real IP.

## 3. Configuration & secrets

- All server config comes from env vars ([16 §3](./16-backend-architecture.md#3-configuration-serverenvexample)). Never commit `.env`. `.env.example` is the template.
- Secrets (`JWT_ACCESS_SECRET`, `PEPPER`, `MONGODB_URI`, `SMTP_URL`) go in the platform's secret store. Rotate the JWT secret between cycles (users just log in again).
- Production must set `COOKIE_SECURE=true`, `CORS_ORIGINS` to the exact frontend origin, `NODE_ENV=production`, and `RUN_JOBS=true` on **exactly one** instance.

## 4. Release process

1. Merge to `main` → CI green (lint, tests, build, E2E).
2. Deploy to staging automatically. Run migrations (`pnpm --filter @diu/server migrate`), then the smoke E2E.
3. Tag `vX.Y.Z` → deploy to production. Migrations first (they must be backward compatible), then the API (rolling), then the frontend.
4. **Change freeze** from 48 h before an exam window opens until it closes. Hotfixes only, with two-person review.

## 5. Monitoring & alerting

| Signal | Tool | Alert when |
|:--|:--|:--|
| API up (`/ready`) | UptimeRobot / Better Stack, 1-min checks | 2 consecutive failures |
| Errors | Sentry (frontend + API) | New issue or > 1 % error rate over 5 min |
| Latency | Logs → Grafana/Loki or the platform's metrics | Autosave p95 > 500 ms for 5 min |
| DB | Atlas alerts / `mongostat` | CPU > 75 %, replication lag > 10 s, connections > 80 % |
| Business | `/admin/dashboard` + a log metric | Active sessions dropping sharply mid-window; expiry job not run for 3 min |

Logs: JSON (pino) with `reqId`, `userId`, `route`, `ms`. Keep 30 days. Never log passwords, tokens, OTP codes or answer keys.

## 6. Security checklist

- [ ] HTTPS everywhere. HSTS (`max-age=31536000`). TLS 1.2+.
- [ ] Helmet defaults + CSP: `default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; connect-src 'self' <api origin>; frame-ancestors 'none'`.
- [ ] CORS allowlist only. Refresh cookie `httpOnly; Secure; SameSite=Strict`. Origin check on `/auth/refresh`.
- [ ] argon2id hashing. Login lockout. Rate limits ([15 §1](./15-api-spec.md#1-conventions)).
- [ ] Every input validated (Zod). Every response serialized through a schema. No `correctAnswer` to candidates (test P4-07).
- [ ] Mongo: auth enabled, least-privilege app user (readWrite on one DB), network allowlist / private networking, TLS.
- [ ] No NoSQL injection: reject objects where scalars are expected (Zod does this). Never pass raw `req.query` into `find`.
- [ ] Audit log on every admin write. Admin accounts reviewed each cycle.
- [ ] `pnpm audit` / Dependabot. No `eval`/dynamic `Function` in the frontend (CSP friendly).
- [ ] Privacy: privacy notice on registration (what's collected and why, retention), data export for a candidate on request, retention job ([14 §6](./14-database-schema.md#6-operations)). Follow the Bangladesh Personal Data Protection framework / Digital Security guidance. Get DIU legal sign-off before production.

## 7. Backups & disaster recovery

| Item | Policy |
|:--|:--|
| Backup | Atlas continuous (PITR) **or** nightly `mongodump --oplog`, plus hourly during an open window |
| Retention | 30 days daily, 12 months monthly |
| RPO / RTO | RPO ≤ 1 h (≤ 5 min with PITR) · RTO ≤ 2 h |
| Restore drill | Quarterly, and once before every admission window. Record the time taken |
| Mid-window DB failover | Replica set elects a new primary automatically. Clients retry autosave with backoff, so no candidate action is needed |
| Full API outage mid-window | Answers stay queued on candidate devices (offline queue). Deadlines are absolute, so the admin can **extend the deadline** of affected active sessions with an audited admin action (backlog item) |

## 8. Exam-day runbook

**T-7 days:** load test on staging at the expected peak. Restore drill. Freeze config. Verify each section's pool size is ≥ 3× `questionCount`.
**T-1 day:**
- Scale up Atlas and the API.
- Check the cycle is `published` with the correct window (Asia/Dhaka shown in the admin UI).
- Send a test email OTP.
- Make sure on-call people and phone numbers are confirmed.

**During the window:**
- Watch active sessions, autosave latency, error rate and expiry-job heartbeat on the dashboard.
- Support desk script: "Log in again on any device. Your answers and remaining time are kept."

**Incident:**
- Declare it. Post a status notice on the landing page (a config flag).
- If the API is down for more than 5 minutes, extend deadlines of the affected sessions after recovery and record it in `auditLogs`.

**After close:**
- `POST /admin/cycles/:id/close`, which releases results if `after_window`.
- Export merit lists per program. Run the security review of High-risk sessions.
- Scale down. Write a post-mortem / retrospective.
