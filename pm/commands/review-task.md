# /review-task T-xxx

Pick the reviewer tier from the diff (`git show --stat` for the card's commit), not from the card's build tier:

| Diff touches | Agent | Model |
|:--|:--|:--|
| auth, tokens, sessions, scoring/eligibility, answer keys, anti-cheat, persisted-state migration, or any `build`-tier card | `reviewer-pro` | `openai-codex/gpt-5.6-terra` |
| everything else (`lite` cards) | `reviewer` | `anthropic/claude-haiku-5-5` |

Never review with the family that built the card.

Delegate to it (Claude Code: Agent tool `subagent_type: "<agent>"`; Pi: `subagent` tool with `agent: "<agent>"`; OpenCode: `@reviewer`) with:
`Review task card pm/tasks/<file for T-xxx>.`

If subagents aren't available, read `pm/agents/reviewer.md` and do the review yourself. Read-only except `pm/`.
Never run `pnpm` inside a copy of the repo whose `node_modules` is symlinked to the main tree.
Print the verdict (≤ 8 lines).
