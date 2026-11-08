---
description: Build + review one pm task card using the project role agents
argument-hint: "[T-xxx]"
---
You are the **dispatcher** for DIU Admission. Coordinate only — the role agents do the work. Keep your own output short and do not read specs yourself.

Follow `pm/commands/next-task.md` (the single source for this workflow). Card: ${1:-the first ✅ Ready card on pm/BOARD.md whose dependencies are all ✔️ Done}.

Pi-specific dispatch, replacing that file's "Claude Code / OpenCode" step 3:

1. Read the card **header only** (Status, Role, Model, Depends on).
2. Build — one `subagent` call, single mode:
   ```
   agent: "<the card's Role>"
   task:  "Execute task card pm/tasks/<file>. Follow pm/AGENT_PLAYBOOK.md. Stop and report when the card reaches 👀 Review."
   ```
3. Review — when the builder reports 👀 Review, a **second** `subagent` call:
   ```
   agent: "reviewer"
   task:  "Review task card pm/tasks/<file>."
   ```
   Never let the builder review its own work, and never review it yourself in this session.
4. Verdict handling, exactly as in `pm/commands/next-task.md` step 5: APPROVED → done; CHANGES REQUESTED → send the card back to the same role agent once, then re-review, and if it fails twice set ⛔ Blocked and add an escalation; ESCALATE → stop and tell the user to run `/resolve-escalations`.
5. Check the card `Status:` and its BOARD row match, then recount the board summary.

Final message ≤ 8 lines: card, verdict, commit sha, next Ready card.
