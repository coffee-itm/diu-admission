# Agent Playbook — how a builder agent executes one card

> For every builder role (frontend-dev, backend-dev, test-engineer, devops, docs-keeper).
> Your role file is `pm/agents/<role>.md`. The process rules are in `pm/PROCESS.md` (you don't need to read it).

## The loop (one card, one session)

1. **Claim**
   - Open your card `pm/tasks/T-xxx.md`. Check that `Status: ✅ Ready` and every dependency card is `✔️ Done`. If not, stop and report.
   - Set `Status: 🔨 In Progress` in the card and in its row in `pm/BOARD.md` (change only that row).
   - **Board edits:** re-read `pm/BOARD.md` right before editing; change your row with an exact-text Edit (never `sed`, never rewrite the whole file, never touch the Summary counts). Don't stage `BOARD.md`: the coordinator commits the board.
2. **Branch**
   - `git switch sprint/S<n>-…` (create it from `prototype` if it doesn't exist: `git switch -c sprint/S1-prototype-fixes prototype`).
   - Run `git status`; the working tree must be clean except `pm/` edits.
3. **Read**
   - Only the card's "Context to read" items and the files listed under "Files". Use `grep -n` to jump to lines.
4. **Test first when the card has tests**
   - Write the failing test(s) from the acceptance criteria. Run them and see them fail for the right reason.
5. **Implement** the smallest change that satisfies the acceptance criteria. Follow your role rules.
6. **Verify** with the commands in the card, then the full gate:
   ```bash
   pnpm lint && pnpm test && pnpm build      # pnpm test exists after T-001
   ```
   If it fails, fix and retry. **After 2 failed attempts at the same problem, escalate** (below).
   - **No new lint warnings.** Warnings already on the baseline are allowed; a new one fails the gate.
   - When a criterion says "no X remains" (no hard-coded copy, no import, no key), prove it with a repo-wide `grep -rn` over `src/`, not only over the card's file list, and fix every hit in scope.
   - A criterion that needs a real browser (fullscreen, downloads, reload): mark it `⚠️ not verified (no browser)` in the log. Never mark it ✅ from reading the code. The sprint QA card verifies it.
7. **Log**: fill the card's "Agent log" section (≤ 10 lines): what changed, files, test results, anything surprising.
8. **Commit** exactly one commit:
   ```bash
   git add <each file you changed, by path> pm/tasks/T-xxx-*.md && git commit -m "<type>(<scope>): <summary> [T-xxx]"
   ```
   **Never `git commit --amend`**; review fixes are new commits with the same `[T-xxx]` tag.
   **Never `git add -A` / `git add .`**: other agents may be working in parallel in the same tree. Stage only your own files (plus `pnpm-lock.yaml` if you changed dependencies). If `git commit` fails because of a lock, wait 5 s and retry.
   type ∈ feat | fix | test | refactor | docs | chore | ci.
9. **Hand off**: set `Status: 👀 Review` in the card and the board row. End with the report below.

## Report format (your final message, ≤ 15 lines)
```
T-xxx <title> → 👀 Review
Commit: <sha> <message>
Changed: <file> (+a/−b), …
Verify: lint ✅ test ✅ (N passed) build ✅
Acceptance: 1 ✅ 2 ✅ 3 ✅ …
Notes: <surprises, follow-ups for Opus, or "none">
```

## Escalation (stop instead of guessing)
Stop when the card is ambiguous, contradicts `context/`, needs a contract/schema/ADR change, grows far beyond its file list, or verification fails twice.
1. Append to `pm/ESCALATIONS.md`:
   ```
   ## E-xxx · T-xxx · <one-line question>
   - Context: <what you found, file:line>
   - Tried: <attempts and results>
   - Options: A) … B) …   Recommendation: <A/B, why>
   - Status: open
   ```
2. Set the card and board row to `⛔ Blocked (E-xxx)`. Commit only `pm/` changes (`chore(pm): escalate T-xxx [E-xxx]`), or leave the code changes uncommitted and say so.
3. Report and end the session.

## Status legend
`📋 Backlog` · `✅ Ready` · `🔨 In Progress` · `👀 Review` · `✔️ Done` · `⛔ Blocked`
