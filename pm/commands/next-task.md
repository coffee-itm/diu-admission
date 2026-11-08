# /next-task [T-xxx]: build + review one card

You are the **dispatcher**. You coordinate; the role agents do the work. Keep your own output short.

1. **Pick the card**
   - If an ID was given, use `pm/tasks/T-xxx-*.md`.
   - Otherwise open `pm/BOARD.md` and take the **first** row with `✅ Ready` whose "Depends on" cards are all `✔️ Done`. Respect the lane order in the current sprint file (`pm/sprints/S<n>.md`).
   - Nothing pickable → print the board summary and the reason (blocked/waiting) and stop.
2. **Read the card header only** (Status, Role, Model, Depends on). Don't read the specs yourself.
3. **Pick the agent from the card's `Model:` tier** (routing table: `pm/PROCESS.md` §2.4). Never pick by role alone.

   | Card tier | Agent to dispatch | Runs on |
   |:--|:--|:--|
   | `build` (legacy `sonnet`) | the agent named in `Role:` | `anthropic/claude-sonnet-5-5` |
   | `lite` (legacy `free-ok`) | **`builder-lite`** (reads the card's `Role:` file itself) | `openai-codex/gpt-6-luna` — 20× cheaper, no 100K cliff |

   Prompt in every case: `Execute task card pm/tasks/<file>. Follow pm/AGENT_PLAYBOOK.md.`
   - Claude Code: Agent tool, `subagent_type: "<agent>"`.
   - Pi: `subagent` tool, single mode, `agent: "<agent>"` (agents live in `.pi/agents/`, each with a pinned model).
   - OpenCode: `@<role>`.
   - No subagent support: read `pm/agents/<role>.md` and do it yourself, following the playbook.
   - If `builder-lite` reports `WRONG TIER`, re-dispatch the card to the Sonnet role agent and change the card's `Model:` line to `build`.
4. When the builder reports `👀 Review`, **delegate the review to the other family** (PROCESS §2.4): a `lite` card → `reviewer` (Haiku 5.5, Anthropic); a `build` card, or any diff touching auth, tokens, sessions, scoring, answer keys, anti-cheat or persisted-state migration → **`reviewer-pro`** (GPT-5.6 Terra, OpenAI). Prompt: `Review task card pm/tasks/<file>.`
5. **Handle the verdict**
   - APPROVED → done. Print a 3-line summary.
   - CHANGES REQUESTED → send the card back to the **same** builder agent once (`Address the Review section of pm/tasks/<file>`), then review again. If it fails a second time, promote the card one tier (`lite` → `build`; `build` → stop for Opus), set `⛔ Blocked`, add an escalation, and stop.
   - ESCALATE / Blocked → stop and tell the user to run `/resolve-escalations` (Opus).
6. Make sure the card's `Status:` and its BOARD row match. Then recount the board's summary numbers (see `/sprint-status`).

Final message (≤ 8 lines): card, verdict, commit, the next Ready card.
