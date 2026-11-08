# 📋 Project Board — DIU Admission

> Source of truth for status = the `Status:` line in each card (`pm/tasks/T-xxx-*.md`). Agents update their own row.
> Recount with `/sprint-status`. Process: [PROCESS.md](./PROCESS.md) · Playbook: [AGENT_PLAYBOOK.md](./AGENT_PLAYBOOK.md) · Escalations: [ESCALATIONS.md](./ESCALATIONS.md)

## Current sprint: [S3 — Auth & users](./sprints/S3.md)  ·  ✅ Ready to start (branch `sprint/S3-auth`)

### Summary
| ✅ Ready | 🔨 In Progress | 👀 Review | ✔️ Done | ⛔ Blocked | Total | Done % |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 13 | 0 | 0 | 1 | 0 | 14 | 7 % |

### Cards
| ID | Title | Lane | Role | Model | Depends on | Status |
|:--|:--|:-:|:--|:--|:--|:--|
| [T-044](./tasks/T-044-user-program-models-seed.md) | `programs` + `users` models, indexes, seed | S | backend-dev | lite | — | ✔️ Done |
| [T-045](./tasks/T-045-auth-core-tokens.md) | Auth core: argon2id, JWT, refresh rotation + reuse detection | S | backend-dev | build | T-044 | 👀 Review |
| [T-046](./tasks/T-046-auth-routes.md) | Auth routes: register/login/refresh/logout/me | S | backend-dev | build | T-045 | ✅ Ready |
| [T-047](./tasks/T-047-rbac-helpers.md) | RBAC helpers + matrix test | S | backend-dev | build | T-046 | ✅ Ready |
| [T-048](./tasks/T-048-admin-users-endpoints.md) | Admin user management + audit log | S | backend-dev | build | T-047 | ✅ Ready |
| [T-049](./tasks/T-049-frontend-api-client.md) | services/api.js, react-query, VITE_USE_MOCKS split | F | frontend-dev | build | T-046 | ✅ Ready |
| [T-050](./tasks/T-050-frontend-auth-on-api.md) | authService on the API, authStore rework | F | frontend-dev | build | T-049 | ✅ Ready |
| [T-041](./tasks/T-041-analytics-recharts-warning.md) | Analytics Recharts width(-1) warning | C | frontend-dev | lite | — | ✅ Ready |
| [T-042](./tasks/T-042-exam-config-input-guard.md) | Exam config numeric inputs cannot be cleared | C | frontend-dev | lite | — | ✅ Ready |
| [T-043](./tasks/T-043-admin-nav-ids.md) | ids on admin header/sidebar links | C | frontend-dev | lite | — | ✅ Ready |
| [T-051](./tasks/T-051-test-coverage.md) | Make --coverage real | C | test-engineer | lite | — | ✅ Ready |
| [T-052](./tasks/T-052-ci-hardening.md) | CI hardening: pin runner, bump actions | C | devops | lite | — | ✅ Ready |
| [T-053](./tasks/T-053-docs-sync-s3.md) | Docs sync after S3 | Z | docs-keeper | lite | T-041…T-052 | ✅ Ready |
| [T-054](./tasks/T-054-s3-qa.md) | Sprint 3 QA smoke | Z | reviewer | build | T-053 | ✅ Ready |

Lanes: **S** server (strictly sequential) · **F** frontend (after T-046) · **C** carry-over (independent) · **Z** closing.
**Model tier** (policy: [PROCESS.md §2](./PROCESS.md#2-roles-and-model-routing-token-policy) · catalogue: [MODELS.md](./MODELS.md)): `build` → the role agent on **Sonnet 5.5** · `lite` → `builder-lite`. Reviews are cross-family by default: `reviewer` (Haiku 5.5) for lite cards, `reviewer-pro` for build cards and any auth/session/scoring/answer-key diff.
⚠️ **Codex quota exhausted** — the MODELS.md §3 failover is active, so `builder-lite`, `scout`, `docs-keeper` and `reviewer-pro` are temporarily on Anthropic and **cross-family review is suspended**. Revert the pins when it resets.

### Completed sprints
| Sprint | Phase | Cards | Merged |
|:--|:--|:-:|:--|
| [S1](./sprints/S1.md) | P0 | 22 | `600c2e7` |
| [S2](./sprints/S2.md) | P1 | 17 | `87d1858` (PR #1, CI green) |

## Upcoming sprints
| Sprint | Goal | Status |
|:--|:--|:--|
| S3–S8 | See [sprints/README.md](./sprints/README.md) | 📋 |

## Open escalations
None. See [ESCALATIONS.md](./ESCALATIONS.md).
