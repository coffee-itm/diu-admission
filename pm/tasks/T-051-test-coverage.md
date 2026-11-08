# T-051 · Make `--coverage` real

Status: ✅ Ready
Sprint: S3 · Role: test-engineer · Model: lite · Size: S
Tier rationale: tooling configuration, verified by its own output (PROCESS §2.3)
Depends on: —
Implements: context/18 §5 (the S2 review found the flag is a silent no-op)

## Goal
`context/18` §5 prescribes `pnpm test:all -- --coverage`, but pnpm forwards the flag only to `pnpm -r test`, the root suite ignores it, and `@vitest/coverage-v8` isn't installed — so coverage silently never runs.

## Context to read
- `context/18-testing-strategy.md` §5 and the deferral note added by T-039
- `package.json` scripts, `vite.config.js` `test` block, `server/vitest.config.js`

## Files
- `package.json` (modify): `@vitest/coverage-v8` as a devDependency; a `test:coverage` script that genuinely covers **all three** packages (remember `pnpm -r` excludes the root — that was the T-038 bug).
- `vite.config.js`, `server/vitest.config.js`, `packages/shared` config (modify): `coverage.provider: 'v8'`, text + lcov reporters, sensible excludes (mocks, test helpers, config).
- `.github/workflows/ci.yml` (modify): run coverage and upload the report as an artifact.
- `.gitignore` (modify): ignore `coverage/`.
- `context/18-testing-strategy.md` (modify): replace the deferral note with the real command, and record the measured baseline percentages.

## Acceptance criteria
1. [ ] One command prints a coverage table for the root SPA, `@diu/shared` **and** `@diu/server`.
2. [ ] The measured baseline is written into `context/18` §5 as numbers, not adjectives.
3. [ ] CI runs it and uploads the artifact; the run stays under ~3 minutes.
4. [ ] **No threshold that fails the build is introduced in this card** — measure first, enforce in a later sprint. State the recommended thresholds in the log.
5. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm test:coverage && pnpm lint && pnpm build
```

## Out of scope
- Writing new tests to raise coverage. Failing thresholds.

## Agent log

## Review
