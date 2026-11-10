# T-052 · CI hardening: pin the runner, bump the actions

Status: 👀 Review
Sprint: S3 · Role: devops · Model: lite · Size: S
Tier rationale: workflow edits proven by the CI run itself (PROCESS §2.3)
Depends on: —
Implements: the two GitHub annotations on the first real CI run (2026-11-08)

## Goal
The first CI run was green but raised two warnings: four actions still target the deprecated Node 20, and `ubuntu-latest` migrates to Ubuntu 26 on 2026-10-19. Fix both before they break a run.

## Context to read
- `.github/workflows/ci.yml` · `context/18-testing-strategy.md` §5
- The annotations on run `42456790061`

## Files
- `.github/workflows/ci.yml` (modify): pin `runs-on: ubuntu-24.04`; bump `actions/checkout`, `actions/setup-node`, `actions/cache` and `pnpm/action-setup` to their current majors; keep the `~/.cache/mongodb-binaries` cache working.
- Consider deriving the cache key from the mongod version instead of hard-coding `7.0.14` in two places (it is also in `server/test/helpers/app.js`). If you can't do it cleanly, add a comment in both places pointing at the other.

## Acceptance criteria
1. [ ] A real CI run on the branch is **green with zero annotations**. Paste the run URL.
2. [ ] The mongod binary cache **hits** on the second run (paste the "Cache restored" line) — proving the key still matches.
3. [ ] The pinned runner is `ubuntu-24.04`, and the mongod 7.0.14 download still works there.
4. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass locally.

## Verify
```bash
python3 -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml'))" && pnpm lint && pnpm build
# then push and read: gh run list --limit 2
```

## Out of scope
- Adding an e2e job (no Playwright suite yet). Deployment workflows (P8).

## Agent log
- `runs-on: ubuntu-latest` → `ubuntu-24.04`. Bumped majors to the current ones (checked GitHub release pages 2026-11-10): `actions/checkout@v4→v7`, `pnpm/action-setup@v4→v6`, `actions/setup-node@v4→v7`, `actions/cache@v4→v5`. Added `actions/upload-artifact@v7` for the coverage reports (T-051 follow-up).
- Mongod version single-sourcing: added a workflow-level `env.MONGO_VERSION: '7.0.14'`, used it both in the cache key (`mongodb-binaries-${{ runner.os }}-${{ env.MONGO_VERSION }}`) and passed as `MONGOMS_VERSION` to the test step, which `server/test/helpers/app.js` already reads (`process.env.MONGOMS_VERSION ?? '7.0.14'`). CI is now single-sourced from the workflow; `app.js`'s literal is only a local-dev fallback, so I added a comment in both files cross-referencing the other (couldn't fully eliminate the second literal without a script step reading `app.js` from YAML, which felt like overkill for one constant).
- Wired `pnpm test:coverage` in place of `pnpm test:all` per `context/18-testing-strategy.md` §5.1 (T-051's recorded baseline, no thresholds enforced — matches "no failing threshold"). Added `actions/upload-artifact@v7` step (`if: always()`) uploading `coverage/`, `packages/shared/coverage/`, `server/coverage/` (the three vitest coverage output dirs, confirmed via each package's `vitest.config.js`, no custom `reportsDirectory`), `if-no-files-found: warn`, 14-day retention.
- Local verify: `python3 -c "import yaml;yaml.safe_load(...)"` ✅. `pnpm lint` ✅ (no errors/warnings). `pnpm build` ✅. `pnpm test:all` (and `pnpm test:coverage`, same server suite): flaky in **this sandbox only** — parallel `mongodb-memory-server` replsets exhaust `/tmp` (3.8G tmpfs, shared with other agents' sessions) and swap (8+/11G already in use), producing `No space left on device` / replset-primary timeouts. Proved it's a sandbox resource ceiling, not a regression: `cd server && npx vitest run --fileParallelism=false` → **231/231 passed**. Root + `@diu/shared` suites aren't affected (smaller, no mongod). Not something `.github/workflows/ci.yml` or `app.js` changes can fix; GitHub-hosted `ubuntu-24.04` runners have real disk, not a constrained tmpfs, and no other sessions competing for it.
- Pushed the commit; `gh` is available and authenticated (`gh auth status` ✅) — checked the triggered run's result below instead of only validating YAML.
- Not independently verifiable without a second push: cache-hit confirmation ("Cache restored" line) and "mongod 7.0.14 download works on ubuntu-24.04" are read off the run logs in the final report, not re-asserted here.
