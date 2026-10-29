# 04 — Test Engine & Anti-Cheat

> Current behavior verified against the code on 2026-10-29. Target behavior: FR-TEST-* and FR-AC-* in [13](./13-srs.md),
> server design in [16 §6](./16-backend-architecture.md#6-test-session-engine-on-the-server-adr-015), UI in [17 §5](./17-frontend-spec.md#5-test-page-specification).

---

## Current engine (prototype)

Files: `src/features/test/{useTestEngine,useTimer,useAutoSave,useAntiCheat}.js`, `QuestionCard`, `QuestionNav`,
`SectionHeader`, `SecurityWarningModal`, `TestSubmitDialog`. Page: `src/pages/candidate/TestPage.jsx`.

### Flow as built

```
Dashboard ─► Instructions (integrity checkbox → resetAntiCheat + setIntegrityAgreed)
  └─ Start → useTestEngine.startTest → testService.loadTest (500 ms mock)
       → shuffles questions within each section (SECTION_ORDER) + option order; uses the WHOLE mock bank
       → testStore.initSession → navigate /candidate/test
TestPage: no session → dashboard; already submitted → result
  ├─ useTimer: setInterval 1 s → tickTimer() decrements persisted timeRemaining; 0 → submit
  ├─ answer / clear / flag; section tabs; Next/Prev only inside the current section
  ├─ useAntiCheat listeners (see matrix)
  └─ submit (dialog) → finalizeTracking → testService.submitTest (calculateScore, append to itm-results)
       → result + antiCheat summary saved to testStore ONLY → /candidate/result
```

### Behavior vs spec

| Behavior | Status | Notes |
|:--|:--|:--|
| Global timer, auto-submit at 0 | ⚠️ | Works while the tab is open. **Pauses when closed** (tick-based, D-06) |
| Timer pulse < 5 min, mono font | ✅ | `TIMER_WARNING_THRESHOLD = 300` |
| Free section navigation | ✅ | Tabs; Next/Prev don't cross sections (D-07) |
| Question grid statuses | ⚠️ | `not_visited / answered / skipped / flagged`. The first question is never marked visited (D-07) |
| Autosave every 5 s | ⚠️ | Saving actually comes from zustand `persist` on each change. `useAutoSave` is a no-op diff (D-23) |
| Recovery after reload | ⚠️ | Same browser only. Time resumes from the saved value (D-06). No Resume button (D-13) |
| Randomization | ✅ | Fisher–Yates (`src/lib/utils.js:13-20`) for questions within a section and for options. Section order fixed |
| Question sampling (`questionCount`) | ❌ | Ignored; the whole bank is served (D-24) |
| Single attempt | ❌ | Not enforced (D-12) |
| Submit confirmation | ✅ | Answered/unanswered/flagged counts |

## Anti-cheat matrix (current)

Guide: [`ANTI_CHEAT_IMPLEMENTATION.md`](../ANTI_CHEAT_IMPLEMENTATION.md). Code: `useAntiCheat.js`, `antiCheatStore.js`,
`SecurityWarningModal.jsx`, and `ANTI_CHEAT` in `src/lib/constants.js:95-111`.

| # | Feature | Status | Detail |
|:--|:--|:--|:--|
| 1 | Tab-switch detection | ⚠️ **broken thresholds** | Detects and logs, but the stale count means the warning (2) and auto-submit (5) never fire (D-02) |
| 2 | Fullscreen enforcement | ⚠️ | Requested from an effect, not a gesture (D-04). Exit detected; auto-submit at 3 never fires (D-02) |
| 3 | Copy / paste / cut blocking | ✅ | Paste logged but not counted; cut neither logged nor counted |
| 4 | Right-click blocking | ✅ | Logged + counted |
| 5 | Keyboard shortcut blocking | ✅ | Ctrl+C/V/A/P/U/S, Ctrl+Shift+I/J/C, F12, PrintScreen |
| 6 | Text-selection lock | ✅ | CSS `user-select: none` on body |
| 7 | DevTools heuristic | ✅ | outer−inner size > 160 px, polled every 3 s. Excluded from `totalViolations` |
| 8 | Integrity declaration | ✅ | Checkbox on Instructions, timestamp stored |
| 9 | Per-question time tracking | ✅ | `questionTimeMap` (ms), never displayed |
| 10 | Admin security review | ❌ | `CandidateDetailPage` has a security section + risk badge (≥10 High, ≥4 Medium), but the page never loads (D-16) and the data is never saved (D-05) |
| — | Auto-submit on violation | ❌ | Would submit empty answers even if it fired (D-03) |

**Threat model:** everything is client-side and stored in localStorage, so a determined candidate can bypass it
(private window, extension, editing storage, a second device). It is **deterrence + audit, not prevention** (ADR-005).

## Target design (R2)

| Concern | Target |
|:--|:--|
| Session authority | `testSessions` document on the server ([14 §3.5](./14-database-schema.md#35-testsessions-the-core-document)) |
| Served paper | The server samples `questionCount` active questions per section, shuffles questions and options, and stores a snapshot. The client never receives keys |
| Timer | `deadline = startedAt + totalTime` on the server. The client shows `deadline − (now + clockOffset)`. Closing the tab doesn't stop time |
| Autosave | `PATCH /sessions/:id/state` every 5 s when dirty, with `seq` idempotency, an offline queue and a `pagehide` flush |
| Resume | Any device: `GET /sessions/current` restores answers, flags, position and time |
| Expiry | Lazy plus a 60 s sweep job. Expired sessions are scored with their last saved answers |
| Anti-cheat events | Batched with autosave. The server counts violations, computes the risk (`@diu/shared/risk`), and force-submits when the cycle policy thresholds are crossed |
| Risk level | W = 2·tab + 2·fullscreenExit + 3·devtools + 1·(copy+paste+cut) + 0.5·(rightClick+blockedKey). Low < 4 ≤ Medium < 10 ≤ High. Plus a `fastAnswers` flag (FR-AC-06) |
| Review | `/admin/security` list + decision (cleared/suspicious/disqualified) with an audit log (FR-AC-07) |
| Mobile | No Fullscreen API (iOS) → skip the requirement and log `fullscreen_unsupported`. Answer keys 1–4/A–D are not blocked |

### Session state machine

```
            POST /sessions                      submit (manual)
 (none) ───────────────────► ACTIVE ───────────────────────────► SUBMITTED
                               │  deadline + grace passed (lazy or job)
                               ├───────────────────────────────► EXPIRED
                               │  server violation threshold crossed
                               └───────────────────────────────► FORCE_SUBMITTED
 All terminal states create exactly one Result (unique sessionId).
```
