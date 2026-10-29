# 18 — Testing Strategy

> **Status:** Nothing exists yet: no runner, no tests, no CI (D-27). This doc defines what to add and what is mandatory.
> Decision: ADR-018 in [09](./09-adrs.md).

---

## 1. Tooling

| Layer | Tool | Location | Command |
|:--|:--|:--|:--|
| Shared pure logic | Vitest | `packages/shared/**/*.test.js` | `pnpm --filter @diu/shared test` |
| Frontend unit/component | Vitest + `@testing-library/react` + `@testing-library/user-event` + `jsdom` | `src/**/*.test.jsx` | `pnpm test` |
| Backend integration | Vitest + `app.inject()` + `mongodb-memory-server` (replset, so transactions work) | `server/test/**/*.test.js` | `pnpm --filter @diu/server test` |
| End-to-end | Playwright (Chromium + mobile Chrome emulation at 360 px) | `e2e/*.spec.js` | `pnpm e2e` |
| Accessibility | `@axe-core/playwright` in E2E | `e2e/a11y.spec.js` | — |
| Load | k6 | `load/session-flow.js` | `k6 run load/session-flow.js` |

Root `vitest.config.js` uses `test.projects` (`['packages/shared', 'server', '.']`) or per-package configs. Frontend env: `jsdom`, `setupFiles: ['./src/test/setup.js']` (jest-dom matchers).

## 2. Coverage targets (NFR-11)

| Area | Target |
|:--|:--|
| `packages/shared` (scoring, risk, schemas) | ≥ 95 % lines, 100 % of the boundary table |
| `server/src/modules/*/service.js` | ≥ 80 % |
| Frontend hooks (`useTestEngine`, `useTimer`, `useAutoSave`, `useAntiCheat`) | ≥ 80 % |
| Pages | Smoke render + main interaction |

## 3. Mandatory test suites

### 3.1 Scoring boundary table

`calculateScore` + `classify`. Defaults: overall 50, section 40, conditional 40, maxFailed 2. Five sections × 10 questions unless stated.

| # | Section correct (M,L,I,E,B) | Overall | Failed | Expected | Why |
|:--|:--|:--|:--|:--|:--|
| S1 | 5,5,5,5,5 | 50 % | 0 | ELIGIBLE | Exactly on both thresholds |
| S2 | 5,5,5,5,4 | 48 % | 0 | CONDITIONALLY_ELIGIBLE | Former "dead zone": code already does this, the old written rule was wrong |
| S3 | 4,4,4,4,4 | 40 % | 0 | CONDITIONALLY_ELIGIBLE | 40 % section = not failed (≥) |
| S4 | 10,10,10,3,0 | 66 % | 2 | CONDITIONALLY_ELIGIBLE | High overall but 2 failed |
| S5 | 10,10,3,3,3 | 58 % | 3 | NOT_ELIGIBLE | 3 failed sections |
| S6 | 10,9,0,0,0 | 38 % | 3 | NOT_ELIGIBLE | Both rules fail |
| S7 | 4,4,4,4,3 | 38 % | 1 | NOT_ELIGIBLE | Overall < 40 |
| S8 | 10,10,10,10,3 | 86 % | 1 | CONDITIONALLY_ELIGIBLE | One failed section blocks ELIGIBLE |
| S9 | 0,0,0,0,0 (no answers) | 0 % | 5 | NOT_ELIGIBLE | Empty submission, `answeredCount 0` |
| S10 | 5,5,5,5,5 with CSE override `{overall 60, section 50}` | 50 % | 0 | CONDITIONALLY_ELIGIBLE | Program override applied (FR-CFG-02) |
| S11 | 1 section × 3 questions, 2 correct, `overallMin 66.7` | 66.67 % | 0 | CONDITIONALLY_ELIGIBLE | Compare **unrounded** (the current code rounds first and would say ELIGIBLE) |
| S12 | Negative marking 0.25, MATH 5 right / 5 wrong | MATH 3.75 | — | sectionScore 3.75 | FR-SCORE-02; floor at 0 per section |
| S13 | Answer with an option id not in `a–d` | — | — | Ignored (wrong) | Defensive |
| S14 | Answers for a qId not in the served paper | — | — | Ignored | Defensive |

### 3.2 Risk scoring (`computeRisk`)
- `{tab:1}` → W 2 → low. `{tab:2}` → 4 → medium. `{tab:5}` → 10 → high. `{devtools:2, copy:4}` → 10 → high.
- `fastAnswers`: 15 of 40 answered under 3 s → true (> 30 %). 12 of 40 → false.

### 3.3 Backend integration (must exist before R2 is done)

| Suite | Cases |
|:--|:--|
| Auth | Register → 201, the stored hash isn't the password · duplicate email 409 · login wrong password 401 with a generic message · lockout after 5 · refresh rotation · **reuse of a rotated token revokes the family** · logout clears the cookie |
| RBAC matrix | For each endpoint group × role {anon, candidate, reviewer(CSE), admin}, the expected status. A reviewer gets 404 for a non-CSE candidate. A candidate can't call any `/admin/*` |
| Answer-key secrecy | Start a session, then `GET /sessions/current` and `PATCH …/state`. Recursively assert that no key named `correctAnswer` or `explanation` appears anywhere in any candidate response |
| Session start | Unverified → 403 · no cycle → 409 · outside the window → 409 · second start returns the same active session (200) · after submit → 409 `ALREADY_ATTEMPTED` · **concurrent double start** (two parallel `inject`s) → exactly one session · pool too small → 409 |
| Served paper | Count per section = config · no duplicates · each `optionOrder` is a permutation of a–d · the paper doesn't change between reads |
| Autosave | Applies changes · stale `seq` ignored · clearing an answer (`null`) unsets it · unknown qId → 422 · after deadline + grace → 409 |
| Deadline / expiry | With fake timers or `deadline` in the past: lazy expiry on GET creates a result with `submitReason: 'timeout'`. The sweep job expires overdue sessions. `timeTaken` = deadline − start |
| Submit | Scores correctly against the original keys despite shuffled options · idempotent second submit returns the same `resultId` · the unique index prevents two results |
| Server anti-cheat | Events pushed past `maxTabSwitches` → `autoSubmitted: true`, `force_submitted` |
| Merit list | Ranking ties (same % and time → same rank, next rank skipped) · program filter · disqualified excluded |
| Analytics | Registrations counted once (D-18) · per-program and perDay correct on fixtures |
| CSV import | Valid file → imported as `draft` · bad rows reported with row numbers · dry-run writes nothing · BOM and quoted commas handled |
| Cycle lock | PATCH `sections` after the first session → 409 `CYCLE_LOCKED`. PATCH thresholds still works |

### 3.4 Frontend unit/component

| Target | Cases |
|:--|:--|
| `useAntiCheat` | **Regression D-02**: fire 5 `visibilitychange` events → counter 5, warning at 2, `onAutoSubmit` called once at 5. **D-03**: auto-submit uses the latest answers |
| `useTimer` | Remaining time comes from the deadline + clock offset, not ticks (D-06). Expiry calls submit once |
| `useTestEngine` | First question marked visited (D-07) · Next crosses sections · flag toggle · resume merges local un-acked changes |
| `useAutoSave` | Saves only when dirty · backoff on failure · flush on `pagehide` |
| `ProtectedRoute` / `LoginPage` | Redirect back to `from` (D-14) · wrong role → own dashboard |
| Logout | Clears test + anti-cheat + query cache (D-15) |
| `csvExport` | Escaping of quotes/commas/newlines, BOM present, Bangla names intact |
| `questionSchema` | Exactly 4 options, valid `correctAnswer`, tags parsing |
| i18n | Every `en.json` key exists in `bn.json` (or is listed in the allowed-fallback list) |

### 3.5 End-to-end (Playwright)

1. **Candidate happy path:** register → verify (read the OTP from the console mail driver via a test endpoint enabled only in `NODE_ENV=test`) → instructions → start → answer all → submit → result → PDF download event.
2. **Resume:** start, answer 5, close the context, open a new context (new device), log in, resume: the 5 answers are kept and the time keeps running.
3. **Offline autosave:** `context.setOffline(true)` for 20 s while answering, then back online → server state matches.
4. **Timeout:** cycle with `totalTimeMinutes: 1` → wait → result with `timeout`.
5. **Admin:** create a question → import CSV → create and publish a cycle → candidate takes the test → merit list CSV contains them.
6. **Reviewer scope:** a CSE reviewer can't see an EEE candidate.
7. **Mobile 360 px:** test page has no horizontal scroll; the question grid opens as a bottom sheet.
8. **a11y:** axe has no serious/critical violations on landing, login, register, instructions, test and result, in EN and BN.

### Load test

k6 scenario: ramp to **2,000 virtual candidates** over 10 min. Each: login → start → 54 min × (autosave every 5 s) → submit.
Pass criteria: autosave p95 < 300 ms, error rate < 0.1 %, no lost answers (compare the final server answers to the k6 script's expected answers for a sample).

## 4. Test data & fixtures

- `server/test/helpers/factories.js`: `makeUser({role, verified})`, `makeQuestions(perSection=20)`, `makeCycle(overrides)`, `login(app, user)` → token.
- Clean the DB between tests (`deleteMany` on all collections in `afterEach`). One memory server per test file.
- Frontend: MSW (`msw`) handlers mirroring [15](./15-api-spec.md) for component tests of data pages.

## 5. CI (GitHub Actions, `.github/workflows/ci.yml`)

```yaml
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test:all -- --coverage
      - run: pnpm build
  e2e:
    needs: ci
    runs-on: ubuntu-latest
    steps: # install, start mongo service (replset) + server + vite preview, then:
      - run: pnpm exec playwright install --with-deps chromium && pnpm e2e
```

A PR is mergeable only when lint, unit/integration tests and build pass. E2E is required on `main`/`prototype`.

## 6. Definition of Done (every task in [19](./19-implementation-roadmap.md))

- [ ] Behavior matches the cited FR/NFR IDs
- [ ] Tests added/updated (and the regression test for any D-xx fixed)
- [ ] `pnpm lint`, `pnpm test:all` and `pnpm build` pass
- [ ] New interactive elements have unique `id`s. New strings use i18n keys (from P7 on)
- [ ] Docs updated in the same PR when contracts or behavior changed (15/14/13/this file)
