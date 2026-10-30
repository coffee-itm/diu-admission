# /resolve-escalations  (Opus only)

1. Read `pm/ESCALATIONS.md`. For each entry with `Status: open`, read the card and the cited code and spec sections.
2. Decide. Product decisions the owner must make → ask the user (one question per decision, with a recommendation).
3. Apply the decision: update the card (steps/acceptance), and if needed the spec in `context/` or a new ADR in `context/09-adrs.md`.
   Split the card if it was too big.
4. Set the escalation to `Status: resolved: <one-line answer>` and the card + board row back to `✅ Ready`.
5. If the same kind of escalation keeps happening, improve the relevant `pm/agents/<role>.md` (that's the ADLC learn step).
Output: one line per escalation.
