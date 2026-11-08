# T-052 · CI hardening: pin the runner, bump the actions

Status: ✅ Ready
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

## Review
