# PROJECT_STATUS — DIU Admission (full-repo read, 2026-11-08)

> **Purpose:** a resumable snapshot of the *whole* project so a fresh agent session can continue
> without re-reading everything. Written after a complete pass over `src/`, `context/`, `pm/`, configs and git history,
> plus a live run of the quality gate.
> **Snapshot point:** branch `sprint/S2-workspace-skeleton`, HEAD `491d2fc` (2026-10-31).
> When this file and the code disagree, trust the code — then update this file.
> Authority order for *requirements* is unchanged: `context/13-srs.md` > `context/09-adrs.md` > specs 14–17 > `context/12-prd.md`.

---

## 1. One-paragraph status

DIU Admission is a **university-wide online aptitude assessment** (50 MCQs, 5 sections, 54 min) for Daffodil International
University. The product is at **R1: a correct, fully tested frontend-only prototype** — React 19 SPA, mock data,
localStorage, no backend. Release R0 (demoable prototype) and the whole of roadmap **phase P0 are complete** (sprint S1,
22 cards, merged into `prototype` as `600c2e7`). Sprint **S2 is active and half-done**: wave 1 (8 carry-over/UX/defect cards)
is ✔️ Done and committed; wave 2 (pnpm workspace → `@diu/shared` → Mongo/dev-infra → Fastify skeleton → CI) is
**not started**, all 9 cards sit at ✅ Ready, blocked only by a human decision on build routing (the free model's quota ran out).
Design for the production system (MongoDB + Fastify + server-authoritative sessions) is fully specified in `context/14`–`20`
but **zero backend code exists**.

---

## 2. Live gate result (run 2026-11-08 on HEAD)

| Check | Result |
|:--|:--|
| `pnpm lint` | ✅ **0 errors, 0 warnings** (the S1 carry-over warning in `TestPage.jsx` was fixed by T-030) |
| `pnpm test` | ✅ **31 files, 245 passed + 2 todo (247)**, ~13 s |
| `pnpm build` | ✅ built in ~5 s. ⚠️ main chunk **1.46 MB (452 KB gz)** — breaks NFR-01 (< 300 KB gz on the candidate path). Deferred to S7/P7-06 |
| Working tree | 8 modified `pm/*` files (Pi harness wiring: role files, README, commands) + untracked `.pi/` — **uncommitted** |

---

## 3. Where the project sits on its own roadmap

| Phase (`context/19`) | Scope | State |
|:--|:--|:--|
| **P0** Prototype correct + test harness | 14 items P0-01…P0-14 | ✅ **100 % done** (S1), all ticked in `context/19` |
| **P1** Workspace, `@diu/shared`, server skeleton, CI | P1-01…P1-06 | 🔄 **0 % built** — cards T-032…T-038 written and Ready (S2 wave 2) |
| **P2** Auth & users (API + frontend) | P2-01…P2-05 | 📋 planned → sprint S3 |
| **P3** Programs, question bank, exam cycles | P3-01…P3-05 | 📋 S4 |
| **P4** Server-authoritative sessions + scoring | P4-01…P4-08 | 📋 S5 |
| **P5** Results, merit, analytics, security review | P5-01…P5-07 | 📋 S6 |
| **P6/P7** OTP, i18n EN/BN, dark mode, a11y, perf | | 📋 S7 |
| **P8** Hardening, load test, deploy, pilot | | 📋 S8 |

Releases: **R0** prototype (shipped, mid-defense) · **R1** correct prototype (shipped, = today) · **R2** MVP with backend (P1–P5)
· **R3** pilot (P6–P8) · **R4** university rollout.

---

## 4. Code inventory (what actually exists)

**~7,700 LOC** across 120 files in `src/` (56 `.jsx`, 64 `.js`). No `server/`, no `packages/`, no `e2e/`, no `load/`, no `.github/`.

```
src/
  App.jsx                      all 16 routes, AuthProvider + ProtectedRoute(role)
  main.jsx  index.css          Tailwind v4 @theme tokens
  components/ui/               Button Input Card Badge Modal Spinner ProgressBar Timer LanguageToggle(unused)
  components/layout/           Header(+test) Footer Sidebar navItems CandidateLayout AdminLayout
  components/charts/           ScoreBarChart SectionPieChart MeritLineChart (recharts)
  pages/public/                Landing Login(+test) Register(+test) NotFound
  pages/candidate/             Dashboard Instructions Test(+test) Result
  pages/admin/                 Dashboard QuestionBank QuestionForm ExamConfig(+test)
                               Candidates CandidateDetail MeritList(+test) Analytics
  features/auth/               AuthProvider ProtectedRoute useAuth(+test) resolvePostLoginPath(+test)
  features/test/               useTestEngine(+test) useTimer(+test) useAntiCheat(+test) useAutoSave(no-op, D-23)
                               QuestionCard QuestionNav SectionHeader TestSubmitDialog SecurityWarningModal(+test)
  features/questions/          QuestionTable(+test) QuestionForm(+test) BulkImportModal
                               questionSchema(+test) importQuestions(+test)
  features/scoring/            ScoreCard EligibilityBadge scoringConfig
  store/                       authStore testStore(+test) antiCheatStore questionStore examConfigStore(+test)
  services/                    authService(+test) testService(+test) resultService analyticsService(+test)
  lib/                         constants scoring(+test) utils(+test) pdfGenerator
                               csvExport(+test) csvParse(+test) meritCsv(+test) importQuestions-support
                               examConfigValidation(+test) fullscreen(+test) instructionRules(+test)
                               storageMigration(+test) runStorageMigration
  data/                        mockQuestions(50, +test) mockCandidates(16 cand + 1 admin) mockResults(15) mockExamConfig
  test/setup.js
```

**Not present** (AGENTS.md lists them as target): `services/api.js`, `services/questionService.js`,
`features/scoring/useScoring.js`, `src/hooks/`, `public/fonts/`.

### Key behaviours as built
- **Scoring** (`src/lib/scoring.js`): config-driven thresholds merged over `DEFAULT_SCORING_CONFIG`, compares **unrounded**
  percentages, three tiers (ELIGIBLE / CONDITIONALLY_ELIGIBLE / NOT_ELIGIBLE), returns `failedSections`, `answeredCount`.
  Boundary tests S1–S11 exist. Matches FR-SCORE-04. No dead zone.
- **Test engine** (`useTestEngine` + `testStore`): wall-clock `deadline` (not ticks), session owned by `candidateId`,
  resume for the same user only, `maxAttempts` enforced via `testService.countAttempts`, cross-section Next/Prev,
  submit reads fresh store state, idempotent via `submittingRef`.
- **Paper sampling** (`testService.loadTest`): reads the **admin's live config + question store**, samples
  `section.questionCount` per section, shuffles questions *and* options, throws if a pool is too small.
- **Anti-cheat** (`useAntiCheat` + `antiCheatStore`): 10 layers, counters read fresh state so warn@2 / auto-submit@5 tab
  switches and auto-submit@3 fullscreen exits actually fire; summary persisted into the result record; `pageshow` clears
  the unload flag so a reload no longer logs a false tab switch.
- **Storage** keys all `diu-*` with a migration from the legacy `itm-*` keys (`lib/storageMigration.js`).
- **Admin**: candidates/merit read real registered candidates, candidate detail works, analytics counts unique ids and
  builds a real per-day trend, merit list has an eligibility filter (hides NOT_ELIGIBLE by default), CSV export with BOM,
  CSV import really parses/validates (line numbers, quotes, 2 MB/2000-row limits, unique options).

---

## 5. Defects & known gaps

`context/06` registers **D-01…D-29**. After S1: **25 fixed**. Still open:

| ID | Sev | Gap | Lands in |
|:--|:--|:--|:--|
| D-22 | P1 | Passwords stored/compared in plaintext (mock auth) | P2-02 (argon2id, backend) |
| D-23 | P2 | `useAutoSave` is a no-op (zustand `persist` does the saving) | P4-08 |
| D-27 | P2 | No CI; `@tanstack/react-query` still an unused dependency | T-038 / P2-05 |
| D-29 | P1 | **No EN/BN i18n, no dark mode** (both PRD "Must"); `LanguageToggle` rendered nowhere | P7-01…04 |

**S2 carry-over candidates noted in `pm/sprints/S2.md`** (not yet carded):
`MeritListPage` `item.eligibility.replaceAll` throws when eligibility is missing; "No results yet" flashes on first load;
the fullscreen mount prompt can appear on a normal start; `parseCSV('a,"b\n')` returns `[]`; shared `Modal` lacks
`role="dialog"` / `aria-modal` / focus trap (a11y, S7); bundle code-splitting (S7); `.npmrc`
`verify-deps-before-run=false` may be stale; `ANTI_CHEAT_IMPLEMENTATION.md` still names the `itm-anti-cheat` key.

**Operational rule learned the hard way (S2):** never run `pnpm` inside a `git archive`/copy whose `node_modules` is
symlinked to the main tree — it rewrites the main tree's `node_modules`. Reviewers work in the main tree only.

---

## 6. Sprint board (verified against the cards, 2026-11-08)

**S2 — "Carry-over + workspace & server skeleton"** · branch `sprint/S2-workspace-skeleton` from `prototype`.

| ✅ Ready | 🔨 In Progress | 👀 Review | ✔️ Done | ⛔ Blocked | Total | Done % |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 9 | 0 | 0 | 8 | 0 | 17 | 47 % |

- **Done (wave 1):** T-024 logout privacy · T-025 exam-config validation · T-026 fullscreen on resume ·
  T-027 merit eligibility filter · T-028 small UI fixes · T-029 CSV import hardening · T-030 deps warning ·
  T-031 admin element ids.
- **Ready (wave 2, strictly chained):** **T-032** workspace → (T-033 shared scoring/constants ‖ T-035 Mongo 7 replset +
  `.env.example` + `/api` proxy) → T-034 shared risk/question schemas → **T-036** Fastify bootstrap `/health` `/ready` →
  T-037 server test helpers → T-038 GitHub Actions CI → T-039 docs sync → T-040 S2 QA.
- **Only pickable card right now: T-032** (its dependency T-031 is Done). Everything else waits on it.
- **Escalations:** none open (E-019 resolved in S1).
- **Free-tier blocker: resolved by policy on 2026-11-08.** Wave 2 was re-routed onto the new four-tier model policy
  (PROCESS.md §2): `lite` cards run on **Haiku 5.5** via `builder-lite`, `build` cards on **Sonnet 5.5** via the role agent.
  Nothing waits on the OpenCode free quota any more. Tiers: T-032/034/035/038/039 `lite`; T-033/036/037/040 `build`.

**S2 exit criteria:** lint/test/build green · `/api/v1/ready` returns `db: ok` locally · CI green on the branch ·
T-040 QA all ✅ · docs synced.

---

## 7. Process & tooling (how work gets done here)

- **Method:** Scrum-lite + Kanban in an SDLC frame; **one task card per agent session**; WIP ≤ 3.
  `pm/BOARD.md` is the dashboard, `pm/tasks/T-xxx-*.md` are the source of truth for status.
- **Model routing (rewritten 2026-11-08, [pm/MODELS.md](./pm/MODELS.md) + PROCESS.md §2):** two providers, both OAuth-
  authenticated in Pi — **Anthropic** and **OpenAI Codex**. Tiers: **plan** `claude-opus-5-5` (never builds) · **build**
  `claude-sonnet-5-5` (role agents) · **lite** `gpt-6-luna` (`builder-lite`, `scout`, `docs-keeper`) · **review**
  `claude-haiku-5-5` for lite cards and `gpt-5.6-terra` for build cards. Two load-bearing facts: `gpt-6-luna` matches
  Haiku's $0.10/$0.50 but has **no 5× cliff above 100K input**, and only Anthropic models are cache-warming eligible, so
  **long-lived sessions go Anthropic, one-shot subagents go OpenAI**. **No card is reviewed by the family that built it.**
  Default tier is `lite`; `build` requires the §2.3 test. Two rejections promote a card one tier. The OpenCode DeepSeek
  lane is retired. Pi is the only harness that reaches both providers — run sprints from Pi.
- **Roles:** `pm/agents/{frontend-dev,backend-dev,test-engineer,reviewer,devops,docs-keeper}.md` — a single source wired
  into Claude Code (`.claude/agents`, incl. `builder-lite` + `reviewer-pro`), OpenCode (`opencode.json`) and Pi
  (`.pi/agents`, every file with a **pinned `model:`** — an unpinned Pi subagent inherits the parent's Opus).
- **Git:** one branch per sprint off `prototype`, one Conventional Commit per card tagged `[T-xxx]`, never `--amend`,
  never `git add -A`; the coordinator commits `pm/BOARD.md`.
- **Env:** pnpm 11, Node 22, Vite 8 + rolldown, React 19 + React Compiler (so **no manual `useMemo`/`useCallback`/`memo`**),
  Tailwind v4, React Router v7, Zustand, Vitest + RTL + jsdom. A Codespaces devcontainer forwards 5173 (SPA) and 4000 (API).

---

## 8. Documentation map (21 context docs, all current as of 2026-10-29)

`00` ← this file · `context/README.md` index and source-of-truth order ·
`01` overview/personas/status · `02` current+target architecture · `03` scoring domain · `04` test engine & anti-cheat ·
`05` roles/routes · `06` **defect register D-01…D-29 + open questions Q1–Q12 + risks** · `07` grilling · `08` domain model ·
`09` **ADR-001…019** · `10` glossary · `11` ITM→university pivot · `12` PRD · `13` **SRS (64 FR + NFR)** ·
`14` MongoDB schema · `15` REST API `/api/v1` · `16` Fastify architecture · `17` frontend target · `18` testing strategy +
Definition of Done · `19` **roadmap P0–P8** · `20` deployment & ops.
Root: `AGENTS.md` (build rules), `ANTI_CHEAT_IMPLEMENTATION.md` (client reference, has known-buggy sample code),
`README.md` (product/marketing + Codespaces quick start), `mid-defense/` (presentation + PDF).

**Decisions that constrain everything:** ADR-013 MongoDB (not PostgreSQL/Firestore) · ADR-014 Fastify 5 + Mongoose 8 on
Node 22, plain JS ESM · ADR-015 server-authoritative sessions · ADR-016 in-memory JWT + rotating httpOnly refresh cookie +
argon2id · ADR-018 Vitest/RTL/mongodb-memory-server/Playwright/k6 · ADR-019 pnpm workspace with `@diu/shared`.

---

## 9. Biggest risks right now

1. **Everything is still client-authoritative.** Answers, timer and score live in localStorage and can be tampered with;
   `correctAnswer` ships to the browser. Only P4 fixes this — it is the single most important remaining work.
2. **Wave 2 has not started**, so the project is one card (T-032) away from momentum but stalled on a routing decision.
3. **Bundle 1.46 MB** vs. an NFR of 300 KB gz on a 3G candidate path.
4. **i18n/dark mode are PRD Musts with zero implementation** and are scheduled last-but-one (S7).
5. Question-bank exposure: 50 questions total, every candidate currently sees the whole pool for a section.

---

## 10. Recommended next actions

1. Decide build routing for S2 wave 2 (Sonnet now vs. wait for the free quota) — this is a *human* decision, see §6.
2. Commit or discard the 8 uncommitted `pm/` edits + untracked `.pi/` (Pi harness wiring) so the tree is clean before T-032
   touches `pnpm-lock.yaml`.
3. Run **T-032** (devops, `/next-task T-032`), then T-033 ‖ T-035, T-034, T-036, T-037, T-038, T-039, T-040 in that order.
4. At S2 close, run `/sprint-review S2`, fold the carry-over list in §5 into cards, and merge into `prototype`.

---

*Snapshot written 2026-11-08. Refresh it after each sprint review (`/sprint-review S<n>`) or whenever this file disagrees with the code.*
