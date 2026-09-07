# Context Directory — ITM Admission Skill Test Prototype

Consolidated knowledge base, produced by a full read of every source file plus all parent
documents (SRS, PRD, Project Proposals v1/v2, ITM Brochure), followed by two passes of the
`grill-with-docs` skill (grilling + domain-modeling).

## Index

| File | What it is |
|:---|:---|
| [01-project-overview.md](./01-project-overview.md) | Identity, problem, personas, KPIs, status, demo credentials |
| [02-tech-architecture.md](./02-tech-architecture.md) | Stack, directory layout, data flow, stores, design tokens, doc-vs-code gaps |
| [03-domain-assessment-scoring.md](./03-domain-assessment-scoring.md) | Exam config, question schema, scoring algorithm, eligibility rules, mock data |
| [04-test-engine-anticheat.md](./04-test-engine-anticheat.md) | Session lifecycle, engine behaviors, 10-feature anti-cheat status matrix |
| [05-roles-features-routes.md](./05-roles-features-routes.md) | RBAC, route table, per-module feature inventory, MoSCoW vs prototype |
| [06-open-issues-doc-gaps.md](./06-open-issues-doc-gaps.md) | Missing files, spec conflicts, PRD open questions, production risks |
| [07-grilling.md](./07-grilling.md) | **Grilling pass** — 20 hard questions with verdicts + top-10 action items |
| [08-domain-model.md](./08-domain-model.md) | **Domain-modeling pass** — entities, invariants, state machines, bounded contexts |
| [09-adrs.md](./09-adrs.md) | 12 Architecture Decision Records (Accepted / Proposed / Contested) |
| [10-glossary.md](./10-glossary.md) | Ubiquitous language + abbreviations |
| [11-pivot-diu-admission.md](./11-pivot-diu-admission.md) | **Pivot record** — ITM-only → DIU Admission (university-wide); supersedes conflicting ITM framing in 01–10 |

## Headline Findings (TL;DR)

0. **PIVOT:** Project renamed **DIU Admission**, scope expanded from ITM-only to all DIU departments — see [11-pivot-diu-admission.md](./11-pivot-diu-admission.md).
1. **Unresolved authority question** — is the result advisory or an admission gate? Blocks everything.
2. **Scoring dead zone** — 40–49% overall with zero failed sections falls to NOT_ELIGIBLE by exclusion; needs tests + explicit branch.
3. **Question-bank leak risk** — all 50 questions served to every candidate; bank must grow ≫ served count before a second cycle.
4. **Bilingual (EN/BN) is a PRD Must-Have that doesn't exist** — descope formally or build the i18n skeleton now.
5. **No automated tests** — the scoring algorithm (legal heart of the system) is untested.
6. **Per-section `timeMinutes` is dead config** — global 54-min timer is the only enforcement.
7. **Services seam is aspirational** — `api.js` and contracts missing; define them before backend Phase 1.
8. **TestSession must become a first-class server entity** — persist the served paper snapshot or server-side scoring breaks.