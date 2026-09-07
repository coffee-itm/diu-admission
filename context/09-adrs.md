# 09 — Architecture Decision Records

Status legend: **Accepted** (built) · **Proposed** (recommended) · **Superseded**

---

## ADR-001 — Frontend prototype with mock data and localStorage
**Status:** Accepted · **Date:** prototype phase
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
**Status:** Accepted · **Boundary bug noted** (grilling Q7)
**Context:** Admission committee needs a nuanced signal, not pass/fail.
**Decision:** ELIGIBLE (≥50% overall ∧ all sections ≥40%), CONDITIONALLY_ELIGIBLE (≥40% overall ∧ 1–2 failed sections), NOT_ELIGIBLE (otherwise). Thresholds admin-configurable.
**Consequences:** + Maps to real remedial-course planning. − Dead zone (40–49% overall, zero failed sections ⇒ NOT_ELIGIBLE by exclusion) needs explicit handling + tests. Results are recommendations until committee-weighting is decided.

## ADR-007 — Full question set served per session (all 50)
**Status:** Accepted for prototype · **Must change** (grilling Q9)
**Context:** Bank holds exactly 50 questions; engine serves 10/section = all of them.
**Decision:** Prototype serves the full bank shuffled.
**Consequences:** ❌ Bank leaks after one cycle (every candidate sees every question). Production requires bank ≫ served (target 500+) and per-session sampling from the pool, plus question lifecycle states.

## ADR-008 — Services layer as the backend seam
**Status:** Accepted · **Contract undefined** (grilling Q14)
**Context:** Prototype must convert to real API without UI rewrite.
**Decision:** Components/hooks only call `services/*`; mocks live behind that boundary.
**Consequences:** + Clean migration path in principle. − `api.js` missing, no request/response contracts, no async/error conventions yet — the seam is claimed, not proven. Define contracts before backend Phase 1.

## ADR-009 — localStorage-persisted Zustand for all state
**Status:** Accepted for prototype
**Context:** No backend; need session recovery on refresh.
**Decision:** auth/test/question/examConfig/antiCheat stores persisted.
**Consequences:** + Same-browser recovery works. − No cross-device recovery, tamperable answers/timer, single-origin quota. Superseded server-side in production.

## ADR-010 — Client-side PDF generation (jsPDF)
**Status:** Accepted
**Context:** Candidates need a downloadable score report; no server rendering available.
**Decision:** jsPDF + jspdf-autotable builds the report in-browser.
**Consequences:** + Zero infra, instant. − Report not tamper-evident (no server-signed document); fine for prototype, server-signed PDFs later.

## ADR-011 — Binary RBAC (admin/candidate)
**Status:** Accepted · **Gap vs PRD** (grilling Q17)
**Context:** PRD persona Kamal needs read-only committee access.
**Decision:** Two roles via ProtectedRoute.
**Consequences:** + Simple. − No reviewer role; committee members would need full admin. Proposed: add `reviewer` (read-only admin subset).

## ADR-012 — No i18n layer yet
**Status:** Proposed to fix · **Must-Have violation** (grilling Q12)
**Context:** PRD lists bilingual EN/BN as Must-Have; primary persona needs Bangla; AGENTS.md promised an i18n structure. Nothing exists.
**Decision pending:** Introduce JSON-keyed i18n now (before strings calcify) or formally descope with sign-off.