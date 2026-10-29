# T-002 · Fix the wrong answer key and guard the question bank with a data test

Status: ✅ Ready
Sprint: S1 · Role: frontend-dev · Model: free-ok · Size: S
Depends on: T-001
Implements: FR-QB-07, D-01

## Goal
`q_logic_010` is marked `b` (13) but 18÷3×2+4−1 = 15 (option `a`). Fix it and add a test that catches bad keys in the future.

## Context to read
- `context/06-open-issues-doc-gaps.md` row D-01
- `src/data/mockQuestions.js:24`

## Files
- `src/data/mockQuestions.js` — modify line for `q_logic_010`
- `src/data/mockQuestions.test.js` — create

## Steps
1. Set `correctAnswer: 'a'` and the explanation to `'18 ÷ 3 × 2 + 4 − 1 = 6 × 2 + 4 − 1 = 15'`.
2. Test file asserts, for every question: exactly 4 options with ids a–d, `correctAnswer` is one of its option ids, unique `id`s, `difficulty` ∈ easy/medium/hard, and there are exactly 10 questions per section in `SECTION_ORDER`.
3. One explicit test: `q_logic_010` has `correctAnswer === 'a'`.

## Acceptance criteria
1. [ ] Key fixed; explanation cleaned.
2. [ ] Data test passes and would fail if any key pointed at a non-existent option.

## Verify
```bash
pnpm test -- mockQuestions && pnpm lint
```

## Out of scope
- Re-checking the maths of all other 49 questions (note anything suspicious in the log only).

## Agent log

## Review
