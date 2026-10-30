# 09 — Architecture Decision Records

Status legend: **Accepted** (built) · **Proposed** (recommended) · **Superseded**

---

> Updated 2026-10-29: ADR-001/006/008/009/011/012 statuses revised. ADR-013…019 added for the production architecture.
> Index: 001 prototype · 002 React/Vite/Compiler · 003 Tailwind v4 · 004 global timer · 005 anti-cheat philosophy ·
> 006 three-tier eligibility · 007 full bank served · 008 services seam · 009 localStorage state · 010 client PDF ·
> 011 RBAC · 012 i18n · **013 MongoDB** · **014 Fastify + Mongoose** · **015 server-authoritative sessions** ·
> **016 auth tokens** · **017 i18n via JSON** · **018 testing stack** · **019 pnpm workspace + shared package**

## ADR-001 — Frontend prototype with mock data and localStorage
**Status:** Accepted for the prototype (R0/R1) · **Superseded for production by ADR-013/015** · **Date:** prototype phase
**Context:** Need a demonstrable system before backend investment; department wants to validate UX and assessment design with stakeholders first.
**Decision:** SPA with mock data files; all persistence via Zustand-persist → localStorage; services layer abstracts data access.
**Consequences:** + Fast iteration, zero infra, demo-ready. − Client-authoritative state (tamperable), no multi-device recovery, localStorage ~5MB cap. Production must move authority server-side (see ADR-008).

## ADR-002 — React 19 + Vite 8 + React Compiler
**Status:** Accepted
**Context:** Modern DX; avoid manual memoization bugs in a timer-heavy app.
**Decision:** React Compiler via `babel-plugin-react-compiler` + `@rolldown/plugin-babel`. Ban manual `useMemo`/`useCallback`/`React.memo`.
**Consequences:** + Simpler components, compiler-managed memoization. − Bleeding-edge toolchain; team must know the ban.

## ADR-003 — Tailwind CSS v4 with @theme tokens
**Status:** Accepted
**Context:** Consistent design system without a config-file era API.
**Decision:** `@import "tailwindcss"` + `@theme {}` tokens (primary/secondary/accent/status colors, Inter/JetBrains Mono).
**Consequences:** + No tailwind.config.js, token-driven palette. − v4 is new; fewer community recipes.

## ADR-004 — Single global timer (54 min), free section navigation
**Status:** Accepted · **Contested** (grilling Q6)
**Context:** Sections carry `timeMinutes` in config, but enforcement is global. Free navigation matches real aptitude-test UX.
**Decision:** One countdown; sections navigable freely; per-section times currently informational only.
**Consequences:** + Simpler engine, candidate controls pacing. − Per-section config is dead data; candidates can starve sections. Resolve: implement per-section enforcement or delete the fields.

## ADR-005 — Client-side anti-cheat (deterrence + audit, not prevention)
**Status:** Accepted
**Context:** No proctoring budget (PRD excludes AI proctoring/video); rural bandwidth constraints.
**Decision:** 7 layers: tab-switch detect (warn@2, auto-submit@5), fullscreen enforcement, clipboard/right-click/shortcut blocking, DevTools resize heuristic, integrity declaration, event audit trail with per-question timing.
**Consequences:** + Raises casual-cheating cost, produces reviewable evidence. − Bypassable by determined actors; docs must say "deterrence + audit", never "prevention". Server-side anomaly review of event logs is the production upgrade path.

## ADR-006 — Three-tier eligibility recommendation
**Status:** Accepted · **Amended 2026-10-29** (rule restated to match the code; thresholds fully configurable)
**Context:** Admission committee needs a nuanced signal, not pass/fail.
**Decision:** ELIGIBLE (overall ≥ `overallMinPercent` ∧ 0 failed sections). Otherwise CONDITIONALLY_ELIGIBLE (overall ≥ `conditionalMinPercent` ∧ failed ≤ `maxFailedSectionsForConditional`). Otherwise NOT_ELIGIBLE. Defaults 50 / 40 / 40 / 2. Per-program overrides allowed (FR-SCORE-04, FR-CFG-02).
**Consequences:** + Maps to real remedial-course planning. + No dead zone: the earlier written rule ("1–2 failed") was wrong; the code already used `≤ 2`. − Results are recommendations until committee weighting is decided (PRD Q1).

## ADR-007 — Full question set served per session (all 50)
**Status:** Accepted for prototype · **Must change** (grilling Q9)
**Context:** Bank holds exactly 50 questions; engine serves 10/section = all of them.
**Decision:** Prototype serves the full bank shuffled.
**Consequences:** ❌ Bank leaks after one cycle (every candidate sees every question). Production requires bank ≫ served (target 500+) and per-session sampling from the pool, plus question lifecycle states.

## ADR-008 — Services layer as the backend seam
**Status:** Accepted · **Contract now defined** in [15-api-spec.md](./15-api-spec.md) (2026-10-29)
**Context:** Prototype must convert to real API without UI rewrite.
**Decision:** Components/hooks only call `services/*`; mocks live behind that boundary.
**Consequences:** + Clean migration path in principle. − `api.js` missing, no request/response contracts, no async/error conventions yet — the seam is claimed, not proven. Define contracts before backend Phase 1.

## ADR-009 — localStorage-persisted Zustand for all state
**Status:** Accepted for prototype · **Superseded for production by ADR-015** (localStorage becomes an offline cache only)
**Context:** No backend; need session recovery on refresh.
**Decision:** auth/test/question/examConfig/antiCheat stores persisted.
**Consequences:** + Same-browser recovery works. − No cross-device recovery, tamperable answers/timer, single-origin quota. Superseded server-side in production.

## ADR-010 — Client-side PDF generation (jsPDF)
**Status:** Accepted
**Context:** Candidates need a downloadable score report; no server rendering available.
**Decision:** jsPDF + jspdf-autotable builds the report in-browser.
**Consequences:** + Zero infra, instant. − Report not tamper-evident (no server-signed document); fine for prototype, server-signed PDFs later.

## ADR-011 — Binary RBAC (admin/candidate)
**Status:** Accepted for prototype · **Superseded:** a third role `reviewer` (read-only, program-scoped) is added in R2 (FR-AUTH-10)
**Context:** PRD persona Kamal needs read-only committee access.
**Decision:** Two roles via ProtectedRoute.
**Consequences:** + Simple. − No reviewer role; committee members would need full admin. Proposed: add `reviewer` (read-only admin subset).

## ADR-012 — No i18n layer yet
**Status:** **Superseded by ADR-017**
**Context:** PRD lists bilingual EN/BN as Must-Have; primary persona needs Bangla; AGENTS.md promised an i18n structure. Nothing exists.
**Decision pending:** Introduce JSON-keyed i18n now (before strings calcify) or formally descope with sign-off. → Decided in ADR-017.

---

## ADR-013 — MongoDB as the production database
**Status:** Accepted · **Date:** 2026-10-29 · **Supersedes:** the "PostgreSQL" plan in the proposal and the README roadmap
**Context:** Production needs a server-authoritative exam: deadline, served-paper snapshot, hidden answer keys, scoring, single attempt.
Candidates were **MongoDB**, **Firestore** and **PostgreSQL**. The data is document-shaped (question with embedded options; a session with
embedded answers, flags, timings and events, written as one unit every 5 s). The reporting needs are group-by/rank (merit lists per program,
section averages, eligibility distribution). Hosting must stay open: Atlas or DIU on-prem, because of data-residency questions.
**Options:**
- *Firestore:* no server to run, built-in Auth with phone OTP, realtime. **But** scoring and answer-key secrecy still need Cloud Functions
  (Blaze plan), group-by/rank analytics are weak (aggregation is limited to count/sum/avg; merit ranking needs exports or extra jobs), it is
  Google-only with no on-prem option, and costs scale per document read/write.
- *PostgreSQL:* strong for reporting and transactions, but the session document would need a JSONB column or several tables. The team
  preferred a single JS-shaped data model.
- *MongoDB:* documents map 1:1 to the existing JS shapes; the aggregation pipeline (`$facet`, `$setWindowFields`/`$rank`) covers analytics
  and merit lists; multi-document transactions on a replica set; runs on Atlas (Mumbai) or self-hosted.
**Decision:** MongoDB ≥ 7, replica set in every environment that uses transactions. Schema in [14](./14-database-schema.md).
**Consequences:** + One data model from browser to DB; flexible for Bangla fields and future question types; on-prem possible. − Schema
discipline must come from Mongoose + Zod (no DB-enforced FKs); we must run a backend (accepted, ADR-014); transactions require a replica set
(dev uses `mongodb-memory-server` replset / Docker single-node replset).

## ADR-014 — Fastify 5 + Mongoose 8 on Node.js 22 (JavaScript ESM)
**Status:** Accepted · **Date:** 2026-10-29
**Context:** Need an HTTP API in the same language as the frontend, with schema validation, good performance for ~400 autosaves/s at peak, and a small surface for a student team.
**Options:** Express + Mongoose (most familiar, slower, validation bolted on); **Fastify + Mongoose** (fast, plugin encapsulation, first-class schemas); NestJS + TypeScript (structured, heavy, adds TS).
**Decision:** Fastify 5 with `fastify-type-provider-zod` so the **same Zod schemas** validate requests on the server and forms on the client; Mongoose 8 for models. Plain JS ESM, no build step. Layout and rules in [16](./16-backend-architecture.md).
**Consequences:** + Response serialization by schema strips secret fields (defence in depth for answer keys); `app.inject` makes integration tests easy. − Plugin encapsulation has a learning curve; fewer tutorials than Express.

## ADR-015 — Server-authoritative test sessions
**Status:** Accepted · **Date:** 2026-10-29 · **Supersedes:** ADR-001/ADR-009 for production
**Context:** In the prototype, answers, keys, timer and score live in localStorage. They can be tampered with, can't be recovered on another device, and the timer pauses when the tab closes (D-06).
**Decision:** The server owns the `testSessions` document: served paper (sampled + shuffled server-side with `crypto.randomInt`), absolute `deadline`, answers via idempotent autosave (`seq`), server-side violation counting and risk, lazy + scheduled expiry, and scoring with the shared pure function at submit/expiry. The client only displays and queues.
**Consequences:** + Cheating by editing state is no longer possible; cross-device resume; deterministic, re-computable results. − Needs reliable connectivity for start/submit (mitigated by the offline queue and absolute deadlines); more server load (autosave every 5 s).

## ADR-016 — Auth: in-memory JWT access token + rotating httpOnly refresh cookie + argon2id
**Status:** Accepted · **Date:** 2026-10-29
**Context:** Candidates use shared or family phones; tokens in localStorage are exposed to XSS; plaintext passwords exist today (D-22).
**Decision:** 15-minute HS256 access JWT kept in memory; opaque refresh token (stored hashed) in an `httpOnly; Secure; SameSite=Strict` cookie scoped to `/api/v1/auth`, rotated on every use with reuse detection (revoke family); argon2id password hashes; login lockout; email OTP verification before a test can start.
**Consequences:** + XSS can't steal a long-lived token; stolen refresh tokens are detected. − A silent refresh on page load is needed; cookie + CORS config must be exact per environment.

## ADR-017 — i18n with JSON dictionaries and a tiny `useT()` hook
**Status:** Accepted · **Date:** 2026-10-29 · **Supersedes:** ADR-012
**Context:** EN/BN is a PRD Must. The app has ~200 hard-coded strings. A library (react-i18next) adds weight to the candidate bundle (NFR-01).
**Decision:** `src/i18n/en.json` + `bn.json`, a ~40-line `useT()` reading `uiStore.lang`, English fallback for missing keys, Bangla font fallback, optional `textBn` on questions. Candidate pages fully translated; admin pages may stay English.
**Consequences:** + Zero dependencies, tiny. − No ICU message format; pluralization is limited to `_one`/`_other`.

## ADR-018 — Testing stack: Vitest, Testing Library, mongodb-memory-server, Playwright, k6
**Status:** Accepted · **Date:** 2026-10-29
**Context:** No tests exist (grilling Q13). Scoring decides admissions; answer-key secrecy and single-attempt are security properties.
**Decision:** Vitest everywhere (native to Vite), RTL for components, `app.inject` + `mongodb-memory-server` (replset) for API integration, Playwright (+ axe) for E2E, k6 for load. Mandatory suites in [18](./18-testing-strategy.md).
**Consequences:** + One runner, fast feedback. − The memory server downloads a MongoDB binary in CI (cache it).

## ADR-019 — pnpm workspace with a shared package; frontend stays at the repo root
**Status:** Accepted · **Date:** 2026-10-29
**Context:** Scoring, risk, constants and validation schemas must be identical in the browser and the server. Moving the existing SPA into `apps/web` would churn every path.
**Decision:** `pnpm-workspace.yaml` packages `['.', 'server', 'packages/*']`; `packages/shared` (`@diu/shared`) is pure JS (no DOM/Node APIs); `server/` is `@diu/server`; the SPA remains at the root.
**Consequences:** + Single source for business rules; no big move. − The root package doubles as the web app and the workspace root (scripts must use `--filter`).