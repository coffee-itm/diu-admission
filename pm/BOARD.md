# 📋 Project Board — DIU Admission

> Source of truth for status = the `Status:` line in each card (`pm/tasks/T-xxx-*.md`). Agents update their own row.
> Recount with `/sprint-status`. Process: [PROCESS.md](./PROCESS.md) · Playbook: [AGENT_PLAYBOOK.md](./AGENT_PLAYBOOK.md) · Escalations: [ESCALATIONS.md](./ESCALATIONS.md)

## Current sprint: [S2 — Carry-over + workspace & server skeleton](./sprints/S2.md)  ·  🔄 Active (wave 1)

### Summary
| ✅ Ready | 🔨 In Progress | 👀 Review | ✔️ Done | ⛔ Blocked | Total | Done % |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 12 | 2 | 0 | 3 | 0 | 17 | 18 % |

### Cards
| ID | Title | Lane | Role | Model | Depends on | Status |
|:--|:--|:-:|:--|:--|:--|:--|
| [T-024](./tasks/T-024-header-logout-privacy.md) | Header logout clears test session (privacy) | A | frontend-dev | sonnet | — | ✔️ Done |
| [T-025](./tasks/T-025-exam-config-validation.md) | Validate exam config inputs | B | frontend-dev | free-ok | — | ✔️ Done |
| [T-026](./tasks/T-026-fullscreen-resume-unload.md) | Fullscreen prompt on resume, no false tab switch | A | frontend-dev | sonnet | T-024 | 🔨 In Progress |
| [T-027](./tasks/T-027-merit-eligibility-filter.md) | Merit list eligibility filter | B | frontend-dev | free-ok | T-025 | 🔨 In Progress |
| [T-028](./tasks/T-028-small-ui-fixes.md) | Small UI fixes (ID, auth redirect, tab cue, charts) | C | frontend-dev | free-ok | — | ✔️ Done |
| [T-029](./tasks/T-029-csv-import-hardening.md) | CSV import hardening | B | frontend-dev | sonnet | T-027 | ✅ Ready |
| [T-030](./tasks/T-030-testpage-deps-warning.md) | TestPage exhaustive-deps warning | A | frontend-dev | free-ok | T-026 | ✅ Ready |
| [T-031](./tasks/T-031-missing-interactive-ids.md) | Missing ids on admin elements | W1 | frontend-dev | free-ok | T-025, T-027, T-028, T-029 | ✅ Ready |
| [T-032](./tasks/T-032-pnpm-workspace.md) | pnpm workspace + empty packages | W2 | devops | free-ok | T-031 | ✅ Ready |
| [T-033](./tasks/T-033-shared-scoring-constants.md) | @diu/shared: scoring, constants, shuffle | W2 | frontend-dev | sonnet | T-032 | ✅ Ready |
| [T-034](./tasks/T-034-shared-risk-schemas.md) | @diu/shared: risk + question schemas | W2 | frontend-dev | free-ok | T-033 | ✅ Ready |
| [T-035](./tasks/T-035-dev-infra-mongo.md) | Mongo 7 replset, .env.example, /api proxy | W2 | devops | free-ok | T-032 | ✅ Ready |
| [T-036](./tasks/T-036-fastify-bootstrap.md) | Fastify bootstrap, /health + /ready | W2 | backend-dev | sonnet | T-033, T-035 | ✅ Ready |
| [T-037](./tasks/T-037-server-test-helpers.md) | Server test helpers + health tests | W2 | test-engineer | free-ok | T-036 | ✅ Ready |
| [T-038](./tasks/T-038-github-actions-ci.md) | GitHub Actions CI | W2 | devops | free-ok | T-037 | ✅ Ready |
| [T-039](./tasks/T-039-docs-sync-s2.md) | Docs sync after S2 | Z | docs-keeper | free-ok | T-024…T-038 | ✅ Ready |
| [T-040](./tasks/T-040-s2-qa.md) | Sprint 2 QA smoke | Z | reviewer | sonnet | T-039 | ✅ Ready |

Lanes: **A** engine · **B** admin · **C** small · **W1** closes wave 1 (alone) · **W2** server skeleton (see the S2 waves) · **Z** closing.
free-ok cards are built by OpenCode `deepseek-v4.1-flash-free`, sonnet cards by Claude subagents. Every card is reviewed by Claude Haiku (PROCESS.md §2 "Build routing").
S1 (23 cards, ✔️ Done, merged `600c2e7`): see [sprints/S1.md](./sprints/S1.md).

## Upcoming sprints
| Sprint | Goal | Status |
|:--|:--|:--|
| S3–S8 | See [sprints/README.md](./sprints/README.md) | 📋 |

## Open escalations
None. See [ESCALATIONS.md](./ESCALATIONS.md).
