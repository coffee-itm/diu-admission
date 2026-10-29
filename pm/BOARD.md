# 📋 Project Board — DIU Admission

> Source of truth for status = the `Status:` line in each card (`pm/tasks/T-xxx-*.md`). Agents update their own row.
> Recount with `/sprint-status`. Process: [PROCESS.md](./PROCESS.md) · Playbook: [AGENT_PLAYBOOK.md](./AGENT_PLAYBOOK.md) · Escalations: [ESCALATIONS.md](./ESCALATIONS.md)

## Current sprint: [S1 — Prototype correct + test harness](./sprints/S1.md)  ·  🔄 Active

### Summary
| ✅ Ready | 🔨 In Progress | 👀 Review | ✔️ Done | ⛔ Blocked | Total | Done % |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 21 | 0 | 1 | 0 | 0 | 22 | 0 % |

### Cards
| ID | Title | Lane | Role | Model | Depends on | Status |
|:--|:--|:-:|:--|:--|:--|:--|
| [T-001](./tasks/T-001-test-harness.md) | Vitest + Testing Library harness | 0 | test-engineer | free-ok | — | ✔️ Done |
| [T-022](./tasks/T-022-lint-baseline.md) | Lint baseline to zero (no behavior change) | 0 | frontend-dev | sonnet | T-001 | ✔️ Done |
| [T-002](./tasks/T-002-fix-answer-key.md) | Fix q_logic_010 key + bank data test | C | frontend-dev | free-ok | T-022 | ✔️ Done |
| [T-003](./tasks/T-003-scoring-thresholds.md) | Configurable thresholds, unrounded compare, boundary tests | C | frontend-dev | sonnet | T-022 | ✔️ Done |
| [T-004](./tasks/T-004-anticheat-counters.md) | Fix stale anti-cheat counters | A | frontend-dev | sonnet | T-022 | ✔️ Done |
| [T-005](./tasks/T-005-submit-latest-state.md) | Submit latest answers, single-shot | A | frontend-dev | sonnet | T-004 | ✔️ Done |
| [T-006](./tasks/T-006-fullscreen-gesture.md) | Fullscreen on Start click, iOS fallback | A | frontend-dev | free-ok | T-004 | ✔️ Done |
| [T-007](./tasks/T-007-persist-anticheat-summary.md) | Persist anti-cheat summary with result | A | frontend-dev | free-ok | T-005 | ✔️ Done |
| [T-008](./tasks/T-008-wallclock-timer.md) | Wall-clock deadline timer | A | frontend-dev | sonnet | T-005 | ✔️ Done |
| [T-009](./tasks/T-009-question-navigation.md) | Visited tracking + cross-section Next/Prev | A | frontend-dev | free-ok | T-008 | ✔️ Done |
| [T-010](./tasks/T-010-engine-uses-config.md) | Engine uses admin config + bank + sampling | A | frontend-dev | sonnet | T-009 | ✔️ Done |
| [T-011](./tasks/T-011-config-driven-copy.md) | Config-driven copy + PDF title | A | frontend-dev | free-ok | T-010 | ✔️ Done |
| [T-012](./tasks/T-012-attempts-resume-logout.md) | Single attempt, Resume, logout reset | A | frontend-dev | sonnet | T-011 | ✔️ Done |
| [T-013](./tasks/T-013-admin-candidate-data.md) | Candidate detail fix + all candidates | B | frontend-dev | free-ok | T-022 | ✔️ Done |
| [T-014](./tasks/T-014-admin-analytics-fixes.md) | Analytics counts, names, labels, real trend | B | frontend-dev | free-ok | T-013 | ✔️ Done |
| [T-015](./tasks/T-015-csv-export.md) | Merit-list CSV export | B | frontend-dev | free-ok | T-014 | ✔️ Done |
| [T-016](./tasks/T-016-csv-import.md) | Question CSV import + error report | B | frontend-dev | sonnet | T-010, T-015, T-017 | ✔️ Done |
| [T-017](./tasks/T-017-forms-login-redirect.md) | Tags field, Zod 4 params, login redirect | C | frontend-dev | free-ok | T-022 | ✔️ Done |
| [T-018](./tasks/T-018-storage-keys-migration.md) | itm-* → diu-* keys + migration | Z | frontend-dev | free-ok | T-007, T-010, T-012, T-016, T-017 | ✔️ Done |
| [T-019](./tasks/T-019-dependency-hygiene.md) | Remove unused deps | C | devops | free-ok | T-014 | ✔️ Done |
| [T-020](./tasks/T-020-docs-sync-s1.md) | Docs sync after S1 | Z | docs-keeper | free-ok | T-002…T-019 | ✔️ Done |
| [T-021](./tasks/T-021-s1-qa.md) | Sprint 1 QA smoke | Z | reviewer | sonnet | T-001…T-020 | ✔️ Done |

Lanes: **0** first (alone) · **A** engine (sequential) · **B** admin (sequential) · **C** small independent cards · **Z** closing (sequential, last).
A, B and C can run in parallel in separate agent sessions; they touch different files.

## Upcoming sprints
| Sprint | Goal | Status |
|:--|:--|:--|
| S2 | Workspace + shared package + Fastify skeleton + CI (P1) | 📋 plan with `/plan-sprint S2` after S1 review |
| S3–S8 | See [sprints/README.md](./sprints/README.md) | 📋 |

## Open escalations
None. See [ESCALATIONS.md](./ESCALATIONS.md).
