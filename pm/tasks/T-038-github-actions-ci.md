# T-038 · GitHub Actions CI: lint, all tests, build

Status: 👀 Review
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
