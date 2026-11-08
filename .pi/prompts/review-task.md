---
description: Review one pm task card with a fresh-context reviewer agent
argument-hint: "<T-xxx>"
---
Review card $1 for DIU Admission. Follow `pm/commands/review-task.md`.

Make exactly one `subagent` call and do not review the card yourself:
```
agent: "reviewer"
task:  "Review task card pm/tasks/<file for $1>."
```
Resolve `<file for $1>` with `ls pm/tasks/` first. Print only the reviewer's verdict block (≤ 8 lines).
