# Task cards

One file per card: `T-xxx-short-slug.md`. IDs are global and never reused. Cards are written by Opus in `/plan-sprint`
and executed by builder agents following [../AGENT_PLAYBOOK.md](../AGENT_PLAYBOOK.md).

## Card template

```markdown
# T-xxx · <imperative title>

Status: ✅ Ready
Sprint: S<n> · Role: <frontend-dev|backend-dev|test-engineer|devops|docs-keeper> · Model: <free-ok|sonnet> · Size: <S|M>
Depends on: <T-yyy, … | none>
Implements: <FR-…, D-…, P0-…>

## Goal
<1–3 sentences: the outcome, why it matters>

## Context to read
- <file or doc §section> — <why>

## Files
- <path> — <what changes>   (create/modify)

## Steps
1. …

## Acceptance criteria
1. [ ] <observable, testable>
2. [ ] Tests: <which tests, what they assert>
<!-- Planner: for "none remain" criteria, give the repo-wide grep (`grep -rn "<pattern>" src` → empty) and list EVERY file it hits under Files.
     Touching a persisted store? Add a criterion for old persisted state. Browser-only checks go to the sprint QA card. -->
3. [ ] No new lint warnings.

## Verify
```bash
pnpm test -- <pattern> && pnpm lint && pnpm build
```

## Out of scope
- …

## Agent log
<builder fills: what changed, results, notes>

## Review
<reviewer fills: verdict + required changes>
```
