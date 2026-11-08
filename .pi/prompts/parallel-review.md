---
description: Run three independent reviewers over the current diff (correctness, tests, scope)
argument-hint: "[git ref or T-xxx]"
---
Review ${1:-the working tree and staged changes} from three independent angles. Make **one** `subagent` call in parallel mode (`tasks` array), so the three reviewers never see each other's output:

```
tasks:
  - agent: "reviewer"
    task:  "Target: ${1:-uncommitted changes}. Review ONLY correctness and security: logic errors, auth/session handling, answer-key or secret exposure, input validation, persisted-store migrations. Cite file:line. Do not comment on tests or style."
  - agent: "reviewer"
    task:  "Target: ${1:-uncommitted changes}. Review ONLY test quality: does a test exist for each behavior change, would it fail without the change, are timers/randomness deterministic, were any assertions weakened or deleted? Run pnpm test and report real output. Cite file:line."
  - agent: "reviewer"
    task:  "Target: ${1:-uncommitted changes}. Review ONLY scope and simplicity: out-of-scope edits, unrelated reformatting, dead code, needless abstraction, manual useMemo/useCallback/React.memo (banned — React Compiler), duplicated logic that belongs in packages/shared or src/lib. Cite file:line."
```

Then merge the three reports yourself: deduplicate, drop anything contradicted by the actual code, and output one ranked list — **Blocking**, then **Should fix**, then **Nits** — each with `file:line`. Note explicitly where two reviewers disagreed. Change nothing.
