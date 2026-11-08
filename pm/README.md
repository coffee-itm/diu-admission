# Project Management — start here

| File | What it is |
|:--|:--|
| [BOARD.md](./BOARD.md) | **Dashboard**: current sprint, every card and its status |
| [PROCESS.md](./PROCESS.md) | Methodology (Scrum-lite + Kanban in an SDLC frame, ADLC per card), roles, **model routing**, DoR/DoD, git workflow |
| [MODELS.md](./MODELS.md) | **Model catalogue**: the 6 verified models across Anthropic + OpenAI Codex, prices, blocked models, quota failover, savings analysis |
| [AGENT_PLAYBOOK.md](./AGENT_PLAYBOOK.md) | The exact loop a builder agent follows for one card |
| [ESCALATIONS.md](./ESCALATIONS.md) | Questions from blocked agents, answered by Opus |
| [agents/](./agents/) | Role instructions (single source for Claude Code + OpenCode + Pi) |
| [commands/](./commands/) | Workflow commands (single source) |
| [tasks/](./tasks/) | Task cards `T-xxx` |
| [sprints/](./sprints/) | Sprint plans, reviews, retros |

## Daily use

**Model tiers** (full policy: [PROCESS.md §2](./PROCESS.md#2-roles-and-model-routing-token-policy)):

Two providers, both already in Pi: **Anthropic** and **OpenAI Codex**. Verified list, prices and failover: [MODELS.md](./MODELS.md).

| Tier | Model | Who runs it | Rel. input cost |
|:--|:--|:--|:-:|
| **plan** | `anthropic/claude-opus-5-5` | your main session — planning only, never builds | 40× |
| **build** | `anthropic/claude-sonnet-5-5` | `frontend-dev` `backend-dev` `test-engineer` `devops` | 20× |
| **lite** | `openai-codex/gpt-6-luna` | `builder-lite` `scout` `docs-keeper` | 1× |
| **review** | `anthropic/claude-haiku-5-5` (lite cards) · `openai-codex/gpt-5.6-terra` (build cards) | `reviewer` · `reviewer-pro` | 1× / 20× |

**A card is never reviewed by the family that built it.** The OpenCode DeepSeek free lane is retired.

A card's `Model:` line picks the agent, not the role: `build` → the role agent, `lite` → `builder-lite` (it reads the card's
role file itself). Default is `lite`; `build` has to be justified by the §2.3 test — **loud failures are safe on Haiku,
silent failures need Sonnet.**

**Planning (Opus, Claude Code)** — expensive, rare:
```text
claude --model opus      →  /plan-sprint S2   ·   /resolve-escalations   ·   /sprint-review S1
```

**Building (cheap)** — most of the work:
```text
# Option 1: Claude Code. The command pins Sonnet; the subagents are pinned to Sonnet/Haiku.
claude --model sonnet    →  /next-task            (or /next-task T-004)

# Option 2 (PREFERRED): Pi. Only harness that reaches both providers; every agent pins its own model.
pi                       →  /next-task            (or /next-task T-004 · /review-task T-004 · /parallel-review · /scout <area>)

# (OpenCode's free-model lane is retired — see MODELS.md §1.)
```
Run `Model: build` cards through the role agent (Sonnet 5.5) and `Model: lite` cards through `builder-lite` (GPT-6 Luna). In Pi every agent pins its own `provider/model:thinking`, so a subagent never silently inherits Opus. Claude Code can only reach the Anthropic lane, so its `builder-lite` falls back to Haiku 5.5.
Review every build with `/review-task`: `reviewer` on Haiku 5.5, or `reviewer-pro` on Sonnet 5.5 when the diff touches auth, sessions, scoring, answer keys or anti-cheat. A builder never reviews its own work, and the free model never reviews at all.
**Parallel lanes:** open up to 3 terminals, one per lane (A, B, C on the board), each running `/next-task <id>` for the next card in its lane.

**Status (cheapest)**: `/sprint-status`.

Pi reads these same files: `.pi/agents/*.md` and `.pi/prompts/*.md` are thin wrappers that point back here, so a change in `pm/agents/` or `pm/commands/` reaches all three harnesses. On first run Pi asks for project trust — grant it, or start with `pi -a`. Setup and the vendored ECC skills: [`.pi/README.md`](../.pi/README.md).

## Rules of thumb
- One card per session, fresh session each time (keeps context and cost small).
- Never let a builder "figure out" requirements. If a card is unclear, it escalates and Opus fixes the card.
- After each sprint, Opus improves the role files and the card template based on what went wrong (retro).
