# `.pi/` — Pi harness config for DIU Admission

Makes Pi a third lane alongside Claude Code and OpenCode, running the **same** `pm/` workflow.
`pm/agents/` and `pm/commands/` remain the single source of truth; everything here is a thin adapter.

| Path | What it is |
|:--|:--|
| `settings.json` | Wires the three directories below into Pi (project scope). |
| `agents/` | 9 agents for the `subagent` tool: the 6 `pm/` roles (each points at `pm/agents/<role>.md` instead of duplicating it), a read-only `scout` for recon, plus the two tier agents `builder-lite` (Haiku, mechanical cards) and `reviewer-pro` (Sonnet, security/scoring diffs). **Every file pins a `model:`** — see below. |
| `extensions/subagent/` | The official Pi subagent example extension, vendored from `@earendil-works/pi-coding-agent` 1.5.0 (MIT). Each child runs as a separate `pi` process with its own context window. |
| `prompts/` | `/next-task`, `/review-task`, `/parallel-review`, `/scout`, `/sprint-status`. |
| `skills/ecc/` | 16 skills vendored from [ECC](https://github.com/affaan-m/ECC) `pi/core`, MIT. |

## Daily use

```text
pi            →  /next-task            # pick + build + review the next Ready card
              →  /next-task T-021      # a specific card
              →  /review-task T-021    # review only
              →  /parallel-review      # 3 independent reviewers over the current diff
              →  /scout auth flow      # recon in a child context before planning
              →  /sprint-status        # cheap board summary
```

The first `subagent` call asks you to confirm running project-local agents. Approve it; project trust silences it afterwards.

## Model pinning (do not remove)

`extensions/subagent/index.ts` resolves a child's model as `agent.model ?? <the parent session's model>`. An agent file with
no `model:` frontmatter therefore runs on **whatever the dispatcher is using — normally Opus**, which is the most expensive
mistake available here. Current pins:

| Agent | Model | Thinking | Lane |
|:--|:--|:--|:--|
| `frontend-dev` `backend-dev` `test-engineer` `devops` | `anthropic/claude-sonnet-5-5` | high | Anthropic |
| `reviewer` | `anthropic/claude-haiku-5-5` | high | Anthropic |
| `reviewer-pro` | `openai-codex/gpt-5.6-terra` | high | OpenAI |
| `builder-lite` `scout` | `openai-codex/gpt-6-luna` | medium | OpenAI |
| `docs-keeper` | `openai-codex/gpt-6-luna` | low | OpenAI |

Pi is the **only** harness here that reaches both providers, which is why sprints should be run from Pi.
A card is never reviewed by the family that built it: Sonnet builds → OpenAI reviews, GPT-6 Luna builds → Haiku reviews.

Routing policy and the per-card tier test live in [`../pm/PROCESS.md` §2](../pm/PROCESS.md#2-roles-and-model-routing-token-policy).
After editing an agent file mid-session, run `/reload`.

## Why it is set up this way

- **Builder and reviewer are different processes.** A model cannot review its own work in the same context — it already believes the code is correct. The reviewer agent is read-only on source and must cite `file:line` and paste real `pnpm lint && pnpm test && pnpm build` output.
- **Context stays small.** The dispatcher never reads `context/` specs; the child reads only what its card cites. That is also why each role file says what *not* to read.
- **One card, one commit.** Enforced by `pm/AGENT_PLAYBOOK.md`, which every agent loads.
- **Project trust is required.** `.pi/settings.json`, the extension and the skills are trust-gated. Pi asks on first interactive start — answer yes, or use `/trust` to persist it. Non-interactive runs (`-p`, `--mode json/rpc`) silently skip all of it unless you pass `-a`. If `/next-task` is missing or `subagent` is not offered, trust is the reason.

Verified on Pi 1.5.0: with trust granted, all 16 skills load and the tool list is `read, bash, edit, write, subagent, codemode`.

## Vendored ECC skills

Source: `affaan-m/ECC` commit `d2ef268`, `pi/core/skills/`. 16 of 134, chosen to match this stack and the `ecc:*` references already in `pm/agents/`. Load with `/skill:<name>`.

| Skill | Used by |
|:--|:--|
| `react-patterns`, `react-testing`, `frontend-a11y`, `vite-patterns` | frontend-dev |
| `backend-patterns`, `api-design` | backend-dev |
| `tdd-workflow`, `e2e-testing` | test-engineer |
| `security-review`, `conventional-commit-review`, `change-impact` | reviewer |
| `docker-patterns`, `deployment-patterns` | devops |
| `architecture-decision-records` | docs-keeper |
| `error-handling`, `verification-loop` | everyone |

Cost: ~4.3 KB of descriptions (~1.1K tokens) always in the system prompt; full bodies (228 KB) load only on demand. The other 118 ECC skills were left out on purpose — they are other stacks (Django, Flutter, Spring, ClickHouse…) and would triple that permanent cost for nothing.

`ecc:github-ops` and `ecc:ai-regression-testing`, referenced in `pm/agents/devops.md` and `pm/agents/test-engineer.md`, **do not exist** in ECC's Pi profile — they were cut upstream as Claude-Code-only. Treat those two references as Claude-Code-only.

> **Conflict rule:** where a vendored ECC skill disagrees with `AGENTS.md`, `context/13-srs.md` or `context/09-adrs.md`, the project wins. The known clash: ECC's React skills teach `useMemo`/`useCallback` discipline; this repo runs **React Compiler**, where manual memoization is banned.

## Maintenance

- Re-vendor a skill: copy it from `ECC/pi/core/skills/<name>/` again. Nothing here is patched.
- The subagent extension has three marked `DIU-ADMISSION LOCAL CHANGE` lines: `agentScope` defaults to `"both"` (upstream `"user"`) so the project roles are visible without the model passing the flag. Upstream's confirmation prompt is untouched. `grep -n "DIU-ADMISSION LOCAL CHANGE" extensions/subagent/index.ts`.
- After editing anything here during a live session, run `/reload`.
