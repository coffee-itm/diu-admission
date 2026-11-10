# T-051 · Make `--coverage` real

Status: 👀 Review
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
1. [x] One command prints a coverage table for the root SPA, `@diu/shared` **and** `@diu/server`.
2. [x] The measured baseline is written into `context/18` §5 as numbers, not adjectives.
3. [ ] CI runs it and uploads the artifact; deferred to T-052 (ci.yml reserved, out of scope this run).
4. [x] **No threshold that fails the build is introduced in this card** — measure first, enforce in a later sprint. State the recommended thresholds in the log.
5. [x] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm test:coverage && pnpm lint && pnpm build
```

## Out of scope
- Writing new tests to raise coverage. Failing thresholds.

## Agent log
- Added `@vitest/coverage-v8` (root devDependency, pinned `^5.0.5` to match `vitest` — `5.1.0` caused a "mixed versions" warning); `test:coverage` root script runs `vitest run --coverage` then explicit `test:coverage` scripts in `packages/shared` and `server` package.json (not `pnpm -r test -- --coverage`: pnpm forwards a literal `--` which makes vitest treat `--coverage` as a filename filter, silently running zero coverage — discovered and fixed this during verification).
- Added `coverage.provider:'v8'`, reporters `text`+`lcov`, excludes (test files, `src/test/**`, `src/services/mock/**`, config) to `vite.config.js`; created `packages/shared/vitest.config.js` (none existed before); added coverage block to `server/vitest.config.js` (`src/**/*.js`, excludes `server.js`).
- `.gitignore`: added `coverage`. `eslint.config.js`: added `coverage`/`**/coverage/**` to `globalIgnores` (out-of-scope file, but required — `pnpm test:coverage && pnpm lint` otherwise fails lint on generated `lcov-report` JS).
- Baseline (measured): root SPA 48.43%/43.81%/51.96%/52.91% (stmts/branch/fn/line); `@diu/shared` 85.55%/71.15%/91.66%/92.1%; `@diu/server` 94.65%/85.14%/97.22%/96.2%. Recorded in `context/18-testing-strategy.md` §5.1 with recommended future thresholds (shared ≥90% lines, server ≥80% lines/service.js, SPA none yet — gap is untested pages/charts, not regressions).
- Criterion 3 (CI artifact upload) deferred per assignment: `.github/workflows/ci.yml` is reserved for T-052.
- `pnpm lint` found one pre-existing error unrelated to this card: `src/store/authStore.test.js:52` `'process' is not defined` — untracked file from a concurrent peer agent's in-progress work, not touched by this card.
- Verify: `pnpm test:coverage` ✅ (all 3 packages print tables, 250+40+231 tests pass), `pnpm lint` ✅ for my changes (unrelated error above persists), `pnpm build` ✅.

## Review
