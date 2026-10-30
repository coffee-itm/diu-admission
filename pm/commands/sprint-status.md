# /sprint-status

1. Run: `grep -H '^Status:' pm/tasks/T-*.md` (the card files are the source of truth).
2. If any BOARD.md row disagrees with its card, fix the row. Recompute the "Summary" table counts (Ready / In Progress / Review / Done / Blocked / total, % done).
3. Print (≤ 10 lines): sprint goal, the counts, cards In Progress / Review / Blocked with IDs, and the next Ready card.
Don't read any other files.
