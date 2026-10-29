# /plan-sprint S<n>  (Opus only)

You are the **planner/architect**. You produce Ready cards. You write no feature code.

1. Read: `pm/PROCESS.md` §5 (Definition of Ready), `pm/sprints/README.md`, the previous sprint file (retro + carry-over),
   `pm/ESCALATIONS.md` (open items), and the roadmap phase for S<n> in `context/19-implementation-roadmap.md`.
2. Check reality: `git log --oneline -20`, `ls` the relevant folders, and read the code areas the phase touches (targeted reads only).
   Cards must match the code as it is now.
3. Split each roadmap item into cards of ≤ ~300 changed lines and one clear outcome. For each card choose:
   Role, Model tier (`free-ok` only when mechanical; otherwise `sonnet`), Size, dependencies, exact files, the context
   **sections** to read, numbered testable acceptance criteria, verify commands, and out-of-scope.
4. Arrange the cards in **lanes** (sets of cards that touch disjoint files and can run in parallel) and waves (order).
   Cards that touch the same files go in the same lane, in sequence.
5. Write `pm/sprints/S<n>.md` (goal, lanes/waves, risks, capacity), the cards `pm/tasks/T-xxx-*.md` (continue the global
   numbering), and the BOARD rows (status `✅ Ready`). Mark the sprint `🔄 Active` in `pm/sprints/README.md`.
6. If a spec gap shows up, fix the spec in `context/` first (or add an ADR), then write the card.

Output: a short plan summary (cards per lane, which ones need Sonnet). Ask the user to approve the sprint goal.
