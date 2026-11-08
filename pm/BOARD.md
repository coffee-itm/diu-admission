# 📋 Project Board — DIU Admission

> Source of truth for status = the `Status:` line in each card (`pm/tasks/T-xxx-*.md`). Agents update their own row.
> Recount with `/sprint-status`. Process: [PROCESS.md](./PROCESS.md) · Playbook: [AGENT_PLAYBOOK.md](./AGENT_PLAYBOOK.md) · Escalations: [ESCALATIONS.md](./ESCALATIONS.md)

## Current sprint: [S2 — Carry-over + workspace & server skeleton](./sprints/S2.md)  ·  🔄 Active (wave 1 ✔️ done · wave 2 re-routed to the lite/build tiers on 2026-11-08 and ready to run)

### Summary
| ✅ Ready | 🔨 In Progress | 👀 Review | ✔️ Done | ⛔ Blocked | Total | Done % |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 7 | 0 | 0 | 10 | 0 | 17 | 59 % |

### Cards
| ID | Title | Lane | Role | Model | Depends on | Status |
|:--|:--|:-:|:--|:--|:--|:--|
| [T-024](./tasks/T-024-header-logout-privacy.md) | Header logout clears test session (privacy) | A | frontend-dev | sonnet | — | ✔️ Done |
| [T-025](./tasks/T-025-exam-config-validation.md) | Validate exam config inputs | B | frontend-dev | free-ok | — | ✔️ Done |
| [T-026](./tasks/T-026-fullscreen-resume-unload.md) | Fullscreen prompt on resume, no false tab switch | A | frontend-dev | sonnet | T-024 | ✔️ Done |
| [T-027](./tasks/T-027-merit-eligibility-filter.md) | Merit list eligibility filter | B | frontend-dev | free-ok | T-025 | ✔️ Done |
| [T-028](./tasks/T-028-small-ui-fixes.md) | Small UI fixes (ID, auth redirect, tab cue, charts) | C | frontend-dev | free-ok | — | ✔️ Done |
| [T-029](./tasks/T-029-csv-import-hardening.md) | CSV import hardening | B | frontend-dev | sonnet | T-027 | ✔️ Done |
| [T-030](./tasks/T-030-testpage-deps-warning.md) | TestPage exhaustive-deps warning | A | frontend-dev | free-ok | T-026 | ✔️ Done |
| [T-031](./tasks/T-031-missing-interactive-ids.md) | Missing ids on admin elements | W1 | frontend-dev | free-ok | T-025, T-027, T-028, T-029 | ✔️ Done |
| [T-032](./tasks/T-032-pnpm-workspace.md) | pnpm workspace + empty packages | W2 | devops | lite | T-031 | ✔️ Done |
| [T-033](./tasks/T-033-shared-scoring-constants.md) | @diu/shared: scoring, constants, shuffle | W2 | frontend-dev | build | T-032 | ✔️ Done |
| [T-034](./tasks/T-034-shared-risk-schemas.md) | @diu/shared: risk + question schemas | W2 | frontend-dev | lite | T-033 | ✅ Ready |
| [T-035](./tasks/T-035-dev-infra-mongo.md) | Mongo 7 replset, .env.example, /api proxy | W2 | devops | lite | T-032 | ✅ Ready |
| [T-036](./tasks/T-036-fastify-bootstrap.md) | Fastify bootstrap, /health + /ready | W2 | backend-dev | build | T-033, T-035 | ✅ Ready |
| [T-037](./tasks/T-037-server-test-helpers.md) | Server test helpers + health tests | W2 | test-engineer | build | T-036 | ✅ Ready |
| [T-038](./tasks/T-038-github-actions-ci.md) | GitHub Actions CI | W2 | devops | lite | T-037 | ✅ Ready |
| [T-039](./tasks/T-039-docs-sync-s2.md) | Docs sync after S2 | Z | docs-keeper | lite | T-024…T-038 | ✅ Ready |
| [T-040](./tasks/T-040-s2-qa.md) | Sprint 2 QA smoke | Z | reviewer | build | T-039 | ✅ Ready |

Lanes: **A** engine · **B** admin · **C** small · **W1** closes wave 1 (alone) · **W2** server skeleton (see the S2 waves) · **Z** closing.
**Model tier** (policy: [PROCESS.md §2](./PROCESS.md#2-roles-and-model-routing-token-policy) · catalogue: [MODELS.md](./MODELS.md)): `build` → the role agent on **Sonnet 5.5** (Anthropic) · `lite` → `builder-lite` on **GPT-6 Luna** (OpenAI Codex). Reviews are cross-family: `reviewer` on **Haiku 5.5** for lite cards, `reviewer-pro` on **GPT-5.6 Terra** for build cards and any auth/session/scoring/answer-key/anti-cheat diff. Planning stays on Opus 5.5 and never builds. The OpenCode free lane is retired.

## Upcoming sprints
| Sprint | Goal | Status |
|:--|:--|:--|
| S3–S8 | See [sprints/README.md](./sprints/README.md) | 📋 |

## Open escalations
None. See [ESCALATIONS.md](./ESCALATIONS.md).
