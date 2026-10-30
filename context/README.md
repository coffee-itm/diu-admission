# DIU Admission — Project Context (start here)

> **For coding agents:** read this file first, then follow [19-implementation-roadmap.md](./19-implementation-roadmap.md)
> task by task. Repo-wide coding rules are in [../AGENTS.md](../AGENTS.md).
> Last full re-verification against the code: **2026-10-29**, commit `37dfd1d`.

DIU Admission is the university-wide online aptitude assessment for Daffodil International University.
Today it is a **frontend-only React prototype** (mock data + localStorage). The target is a production system:
**React SPA + Fastify + Mongoose + MongoDB**.

## Source-of-truth order

When documents disagree, the higher one wins:

1. **[13-srs.md](./13-srs.md)**: required behavior (FR/NFR IDs)
2. **[09-adrs.md](./09-adrs.md)**: architecture decisions (a newer ADR wins over older text anywhere)
3. **[14](./14-database-schema.md) / [15](./15-api-spec.md) / [16](./16-backend-architecture.md) / [17](./17-frontend-spec.md)**: technical specs
4. **[12-prd.md](./12-prd.md)**: product intent and scope
5. Everything else (analysis and history)

Facts about the **current code** are in [02](./02-tech-architecture.md), [03](./03-domain-assessment-scoring.md),
[04](./04-test-engine-anticheat.md), [05](./05-roles-features-routes.md) and [06](./06-open-issues-doc-gaps.md). Every claim cites `file:line`.
If the code changed since the verification date, trust the code, then fix the doc.

## Reading order by task

| You are about to… | Read |
|:--|:--|
| Fix a prototype bug (P0) | 06 → 04/05 → 13 (the FR the defect maps to) → 18 §3 |
| Build the backend (P1–P6) | 09 → 16 → 14 → 15 → 13 → 18 |
| Change frontend pages | 17 → 15 §6 → 13 → AGENTS.md |
| Touch scoring | 03 → 13 FR-SCORE → 18 §3.1 |
| Deploy / run an exam window | 20 |

## Index

| # | File | What it is | Kind |
|:--|:--|:--|:--|
| 01 | [01-project-overview.md](./01-project-overview.md) | Identity, problem, personas, status, roadmap summary, demo credentials | Overview |
| 02 | [02-tech-architecture.md](./02-tech-architecture.md) | **Current** stack/stores/keys/data flow + **target** architecture diagram | Current + target |
| 03 | [03-domain-assessment-scoring.md](./03-domain-assessment-scoring.md) | Exam config, question schema, current vs target scoring, mock data | Current + target |
| 04 | [04-test-engine-anticheat.md](./04-test-engine-anticheat.md) | Test engine and anti-cheat as built (with bugs) + target design | Current + target |
| 05 | [05-roles-features-routes.md](./05-roles-features-routes.md) | Roles, route table with status, access matrix | Current + target |
| 06 | [06-open-issues-doc-gaps.md](./06-open-issues-doc-gaps.md) | **Defect register D-01…D-29**, doc gaps, open questions with assumed defaults, risks | Current |
| 07 | [07-grilling.md](./07-grilling.md) | 20 hard questions about the plan + resolution status | Analysis |
| 08 | [08-domain-model.md](./08-domain-model.md) | Entities, invariants, state machines, bounded contexts | Model |
| 09 | [09-adrs.md](./09-adrs.md) | Architecture Decision Records ADR-001…019 | Decisions |
| 10 | [10-glossary.md](./10-glossary.md) | Shared terms + abbreviations | Reference |
| 11 | [11-pivot-diu-admission.md](./11-pivot-diu-admission.md) | ITM-only → university-wide pivot record | History |
| 12 | [12-prd.md](./12-prd.md) | **Product Requirements Document** | Spec |
| 13 | [13-srs.md](./13-srs.md) | **Software Requirements Specification** (FR/NFR) | Spec |
| 14 | [14-database-schema.md](./14-database-schema.md) | **MongoDB/Mongoose schema**, indexes, aggregations, seeding | Spec |
| 15 | [15-api-spec.md](./15-api-spec.md) | **REST API contract** `/api/v1` + service→endpoint map | Spec |
| 16 | [16-backend-architecture.md](./16-backend-architecture.md) | **Fastify server** layout, plugins, auth, session engine, rules | Spec |
| 17 | [17-frontend-spec.md](./17-frontend-spec.md) | **Frontend target**: pages, state, data layer, test UI, i18n, dark mode | Spec |
| 18 | [18-testing-strategy.md](./18-testing-strategy.md) | Test tooling, mandatory suites, boundary table, CI, Definition of Done | Spec |
| 19 | [19-implementation-roadmap.md](./19-implementation-roadmap.md) | **Agent task list** P0…P8 with done-checks + traceability | Plan |
| 20 | [20-deployment-ops.md](./20-deployment-ops.md) | Environments, hosting options, security checklist, backups, exam-day runbook | Ops |

## Headline facts (TL;DR)

1. **Database: MongoDB** (not Firestore, not PostgreSQL). See ADR-013. The exam must be server-authoritative (deadline,
   hidden answer keys, scoring), so a backend is needed anyway. MongoDB aggregations fit merit lists and analytics, and it can run
   on Atlas Mumbai or on DIU's own servers.
2. **Backend: Fastify 5 + Mongoose 8** in `server/`, with shared scoring/schemas in `packages/shared` (ADR-014, ADR-019).
3. **The prototype has 29 verified defects**, 7 of them P0. Examples: anti-cheat thresholds never fire, the timer pauses when the tab
   closes, admin config is never applied, candidate detail never loads, and one answer key is wrong. Fix them first (P0).
4. **No dead zone in the scoring code.** 40–49 % with no failed section is already Conditionally Eligible. The old *written* rule was wrong.
5. **Bilingual EN/BN and dark mode** are Must-haves that don't exist yet (P7).
6. **No tests exist.** The scoring boundary table and the answer-key secrecy suite are mandatory (18).
7. Open product questions have **assumed defaults** (06 §3). Build against them and flag any change.

## Conventions for updating these docs

- Keep IDs stable (FR-*, NFR-*, D-*, ADR-*, P*-**). Add new ones; never renumber.
- When code behavior or an API contract changes, update the relevant doc **in the same PR**.
- Mark target-only content as **Target**. Cite `file:line` for claims about the current code.
