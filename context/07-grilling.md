# 07 — Grilling Pass (relentless interview on the plan)

> Method: interrogate every load-bearing assumption in the docs + prototype, one question at a time,
> answer it from the evidence, and record the verdict. Anything that survives stays; anything that
> cracks becomes an action item.

---

## Round 1 — Purpose & Authority

**Q1: Who actually decides admission — the score or the committee? The docs never commit.**
PRD Open Question #2 says "advisory vs weighted" is unresolved. Yet the entire product emits a
binary-ish verdict (Eligible / Conditional / Not Eligible). If results are only advisory, the app
is a reporting tool; if weighted, it is a gate with legal/fairness exposure.
→ **Verdict: UNRESOLVED.** This is the single most important open question. Until answered, the
word "Eligible" is overclaiming. Recommend renaming to "Recommendation: Eligible" in UI copy.

**Q2: Is the test mandatory for all applicants?**
PRD Open Question #1. If optional, self-selection biases the analytics (only confident candidates
take it), making cohort profiling worthless — which kills Objective #3 of the proposal.
→ **Verdict: UNRESOLVED.** Must be mandatory for the analytics value proposition to hold.

**Q3: Can non-science students sit the test?**
Brochure requires science background + GPA ≥ 2.5. PRD Open Question #3 leaves it open. The
registration form collects GPA but the prototype never enforces the 2.5 minimum or the science
constraint.
→ **Verdict: GAP.** Either enforce brochure eligibility at registration (cheap win) or document
that the test is open-access. Currently it's neither.

---

## Round 2 — The Assessment Itself

**Q4: Is 50 questions enough to say anything reliable about a candidate?**
10 questions per section × 1 mark. A ±1 question swing moves a section score by 10 percentage
points — exactly the width of the pass band (40%). With n=10 per section, the classification near
the boundary is a coin flip. Psychometrically this is weak; the docs never mention reliability,
item analysis, or pilot validation.
→ **Verdict: DESIGN WEAKNESS, accepted as prototype trade-off.** Mitigation: grow the bank to 500+
(proposal already targets this) and sample per session so no question repeats across candidates.
Flag in every stakeholder deck: scores are screening signals, not precise measurements.

**Q5: Why is MATH given 12 minutes but IT only 10? Is there evidence?**
Section times (12/12/10/10/10) appear in mockExamConfig with zero justification anywhere in the
docs. Same for the 50/40 threshold pair — they are asserted, never derived.
→ **Verdict: UNJUSTIFIED CONSTANTS.** Move to `examConfig` (already done) and run a pilot with
timing telemetry (per-question time is already tracked!) to recalibrate before first live use.

**Q6: Free section navigation + single global timer vs per-section limits — which is it?**
mockExamConfig carries per-section `timeMinutes` but the engine only enforces a global 54-min
clock. The per-section fields are dead config. Candidates can spend 40 min on MATH and starve
BUSINESS. Is that intended?
→ **Verdict: INCONSISTENCY.** Either implement per-section enforcement (PRD Phase-3) or delete
`timeMinutes` from section config to avoid false signals. Pick one.

**Q7: The classification has a dead zone.**
Rules: ELIGIBLE needs overall ≥50 AND all sections ≥40. CONDITIONALLY_ELIGIBLE needs overall ≥40
AND 1–2 failed sections. NOT_ELIGIBLE: overall <40 OR ≥3 failed sections.
Check: overall ≥50 but ≥3 failed sections → NOT_ELIGIBLE (fine). Overall 40–49 with 0 failed
sections → neither ELIGIBLE nor CONDITIONALLY → falls to NOT_ELIGIBLE by exclusion. A candidate
who scores 49% overall with NO failed section is "Not Eligible". Is that intended?
→ **Verdict: BOUNDARY CASE, probably unintended.** Needs an explicit branch or doc note. Add to
scoring.js test suite (which doesn't exist yet — see Q13).

---

## Round 3 — Integrity & Trust

**Q8: All anti-cheat is client-side. What does it actually prevent?**
Tab detection, fullscreen, key blocking — all bypassable in minutes (private window, extension,
screen photo). The honest framing: it deters casual cheating and creates an audit trail. The
proposal's claim of "academic integrity through anti-cheating" overstates it. Real integrity
comes from: per-session randomization, single attempt, time pressure, and (future) server-side
anomaly detection on the event log.
→ **Verdict: REFRAimed, not broken.** Docs should say "deterrence + audit", not "prevention".

**Q9: With only 50 questions in the bank and per-session sampling of all 50, every candidate sees
every question. Where is the leak protection?**
If all 50 are served to everyone, the bank leaks after one admission cycle (WhatsApp groups will
have it in hours). The mitigation is not tech — it's bank size ≫ served count.
→ **Verdict: CRITICAL OPERATIONAL RISK.** Question bank growth (500+) and per-session sampling
(e.g., random 10 per section from a larger pool) are not "nice to have" — they are prerequisites
for a second admission cycle. Currently the engine serves the full 10/section with no pool.

**Q10: Single attempt is enforced by localStorage. A candidate clears storage and retakes.**
`maxAttempts: 1` is honored only in client state. Prototype-acceptable; must be server-enforced
with identity (OTP-verified account) in production.
→ **Verdict: KNOWN, acceptable for prototype, blocking for production.**

---

## Round 4 — Candidate Experience

**Q11: The primary persona is on a 3G Android phone. Does a 50-question, 54-minute, fullscreen,
Framer-Motion, Recharts-bundled SPA survive that?**
Fullscreen API on mobile browsers is inconsistent (iOS Safari has no true fullscreen).
Framer Motion + Recharts add bundle weight. No bundle analysis or perf budget exists.
→ **Verdict: RISK.** Add a perf budget (<300KB gz initial for candidate path), lazy-load admin
charts, and test fullscreen fallback on iOS. The anti-cheat fullscreen requirement may need to be
relaxed on mobile (it contradicts the mobile-first mandate).

**Q12: Bilingual (EN/BN) is a PRD Must-Have and the persona explicitly needs Bangla. It doesn't
exist at all — not even the i18n skeleton AGENTS.md promised.**
→ **Verdict: MUST-HAVE VIOLATION.** Either descope it in the PRD (get sign-off) or build the
JSON-key structure now before 200+ hardcoded strings calcify. Cost of retrofit grows weekly.

---

## Round 5 — Engineering & Production Readiness

**Q13: Zero automated tests. The scoring algorithm — the legal heart of an admission decision —
has no test suite.**
→ **Verdict: BLOCKING before production.** At minimum: unit tests for scoring.js boundary cases
(Q7), eligibility rules, and randomized-session invariants. This is a capstone project; tests are
also the grading evidence.

**Q14: Services are "API-swappable" — is that true, or aspirational?**
The service layer is the seam, but there is no `api.js` (it's in the AGENTS.md tree and missing),
no request/response contracts, no error-handling conventions, no async signatures audit. "Swap to
REST" is currently a claim, not a demonstrated property.
→ **Verdict: ASPIRATIONAL.** Define the contract now (even as a mock fetch adapter) so backend
Phase 1 doesn't force UI rewrites.

**Q15: Data model for the backend is sketched as "Users, Questions, Exams, Sessions, Results".
Where is the attempt/session entity that ties a candidate to one randomized question set?**
The prototype stores `questionOrder` and `optionOrder` in the client session. Scoring on the
server later will need the exact paper served (which shuffled options), or correctAnswer mapping
breaks.
→ **Verdict: MISSING ENTITY.** The domain model below introduces `TestSession` as first-class,
persisting the served paper snapshot.

**Q16: What happens mid-test on connectivity loss — the PRD's #1 risk?**
Auto-save to localStorage recovers same-device state. But if the phone dies or the candidate
switches devices, there's no server state to recover (no backend). PRD promises "session recovery
on reconnection" — only same-browser recovery exists.
→ **Verdict: PARTIALLY MET.** Acceptable for prototype; production recovery requires server-side
session snapshots on every auto-save.

---

## Round 6 — Stakeholders & Ops

**Q17: The reviewer persona (Kamal, read-only committee member) has no role in the system.**
RBAC is binary (admin/candidate). Kamal gets full admin or nothing.
→ **Verdict: GAP vs PRD.** Add a `reviewer` role (read-only admin subset) — cheap with the
existing ProtectedRoute design.

**Q18: Who owns the question bank content? 50 questions exist; 500+ are needed. Is there a
faculty workflow for authoring, review, and retiring questions?**
No review/approval state on questions (schema has `status` in the table column spec but the
Zod schema has no lifecycle states: draft → reviewed → active → retired).
→ **Verdict: MISSING LIFECYCLE.** Add question lifecycle states before faculty start authoring,
or the bank becomes an unmoderated pile.

**Q19: Where does this run? PRD Open Question #5. The prototype assumes nothing; production
needs a decision (DIU on-prem vs VPS) because it shapes OTP provider, SSL, and data-residency
answers for BD ICT Act compliance.**
→ **Verdict: UNRESOLVED, deadline = start of backend Phase 1.**

**Q20: Success metric "+15% retention improvement" — how is it measured when the system has no
post-enrollment feedback loop?**
The app never sees what happens to candidates after admission. The KPI is unmeasurable as designed.
→ **Verdict: KPI FLAW.** Either add an annual cohort-follow-up export (join with registrar data,
manual) or restate the KPI as process metrics (completion rate, admin time) that the app can
actually observe.

---

## Verdict Summary

| Area | Survives grill? |
|:---|:---|
| Test engine UX (nav, timer, autosave, submit flow) | ✅ solid |
| Scoring rules | ⚠️ boundary bug (Q7) + reliability caveat (Q4) |
| Anti-cheat | ⚠️ honest reframing needed (Q8); fine as deterrence+audit |
| Architecture seam (services layer) | ⚠️ aspirational; needs contracts (Q14) |
| Question bank ops | ❌ leak risk (Q9), no lifecycle (Q18) |
| Candidate reach (mobile + Bangla) | ❌ i18n missing (Q12), perf/fullscreen risk (Q11) |
| Trust & authority of results | ❌ advisory-vs-gate unresolved (Q1) |
| Production readiness | ❌ no tests (Q13), client-authoritative state (Q10, Q16) |

## Top 10 Action Items (priority order)

1. Resolve Q1+Q2 with the Dept. Head: advisory vs gate, mandatory vs optional. (Blocks everything.)
2. Add scoring.js unit tests incl. the Q7 dead-zone case.
3. Decide per-section timers: implement or delete the dead config (Q6).
4. Plan question-bank growth + per-session sampling before any second-cycle use (Q9).
5. Build i18n skeleton now or formally descope (Q12).
6. Define service contracts (`api.js`) to make the backend swap real (Q14).
7. Introduce TestSession server entity with served-paper snapshot (Q15, Q16).
8. Add question lifecycle states (draft/reviewed/active/retired) (Q18).
9. Add `reviewer` read-only role (Q17).
10. Perf budget + iOS fullscreen fallback for the mobile-first promise (Q11).

---

## Resolution status (2026-10-29)

How each question is now handled in the spec set. "Assumed" means a default was chosen so work can proceed; it still needs stakeholder confirmation ([06 §3](./06-open-issues-doc-gaps.md#3-open-product-questions)).

| Q | Topic | Status | Where |
|:--|:--|:--|:--|
| Q1 | Advisory vs gate | Assumed: advisory ("Recommendation:") | 12 §9, FR-SCORE-07 |
| Q2 | Mandatory test | Assumed: mandatory | 06 Q2 |
| Q3 | Science/GPA eligibility | Assumed: collect, don't block | FR-AUTH-01, 06 Q8 |
| Q4 | Reliability of 50 items | Accepted risk. Bank growth + item stats | FR-ANL-05, 06 Q10 |
| Q5 | Unjustified constants | Configurable per cycle/program; calibrate after the pilot | FR-CFG-01/02 |
| Q6 | Per-section timers | Resolved: informational unless `enforceSectionTime` (Could) | FR-CFG-05, ADR-004 |
| Q7 | Scoring dead zone | **Resolved: not a code bug.** `scoring.js` already treats 0 failed + ≥40 % as Conditional; only the written rule was wrong. Thresholds made configurable, boundary tests added | FR-SCORE-04, 18 §3.1, D-09 |
| Q8 | Anti-cheat claims | Resolved: "deterrence + audit"; server-side counting + review | FR-AC-*, ADR-005 |
| Q9 | Bank leak | Resolved: pool sampling + publish check + bank growth | FR-TEST-02, 06 Q10 |
| Q10 | Single attempt in localStorage | Resolved: unique index on the server | 14 §3.5, FR-TEST-01 |
| Q11 | Mobile perf / iOS fullscreen | Resolved: perf budget + fullscreen fallback | NFR-01, FR-AC-04 |
| Q12 | i18n missing | Scheduled (Must): P7 | FR-I18N-*, ADR-017 |
| Q13 | No tests | Scheduled first: P0-01 | 18, ADR-018 |
| Q14 | Services seam aspirational | Resolved: full API contract + `api.js` design | 15, 17 §4 |
| Q15 | TestSession entity | Resolved | 14 §3.5, ADR-015 |
| Q16 | Cross-device recovery | Resolved: server sessions + offline queue | FR-TEST-06/07 |
| Q17 | Reviewer role | Resolved: `reviewer` scoped to programs | FR-AUTH-10, 05 |
| Q18 | Question lifecycle | Resolved: draft → reviewed → active → retired | FR-QB-02 |
| Q19 | Hosting | Assumed: Atlas Mumbai for the pilot; on-prem supported | 20 §2, 06 Q6 |
| Q20 | Unmeasurable KPI | Resolved: KPIs restated as observable; retention measured outside the app | 12 §7 |