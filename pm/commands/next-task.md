# /next-task [T-xxx]: build + review one card

You are the **dispatcher**. You coordinate; the role agents do the work. Keep your own output short.

1. **Pick the card**
   - If an ID was given, use `pm/tasks/T-xxx-*.md`.
   - Otherwise open `pm/BOARD.md` and take the **first** row with `✅ Ready` whose "Depends on" cards are all `✔️ Done`. Respect the lane order in the current sprint file (`pm/sprints/S<n>.md`).
   - Nothing pickable → print the board summary and the reason (blocked/waiting) and stop.
2. **Read the card header only** (Status, Role, Model, Depends on). Don't read the specs yourself.
3. **Delegate the build** to the agent named in `Role:`:
   - Claude Code: Agent tool, `subagent_type: "<role>"`, prompt: `Execute task card pm/tasks/<file>. Follow pm/AGENT_PLAYBOOK.md.`
   - OpenCode: invoke the `@<role>` subagent with the same prompt.
   - No subagent support: read `pm/agents/<role>.md` and do it yourself, following the playbook.
   - If the card says `Model: sonnet` and you are on a weaker free model in OpenCode, tell the user and suggest running this card from Claude Code (`/next-task T-xxx`), unless they asked you to proceed.
4. When the builder reports `👀 Review`, **delegate the review** to `reviewer` with: `Review task card pm/tasks/<file>.`
5. **Handle the verdict**
   - APPROVED → done. Print a 3-line summary.
   - CHANGES REQUESTED → send the card back to the same role agent once (`Address the Review section of pm/tasks/<file>`), then review again. If it fails a second time, set `⛔ Blocked`, add an escalation, and stop.
   - ESCALATE / Blocked → stop and tell the user to run `/resolve-escalations` (Opus).
6. Make sure the card's `Status:` and its BOARD row match. Then recount the board's summary numbers (see `/sprint-status`).

Final message (≤ 8 lines): card, verdict, commit, the next Ready card.
