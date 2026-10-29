# T-010 · Test engine uses admin config + persisted question bank + per-section sampling

Status: ✔️ Done
Sprint: S1 · Role: frontend-dev · Model: sonnet · Size: M
Depends on: T-009
Implements: FR-CFG-04, D-08, D-21, D-24

## Goal
`testService.loadTest` reads `mockExamConfig` and `mockQuestions` directly, so the admin's Exam Config and Question Bank edits never reach the test, and `questionCount` is ignored. The question bank store isn't even persisted.

## Context to read
- `context/13-srs.md` FR-CFG-04, FR-TEST-02 (sampling idea)
- `src/services/testService.js:1-25`, `src/store/examConfigStore.js`, `src/store/questionStore.js`, `src/lib/utils.js` (`shuffleArray`)

## Files
- `src/store/questionStore.js` — wrap with `persist` (`name: 'diu-questions'`), seeded from `mockQuestions` the first time
- `src/services/testService.js` — `loadTest` reads `useExamConfigStore.getState().config` and `useQuestionStore.getState().questions`. For each `config.sections` entry (in order): pool = questions of that section, then `shuffleArray(pool).slice(0, questionCount)`, each with shuffled options. If `pool.length < questionCount` → throw `Error('Not enough questions in section <id>: need N, have M')`
- `src/services/testService.test.js` — extend

## Acceptance criteria
1. [ ] With `questionCount: 3` for every section → 15 questions served, 3 per section, no duplicates (test).
2. [ ] A question created in the admin bank can appear in a test (test: add a question to the store, set its section count = pool size → it's included).
3. [ ] `examConfig` returned by `loadTest` is the store's config (title/time changes show up in the test).
4. [ ] Too-small pool → an error the Instructions page shows as a toast (the existing catch in `startTest`).
5. [ ] Option ids keep their original `a–d` values after shuffling (scoring relies on it).

## Verify
```bash
pnpm test -- testService && pnpm lint && pnpm build
```

## Out of scope
- Question status/lifecycle (R2). Hard-coded copy (T-011).

## Agent log
questionStore persisted ('diu-questions'); loadTest samples questionCount per config section from stores, throws on small pool. 5 new tests in testService.test.js. lint/test(124)/build green.

## Review
**APPROVED.** AC1-5 met (testService.js loadTest; questionStore persist 'diu-questions'). Lint clean, 124 tests pass, build ok. No status field on questions (R2, out of scope). Default persist merge: stored bank wins, seeded once. Advisory: startTest catch shows generic 'Failed to load test session' toast, not the specific 'Not enough questions' message (useTestEngine.js:28). 'diu-questions' matches T-018's STORAGE_KEYS.QUESTIONS, no conflict.
