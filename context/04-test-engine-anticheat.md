# 04 — Test Engine & Anti-Cheat (Consolidated)

## Test Engine (`src/features/test/`)

Core files: `useTestEngine.js` (orchestration), `useTimer.js`, `useAutoSave.js`,
`useAntiCheat.js`, plus `QuestionCard`, `QuestionNav`, `SectionHeader`,
`SecurityWarningModal`, `TestSubmitDialog`. Page shell: `src/pages/candidate/TestPage.jsx`.

### Session Lifecycle

```
INSTRUCTIONS ──(consent checkbox + Start)──▶ ACTIVE (fullscreen requested, timer starts)
   │
   ├── navigate sections freely (SectionHeader tabs)
   ├── answer / change / clear (radio MCQ, one at a time)
   ├── flag for review
   ├── auto-save every 5 s (useAutoSave → testStore → localStorage)
   │
   ├── EXPIRY: timer hits 0 ──────────▶ auto-submit
   ├── ANTI-CHEAT threshold exceeded ──▶ auto-submit (forced)
   └── SUBMIT (confirm dialog) ────────▶ SUBMITTED → scoring → ResultPage
```

### Behaviors Implemented

- **Timer:** single global countdown = `examConfig.totalTimeMinutes` (54 min). Mono font,
  pulses when < 5 min. Auto-submit on expiry.
- **Section navigation:** free movement across all 5 sections; per-section question count
  shown in SectionHeader.
- **Question display:** one question at a time; radio options.
- **QuestionNav grid:** status colors — not visited, answered, visited-unanswered, flagged.
- **Auto-save:** 5-second interval persists answers + progress to localStorage via testStore.
- **Randomization:** question order shuffled per session; option order shuffled per question.
- **Submit confirmation:** TestSubmitDialog shows answered/unanswered/flagged counts before submit.
- **Per-question time tracking** (anti-cheat audit data).

## Anti-Cheat System

Guide: `ANTI_CHEAT_IMPLEMENTATION.md` (specifies 10 features). README claims 7 layers live.
Implementation: `useAntiCheat.js` + `antiCheatStore.js` + `SecurityWarningModal.jsx`.

| # | Feature | Status in prototype | Mechanism |
|:---|:---|:---|:---|
| 1 | Tab-switch detection | ✅ | `visibilitychange`; warn at 2, auto-submit at 5 |
| 2 | Fullscreen enforcement | ✅ | request fullscreen on start; detect exit, prompt re-entry |
| 3 | Copy/paste/cut blocking | ✅ | preventDefault on clipboard events |
| 4 | Right-click prevention | ✅ | contextmenu blocked + logged |
| 5 | Keyboard shortcut blocking | ✅ | Ctrl+C/V/A/P/S/U, F12, devtools shortcuts suppressed |
| 6 | DevTools detection | ✅ | window resize heuristic polled every 3 s |
| 7 | Security event audit trail | ✅ | antiCheatStore logs timestamped events; per-question time |
| 8 | Integrity declaration | ✅ | checkbox consent on InstructionsPage before start |
| 9 | Single-attempt enforcement | ✅ (mock) | session lock in testStore/localStorage |
| 10 | Admin security review panel | ⚠️ partial | events logged; no dedicated admin review UI page |

### Threat Model Notes

All anti-cheat runs **client-side** — it deters casual cheating but cannot stop a
determined actor (no server-side session authority, no proctoring). The PRD explicitly
excludes AI proctoring/video monitoring. Randomization + time pressure + single attempt
are the structural controls; the rest is detection/audit.

## Auto-Save & Recovery

- Interval: 5 s (AGENTS.md + code). PRD specifies 30 s — code wins for prototype.
- Payload: answers map, current question/section, flags, elapsed time, status.
- Recovery: on reload mid-test, testStore rehydrates from localStorage and resumes.
- Prototype gap: recovery trusts client clock for remaining time; backend must own the
  authoritative deadline in production.