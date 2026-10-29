# Project Management — start here

| File | What it is |
|:--|:--|
| [BOARD.md](./BOARD.md) | **Dashboard**: current sprint, every card and its status |
| [PROCESS.md](./PROCESS.md) | Methodology (Scrum-lite + Kanban in an SDLC frame, ADLC per card), roles, **model routing**, DoR/DoD, git workflow |
| [AGENT_PLAYBOOK.md](./AGENT_PLAYBOOK.md) | The exact loop a builder agent follows for one card |
| [ESCALATIONS.md](./ESCALATIONS.md) | Questions from blocked agents, answered by Opus |
| [agents/](./agents/) | Role instructions (single source for Claude Code + OpenCode) |
| [commands/](./commands/) | Workflow commands (single source) |
| [tasks/](./tasks/) | Task cards `T-xxx` |
| [sprints/](./sprints/) | Sprint plans, reviews, retros |

## Daily use

**Planning (Opus, Claude Code)** — expensive, rare:
```text
claude --model opus      →  /plan-sprint S2   ·   /resolve-escalations   ·   /sprint-review S1
```

**Building (cheap)** — most of the work:
```text
# Option 1: Claude Code. The command pins Sonnet; the subagents are pinned to Sonnet/Haiku.
claude --model sonnet    →  /next-task            (or /next-task T-004)

# Option 2: OpenCode with your free default model
opencode                 →  /next-task            (or @frontend-dev Execute task card pm/tasks/T-002-fix-answer-key.md)
```
Run cards marked `Model: sonnet` from Claude Code. Run `free-ok` cards in OpenCode.
**Parallel lanes:** open up to 3 terminals, one per lane (A, B, C on the board), each running `/next-task <id>` for the next card in its lane.

**Status (cheapest)**: `/sprint-status`.

## Rules of thumb
- One card per session, fresh session each time (keeps context and cost small).
- Never let a builder "figure out" requirements. If a card is unclear, it escalates and Opus fixes the card.
- After each sprint, Opus improves the role files and the card template based on what went wrong (retro).
