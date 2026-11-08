# T-039 · Docs sync after S2

Status: ✔️ Done
Sprint: S2 · Role: docs-keeper · Model: lite · Size: S
Tier rationale: docs sync, minimal diffs, no judgement (PROCESS §2.3)
Depends on: T-024 … T-038
Implements: Definition of Done ("update the docs in the same change"), roadmap ticks P1-01 … P1-06

## Goal
The docs match the repo after S2: the workspace layout, the new scripts, how to run Mongo and the server locally, the fixed carry-over items, and the roadmap ticks.

## Context to read
- `pm/sprints/S2.md` (scope), each S2 card's Agent log
- `AGENTS.md` ("Reality check" block, Development Commands), `README.md`, `context/02-tech-architecture.md` (actual tree), `context/06-open-issues-doc-gaps.md`, `context/19-implementation-roadmap.md` (P1), `ANTI_CHEAT_IMPLEMENTATION.md` (storage key)

## Files
- `context/19-implementation-roadmap.md`: tick P1-01 … P1-06 when their cards are Done.
- `AGENTS.md`: update the Reality check (now exist: `packages/shared`, `server/`, `docker-compose.yml`, `.github/workflows/ci.yml`), and add `pnpm dev:server`, `pnpm test:all` and `docker compose up -d mongo` to Development Commands.
- `README.md`: a "Run the backend locally" section (copy `.env.example`, compose up, `pnpm dev:server`, curl `/api/v1/ready`).
- `context/02-tech-architecture.md`: the actual tree, including the workspace packages.
- `context/06-open-issues-doc-gaps.md`: mark the S1 carry-over items fixed by T-024 … T-031 with their card IDs.
- `ANTI_CHEAT_IMPLEMENTATION.md`: note that the key is now `diu-anti-cheat` and that `itm-anti-cheat` is migrated (T-018).

## Acceptance criteria
1. [ ] `grep -n "itm-anti-cheat" ANTI_CHEAT_IMPLEMENTATION.md`: every hit is explained as the legacy key.
2. [ ] Every command in the new README section runs as written. Spot-check `pnpm test:all`.
3. [ ] The roadmap ticks match the cards that are Done on the board.
4. [ ] No code files changed (`git diff --stat` shows only `.md` files).

## Verify
```bash
git diff --stat && pnpm test:all
```

## Out of scope
- Rewriting specs. Gaps found go to `pm/ESCALATIONS.md`.

## Agent log

- Synced workspace/backend commands and architecture/reality-check docs; recorded S2 carry-over fixes and legacy anti-cheat key migration.
- Ticked P1-01…P1-06 (each corresponding card status verified ✔️ Done); noted coverage deferral to S3.
- Verify: `pnpm test:all` passed (270 tests, 2 todo); `pnpm lint` clean; `pnpm test` 225 passed; `pnpm build` passed (known 1.46 MB chunk advisory); `git diff --check` clean.
- README backend commands documented; full live Mongo/server invocation not run in this verification.
- Fix round: corrected P1 notes, actual workspace tree, shuffle and seed descriptions; placed coverage caveat on its CI command. Docs only.
- Verify: `pnpm lint` passed; `pnpm test:all` passed (270 passed, 2 todo); `pnpm build` passed (chunk-size advisory).

## Review

**Verdict (commit 05ef99b): CHANGES REQUESTED.** Scope is docs-only and the commands work; several claims are false or stale, so the docs are not yet truthful.

### Verification run (reviewer, main tree)
- `pnpm test:all` exit 0: root 225 passed; `@diu/shared` 40 passed + 2 todo; `@diu/server` 5 passed. Total 270 + 2 todo, matches the builder log.
- `pnpm test` exit 0 (225). `pnpm lint` exit 0; `npx eslint . --max-warnings 0` exit 0 (0 warnings). `pnpm build` exit 0 (chunk-size advisory only).
- Live backend, using the project's healthy `mongo:7` container: `pnpm dev:server` then `curl /api/v1/ready` gives HTTP 200 `{"status":"ok","db":"ok"}`; `/api/v1/health` gives 200. With `MONGODB_URI` on a closed port, `/api/v1/ready` gives HTTP 503 `db: down`.
- `git show 05ef99b --name-only`: only `.md` files. `git diff --check` clean. Acceptance 4 met.
- Coverage claim reproduced: `pnpm test:all -- --coverage` expands to `pnpm test && pnpm -r test -- --coverage`, exits 0, writes no `coverage/`, and `@vitest/coverage-v8` is absent. The note's content is accurate.

### Acceptance criteria
1. ✅ `itm-anti-cheat` hits are `ANTI_CHEAT_IMPLEMENTATION.md:3`, `:201`, `:202`, all explained as legacy. Code: `src/store/antiCheatStore.js:132` persists `STORAGE_KEYS.ANTI_CHEAT` = `'diu-anti-cheat'` (`src/lib/constants.js:103`). Migration map `src/lib/storageMigration.js:7`, run first from `src/main.jsx:1`.
2. ✅ README commands run: `pnpm dev:server`, `/api/v1/ready` (200 and 503 paths), `/api/v1/health`, `pnpm test:all`, `docker compose config` (valid). ⚠️ unverified: Node 22 (only Node 26 is installed here). The inline `# comments` in `server/.env.example` parsed under Node 26 `--env-file`, not checked on 22. ⚠️ not executed: `cp server/.env.example server/.env` (would overwrite the existing `server/.env`) and `docker compose down` (would stop the running project Mongo). Both are syntactically valid.
3. ❌ Roadmap ticks: P1-02 is wrong (R1). P1-01 and P1-06 need a note (R2, R4). P1-03, P1-04 and P1-05 ✅ (see below).
4. ✅ No D-xx row is newly marked fixed by the diff. D-28 `✅ Fixed (T-018)` predates the diff and holds: no `itm-` literal outside `storageMigration.js`.
5. ❌ Coverage note placement: the note is at `context/18-testing-strategy.md:113-115`, above the yaml fence. The contradicting line is `:129`. It is not next to it (R5).

### Required changes
- **R1** `context/19-implementation-roadmap.md:55` (P1-02): `classify` does not exist. `grep -rn classify packages/ src/` finds nothing; it appears only as a design sketch in `context/16-backend-architecture.md:220`. Eligibility is inline in `calculateScore` (`packages/shared/scoring.js:74-85`). `resolveThresholds` does exist (`scoring.js:14`). Either amend the text or add a note under the tick. Do not leave it unqualified.
- **R2** `context/02-tech-architecture.md:167`: `pnpm seed # seed MongoDB (server seed script)` is false. `server/package.json` has no `seed` script. `pnpm seed` fails with `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` (exit 1). Reword to say it is not implemented yet (root `seed` delegates to a missing `@diu/server seed`). Also add that caveat to P1-01 (`context/19:54`), since 16 §1 lists the root `seed` script.
- **R3** `context/19-implementation-roadmap.md:59` (P1-06): the `e2e` job prescribed by `context/18` §5 is absent from `.github/workflows/ci.yml`. It is deferred per `pm/sprints/S2.md:77`. Add that note to the tick.
- **R4** `context/18-testing-strategy.md:129`: annotate the flag on the yaml line itself, e.g. `- run: pnpm test:all -- --coverage  # no-op until S3, see note above`. The note at `:113-115` sits above the fence and is not adjacent. `pm/sprints/S2.md:87` asked for exactly this annotation.
- **R5** `AGENTS.md:325`: `pnpm-workspace.yaml packages [...]` is listed under "Target additions", but the file exists (T-032). Move it to "Now present (S2)". Same stale line in `context/02-tech-architecture.md:125-135` ("Target repository layout").
- **R6** `context/02-tech-architecture.md:37` ("Directory layout (actual)"): still the `src/`-only tree. The card asked for the actual tree including the workspace packages. Add `packages/shared`, `server`, `docker-compose.yml`, `.github/workflows/ci.yml`, `pnpm-workspace.yaml`, or point explicitly to the "Workspace (added in S2)" paragraph at `:33`.
- **R7** `context/02-tech-architecture.md:35`: "shuffle have root `src/lib/*` re-export shims" is imprecise. There is no `src/lib/shuffle.js`. Shuffle is wrapped as `shuffleArray` in `src/lib/utils.js:14-15`. Reword.
- **R8** (minor) `context/02-tech-architecture.md:161`: "`pnpm dev:server` ... (after P1)" is stale now that P1 is done.

### Checked and correct (no action)
- AGENTS.md "does not exist yet" list: `services/api.js`, `services/questionService.js`, `features/scoring/useScoring.js`, `hooks/`, `public/fonts/` are all MISSING, as stated.
- AGENTS.md "exist" list: all 14 paths exist (`src/lib/{csvExport,csvParse,meritCsv,fullscreen,storageMigration,runStorageMigration}.js`, `src/features/questions/importQuestions.js`, `src/store/antiCheatStore.js`, `src/features/test/{useAntiCheat.js,SecurityWarningModal.jsx}`, `packages/shared`, `server`, `docker-compose.yml`, `.github/workflows/ci.yml`).
- Shims: `src/lib/scoring.js:2`, `src/lib/constants.js:4`, `src/features/questions/questionSchema.js:1` (re-export), `src/features/scoring/scoringConfig.js:2`. Note that the AGENTS.md scaffold tree at `:267` still labels `questionSchema.js` as "Zod schema". That is the original scaffold block, so optional.
- P1-03: `server/src/{app,server,config}.js`, plugins `mongoose/security/errors/zod`, `modules/health/routes.js:6-19` (`/health`, `/ready`), graceful shutdown in `server/src/server.js`. Live-verified (see above).
- P1-04: `server/test/helpers/app.js:1,27` uses `MongoMemoryReplSet`; `server/test/health.test.js` has the health tests.
- P1-05: `docker-compose.yml` `mongo:7` with `--replSet rs0`; `server/.env.example` exists; `vite.config.js:21` proxies `/api` to `:4000`.
- P1-01: `pnpm-workspace.yaml` packages match the card; `dev:server` and `test:all` scripts exist and work (`package.json`). Only the `seed` caveat (R2).
- Carry-over list `context/06` (T-024 … T-031): each claim checked in code. T-024 `src/features/auth/useAuth.js:42-47`. T-025 `src/lib/examConfigValidation.js`, `ExamConfigPage.jsx:38`. T-026 `src/features/test/useAntiCheat.js:13-19,36-44,153-154`. T-027 `src/lib/meritCsv.js:42-56`, `MeritListPage.jsx:74`. T-028 `QuestionTable.jsx:32-33`, `LoginPage.jsx:20`, charts `minWidth={0}`. T-029 `src/lib/csvParse.js:4`, `BulkImportModal.jsx:10`, `importQuestions.js:8` (`MAX_IMPORT_ROWS = 2000`). T-030 `TestPage.jsx:16,65,81` (`getState`, no subscription, no `eslint-disable`). T-031 `ExamConfigPage.jsx:76-77` (ids).
- `ANTI_CHEAT_IMPLEMENTATION.md:202` still shows the legacy name as live snippet code. The comment at `:201` explains it, so criterion 1 is met. Optional tidy: use `STORAGE_KEYS.ANTI_CHEAT`.

### Unverified (⚠️)
- Node 22 runtime (only Node 26 installed): README "≥ 22" and `.env.example` inline comments.
- `cp server/.env.example server/.env` and `docker compose down` not executed (see criterion 2).

### Next step
Builder applies R1-R7 (R8 optional). Re-review after the fix commit. Board row set to 🔨 In Progress.

## Re-review (commit c7cb013): CHANGES REQUESTED

Docs-only confirmed: `git diff 3ee12fb HEAD --name-only` lists 8 `.md` files, no code. `git diff --check` clean.

### Fix status
- **Finding 1 (P1-02 classify): fixed.** `context/19:55` amends the text. `grep -rn classify packages/ src/ server/` finds nothing. `resolveThresholds` is exported (`packages/shared/scoring.js:14`, re-exported by `index.js:3`). Eligibility is inline at `scoring.js:74-85`. Deferral to P4-05 matches `context/19:83`. TRUE.
- **Finding 2 (pnpm seed): fixed.** `context/02:171` and `context/19:54` say not runnable. Root `package.json:18` delegates to `@diu/server seed`. `server/package.json` has no `seed`. `pnpm seed` re-run: exit 1, `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. P3-04 is the seed card (`context/19:74`). TRUE.
- **Finding 3 (coverage note adjacency): fixed.** Note moved onto the CI line at `context/18:125`. Old note removed (no dangling reference: grep finds no other `coverage` mention in `context/18`). Re-ran `pnpm test:all -- --coverage`: exit 0, output `pnpm test && pnpm -r test -- --coverage`, no coverage report, no `coverage/` dir, no `@vitest/coverage-v8` under `node_modules`. TRUE.
- **Finding 4 (AGENTS pnpm-workspace listed as target): fixed.** `AGENTS.md:322-325` now lists it under "Now present (S2)". `pnpm-workspace.yaml` content matches `['.', 'server', 'packages/*']`. TRUE.
- **Finding 5 (Directory layout SPA-only): PARTIAL.** Workspace entries are added (`context/02:63-67`), but the placement is malformed; see R9.
- **Finding 6 (shuffle shim claim): fixed.** `context/02:35` now says `shuffleArray` in `src/lib/utils.js`. `src/lib/utils.js:14-15` wraps `@diu/shared/shuffle`. No `src/lib/shuffle*` exists. The shims `src/lib/constants.js:4` and `src/lib/scoring.js:2` are real. TRUE.
- **Finding 7 (P1-01 / P1-06 notes): fixed.** P1-01 `context/19:54` (seed caveat). P1-06 `context/19:59`: `ci.yml` has lint, `test:all`, build, and no e2e job. S2 defers the e2e job (`pm/sprints/S2.md:88`). TRUE.
- **R8 (`dev:server (after P1)`): fixed** (`context/02:165`).

### Required changes
- **R9** `context/02-tech-architecture.md:61-67`: the new workspace lines sit after `└── lib/` inside the `src/` block, with no root node, at the same column as `src/`. The tree is ambiguous (the reader cannot tell whether `packages/` is inside `src/`). Fix: wrap the whole block in a `diu-admission/` root and nest `src/` as a child (`├── src/`). Keep the entries listed.

### Optional (non-blocking)
- **O1** `context/18-testing-strategy.md:113-127`: the yaml is the target spec under a heading that names `ci.yml`. The real `ci.yml` has no coverage flag and no e2e job. The annotation is accurate for the command, but a reader may take it as present in CI. Suggest adding "(target spec; `ci.yml` today runs `pnpm test:all` with no flag and has no `e2e` job)" to the heading or to the fence comment.
- **O2** `context/02:40-66`: the `src/lib` list omits `examConfigValidation.js` and `instructionRules.js` (pre-existing, not introduced by the fix).

### Gates (reviewer, main tree, after c7cb013)
- `pnpm lint` exit 0 (`eslint .`).
- `pnpm test` exit 0: 29 files, 225 passed.
- `pnpm build` exit 0 (chunk-size advisory only).
- `pnpm test:all` exit 0: root 225; `@diu/shared` 40 passed + 2 todo; `@diu/server` 5 passed.

### Next step
Builder applies R9 (O1, O2 optional) in one docs commit. Re-review after that commit. Board row stays 🔨 In Progress.

## Final re-review (commit c9b83cf): APPROVED

Scope: R9 only, plus the gates. Docs-only confirmed: `git diff 3ee12fb HEAD --name-only` lists 8 `.md` files, no code. `git diff --check` clean. `c9b83cf` touches only `context/02-tech-architecture.md`.

- **R9 (tree rooting): fixed.** `context/02:40` roots the tree at `diu-admission/`. `src/` is a child at `:41`. `packages/shared/` (`:66`), `server/` (`:67`), `docker-compose.yml` (`:69`), `pnpm-workspace.yaml` (`:70`) and `.github/workflows/ci.yml` (`:71`) are siblings of `src/` at the root level. TRUE.
- **(b) Paths named in the block: all exist.** Checked by `ls`/`test -e`. Covered: `src/` top files, all `components/{ui,layout,charts}`, `pages/{public,candidate,admin}`, `features/{auth,test,questions,scoring}` (including `resolvePostLoginPath.js`, `SecurityWarningModal.jsx`, `importQuestions.js`, `questionSchema.js`, `scoringConfig.js`), `store/*` (incl. `antiCheatStore.js`), `services/{auth,test,result,analytics}Service.js`, `data/*`, `test/setup.js`, `packages/shared/*` (incl. `schemas/{common,question}.js`), `server/{package.json,src/app.js,src/config.js,src/server.js,src/lib,src/modules/health,src/plugins/{errors,mongoose,security,zod}.js,test/health.test.js,test/helpers}`, `docker-compose.yml`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`. `StatCard` is exported at `src/components/ui/Card.jsx:38`. Absent names stay absent: `services/api.js`, `services/questionService.js`, `lib/shuffle.js`, `useScoring.js`, `hooks/`.
- **(c) `src/lib/` line (`:63-65`): matches.** Real non-test files (12): `constants, scoring, utils, pdfGenerator, csvExport, csvParse, meritCsv, examConfigValidation, instructionRules, fullscreen, storageMigration, runStorageMigration`. The block lists the same 12, none invented. `*.test.js` files are omitted, which is the convention for the whole block (no `components/` or `pages/` entry lists tests either).
- **Non-blocking, not required by R9:** the `server/` line (`:67-68`) omits `.env.example`, `vitest.config.js`, `src/modules/health/service.js` and `test/helpers/{app,factories}.js`. The block is a summary, and the criterion only requires named paths to exist.

### Gates (reviewer, main tree, after c9b83cf)
- `pnpm lint` exit 0.
- `pnpm test:all` exit 0: `Test Files 29 passed (29)`, `Tests 225 passed (225)` (root); `@diu/shared` 40 passed + 2 todo; `@diu/server` 5 passed.
- `pnpm build` exit 0 (`✓ built in 5.54s`).

Board row set to ✔️ Done.
