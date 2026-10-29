# Escalations (builder → Opus)

> Builders append questions here when blocked (format in `pm/AGENT_PLAYBOOK.md`). Opus answers them in a planning session
> (`/resolve-escalations`), updates the card or spec, sets `Status: resolved`, and moves the card back to `✅ Ready`.

_No escalations yet._

## E-019 · T-019 · date-fns is imported by in-flight T-014 work; remove anyway?
- Context: uncommitted src/pages/admin/AnalyticsPage.jsx:8 `import { format } from 'date-fns'` (line 55 uses it). Not in HEAD; added by the parallel T-014 agent. jspdf-autotable has no imports.
- Tried: grep only; no dependency change made (removal would break build/lint of T-014 work).
- Options: A) T-014 switches to Intl.DateTimeFormat (e.g. `toLocaleDateString('en-GB',{day:'numeric',month:'short'})`), then T-019 runs unchanged.  B) Keep date-fns, remove only jspdf-autotable + onlyBuiltDependencies. Recommendation: A (matches the card decision).
- Status: open
