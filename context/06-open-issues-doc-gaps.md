# 06 — Open Issues, Doc-vs-Code Gaps & Risks

## Verified Doc-vs-Code Gaps

Files listed in `AGENTS.md` tree but **missing from the codebase**:
- `src/services/api.js` (base API client)
- `src/services/questionService.js`
- `src/lib/csvExport.js` (merit-list CSV export)
- `src/hooks/` — entire directory (useLocalStorage, useMediaQuery, useDebounce)
- `src/components/ui/LanguageToggle.jsx`
- `src/features/scoring/useScoring.js`
- `public/fonts/` contents / i18n JSON structure

## Spec Conflicts

| Topic | AGENTS.md | PRD | Code reality |
|:---|:---|:---|:---|
| Auto-save interval | 5 s | 30 s | 5 s |
| Anti-cheat scope | 10 features | tab-switch = Phase 3 | 7 layers implemented |
| Section time limits | per-section times in config | Phase-3 "could have" | single global 54-min timer only |
| Bilingual | "prepare i18n structure" | Must-Have | absent |

## PRD Open Questions (still unresolved)

1. Is the skill test mandatory or optional for all ITM applicants?
2. Do results carry admission weight or are they advisory only?
3. Are non-science-background candidates allowed? (Brochure requires science background.)
4. Initial question bank size the department can commit to? (Proposal targets 500+; mock has 50.)
5. DIU IT hosting vs external cloud?
6. Year-round availability vs admission windows only?

## Prototype → Production Risks

| Risk | Detail | Mitigation direction |
|:---|:---|:---|
| Client-authoritative state | Answers, timer, score live in localStorage; tamperable | Backend session authority, server-side scoring |
| Client-side anti-cheat | Deters only casual cheating; no proctoring | Accept per PRD; add server-side anomaly detection on event logs |
| Question bank size | 50 questions → same questions recycle across candidates | Grow to 500+, rotation policy, per-session sampling |
| No OTP/verification | Identity unverified; impersonation possible | Email/SMS OTP (SendGrid/BulkSMSBD) |
| Peak load | Admission-window concurrency | Load testing, CDN, horizontal scaling |
| Connectivity | Rural 3G candidates | Lightweight bundle, auto-save, recovery (partially done) |
| Data privacy | BD ICT Act compliance; PII (name, phone, GPA) | Encryption, RBAC, audit logs |
| localStorage limits | ~5 MB per origin; enough for prototype | Migrate to server persistence |

## Known Prototype Limitations

- Mock auth: anyone can log in with seeded credentials; registration creates localStorage users only.
- Analytics computed from 10 mock results — trends are illustrative.
- MeritListPage exports PDF only; CSV export referenced but unimplemented.
- No tests (no test runner configured), no CI.
- No dark-mode toggle (tokens exist, `dark:` variants not wired into a switch).
- No i18n layer — all copy hardcoded English.