# Commands (single source)

The instructions for each workflow command live here. Both tools load them:
- Claude Code: `.claude/commands/<name>.md` (each pins a model) → "follow `pm/commands/<name>.md`".
- OpenCode: `opencode.json` → `command.<name>.template` = `{file:./pm/commands/<name>.md}`.

| Command | Model | Purpose |
|:--|:--|:--|
| [`/next-task [T-xxx]`](./next-task.md) | Sonnet / free | Pick the next Ready card, have the role agent build it, have the reviewer review it, update the board |
| [`/review-task T-xxx`](./review-task.md) | Sonnet / free | Review one card that is in Review |
| [`/sprint-status`](./sprint-status.md) | Haiku / free | Recount the board, print a short status |
| [`/plan-sprint S<n>`](./plan-sprint.md) | **Opus** | Refine the next roadmap phase into Ready cards |
| [`/resolve-escalations`](./resolve-escalations.md) | **Opus** | Answer open escalations, fix cards/specs |
| [`/sprint-review S<n>`](./sprint-review.md) | **Opus** | Sprint review + retro + next sprint proposal |
