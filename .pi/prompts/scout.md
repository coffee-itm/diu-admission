---
description: Map an area of the codebase in a child context before planning
argument-hint: "<area or question>"
---
Before we plan anything, map the ground. One `subagent` call:

```
agent: "scout"
task:  "Question: $@. Report: (1) the relevant files with one line each on what they own, (2) entry points and data flow, (3) which context/ spec sections and requirement IDs govern this area, (4) existing tests covering it, (5) risks, surprises and open defects from context/06-open-issues-doc-gaps.md. Cite file:line throughout. Do not propose a solution."
```

Then give me a ≤ 15-line digest plus the specific questions you still need answered before a card can be written. Do not start implementing.
