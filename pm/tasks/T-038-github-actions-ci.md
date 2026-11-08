# T-038 · GitHub Actions CI: lint, all tests, build

Status: ✔️ Done
Sprint: S2 · Role: devops · Model: lite · Size: S
Tier rationale: YAML against a spec section; CI itself proves it (PROCESS §2.3)
Depends on: T-037
Implements: P1-06

## Goal
Every push and PR runs lint, every workspace's tests, and the frontend build on GitHub Actions, so a broken change can't be merged without anyone noticing.

## Context to read
- `context/18-testing-strategy.md` §5: the CI YAML. Only the `ci` job is in scope here.
- Root `package.json` scripts (`lint`, `test:all`, `build`)

## Files
- `.github/workflows/ci.yml` (create): `on: [push, pull_request]`, one job `ci` on `ubuntu-latest`: checkout@v4 → pnpm/action-setup@v4 → setup-node@v4 (node 22, cache pnpm) → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm test:all` → `pnpm build`. Cache the mongodb-memory-server binary (`~/.cache/mongodb-binaries`) with actions/cache.
- `package.json` (modify): add `"packageManager": "pnpm@<the version in use locally>"`, so the action picks the same pnpm.

## Acceptance criteria
1. [ ] `actionlint` passes if it's available; otherwise the YAML parses (`python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/ci.yml'))"`).
2. [ ] After the coordinator pushes the sprint branch, the `ci` run is green (`gh run watch`). The coordinator records the run URL in the Agent log.
3. [ ] No new lint warnings locally.

## Verify
```bash
python3 -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml'))" && pnpm lint && pnpm test:all && pnpm build
```

## Out of scope
- The `e2e` job (needs Playwright, planned with the E2E suite). Deploy workflows (S8). Branch protection settings (the owner sets these in GitHub).

## Agent log
- Fix round [T-038]: `test:all` now runs root `pnpm test` and then `pnpm -r test`; no recursive script loop.
- Single `pnpm test:all`: root 29 files / 225 tests; shared 5 files / 40 passed + 2 todo; server 1 file / 5 passed.
- Captured output's `grep -c 'src/'` is 0: Vitest's standard summaries do not print source paths. `pnpm exec vitest list` does show `src/` paths, but it is separate from test execution.
- YAML parsed ✅; `pnpm lint` ✅; `pnpm build` ✅ (existing chunk-size advisory); no new lint warnings.
- CI run remains ⚠️ not verified (coordinator to watch and record URL).

## Review

Reviewer: fresh-eyes review of `cf9e128` + fix round `b86926b`. Verdict: **APPROVED** (AC2 not verified, see below; not a failure).

**Acceptance criteria**
1. ✅ YAML parses (`yaml.safe_load` OK; top-level `name`, `on`, `jobs` with single job `ci`). `actionlint` not installed, so this is the fallback. `.github/workflows/ci.yml:1-22`.
2. ⚠️ not verified (no CI run). Needs a push of `sprint/S2-workspace-skeleton`; coordinator to record the run URL.
3. ✅ No new lint warnings: `pnpm lint` exit 0, no warning output.

**Spec check, context/18 §5 vs `ci.yml`**
- Steps present, same order: checkout@v4 (`ci.yml:9`), pnpm/action-setup@v4 before setup-node (`:10-11`), setup-node node 22 + cache pnpm (`:11-14`), install `--frozen-lockfile` (`:19`), lint (`:20`), test:all (`:21`), build (`:22`).
- No Mongo `services:` container anywhere in the workflow (grep clean). Server tests use `mongodb-memory-server` (`server/test/helpers/app.js:1-7`).
- Cache key `mongodb-binaries-${{ runner.os }}-7.0.14` (`ci.yml:18`) matches the pinned `MONGO_VERSION = '7.0.14'` (`server/test/helpers/app.js:7`). Path `~/.cache/mongodb-binaries` matches the library default (`node_modules/.pnpm/mongodb-memory-server-core@11.3.0*/lib/util/postinstallHelper.js:24`). Binary download is lazy (`pnpm-workspace.yaml:8`).
- pnpm: `package.json:5` `packageManager: pnpm@11.13.1`, equal to the local `pnpm -v` (11.13.1). With no `version:` input, action-setup@v4 reads this field. Not run on a runner, so part of AC2.
- **Deviation A (non-blocking, needs a doc decision):** §5 says `pnpm test:all -- --coverage`; the card and workflow say `pnpm test:all`. Literal §5 is a silent no-op with the fixed script. Log line 1 shows pnpm expands it to `pnpm test && pnpm -r test -- --coverage`, so the root suite runs without coverage. The package-level `vitest run -- --coverage` treats the arg as positional and ignores it. Exit 0, no coverage. `@vitest/coverage-v8` is not installed either. Recommend recording coverage as deferred in context/18 §5, or a follow-up card.
- **Deviation B (card-sanctioned):** the `e2e` job in §5 is absent. The card's Out-of-scope lists it. Note: no E2E card exists on the board yet, so the "planned with the E2E suite" anchor is missing. Planner should add one (P7 per context/19).
- Branch protection (§5 last para) is owner-side, out of scope per the card.

**Fix-round check (`b86926b`)**
- `package.json:17` `test:all` = `pnpm test && pnpm -r test`. Runs root plus the workspace packages, no recursion loop.

**Verification (real output, logs in /tmp/t038-*.log)**
- `pnpm test:all` exit **0**. Root: `Test Files 29 passed (29)`, `Tests 225 passed (225)`. Shared: `Test Files 5 passed (5)`, `Tests 40 passed | 2 todo (42)`. Server: `Test Files 1 passed (1)`, `Tests 5 passed (5)`.
- Fail-fast: appended a failing `expect(1).toBe(2)` to `src/lib/utils.test.js`. `pnpm test:all` exit **1**, `Test Files 1 failed | 28 passed (29)`, and no `packages/shared` or `server` lines in the output (they never ran). File restored; sha1 verified; `git status` clean for it.
- `pnpm lint` exit **0**, no warnings.
- `pnpm build` exit **0** (`built in 8.21s`; pre-existing chunk-size advisory only).

**Non-blocking risks (confirm in the AC2 run)**
- The cache key hard-codes `7.0.14` in `ci.yml:18`, separate from `app.js:7`. If the version changes, both must change. A mismatch only costs a cache miss.
- `ubuntu-latest` is 24.04. The mongod 7.0.14 download for that distro is unverified until CI runs.
- The `on:` key parses as boolean `True` under PyYAML 1.1. This is standard GitHub syntax, not a defect.
