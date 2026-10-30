# /sprint-review S<n>  (Opus only)

1. Gather: `/sprint-status` data, `git log --oneline prototype..HEAD`, the Agent log + Review section of each card (skim), open escalations.
2. Verify the sprint goal end to end: run `pnpm lint && pnpm test && pnpm build`, plus the sprint's QA card results.
3. Write the **Review** section in `pm/sprints/S<n>.md`: shipped cards, goal met (yes/partial/no), defects found, metrics
   (cards done/planned, cards that needed Sonnet, review rejections, escalations).
4. Write the **Retro**: what went wrong for agents (unclear cards, missing context, repeated mistakes) → concrete changes to
   `pm/agents/*.md`, the playbook or the card template. Apply them.
5. Sync docs (or create a `docs-keeper` card): defects fixed in `context/06`, roadmap ticks in `context/19`, README/AGENTS claims.
6. Move unfinished cards to the next sprint (carry-over). Mark the sprint `✔️ Done` in `pm/sprints/README.md`.
7. Propose the next sprint goal and tell the user to merge the sprint branch, then run `/plan-sprint S<n+1>`.
