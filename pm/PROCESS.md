# Engineering Process — DIU Admission

> How this project is run: methodology, roles, model routing, workflow, quality gates.
> Board: [BOARD.md](./BOARD.md) · Builder loop: [AGENT_PLAYBOOK.md](./AGENT_PLAYBOOK.md) · Specs: [../context/README.md](../context/README.md)

---

## 1. Methodology: Agile Scrum-lite + Kanban, inside an SDLC frame

One human (the project owner) works with many AI agents. Full Scrum ceremonies would be overhead, so we keep only the parts that pay off.

| Practice | How we apply it |
|:--|:--|
| **Sprints** | 1 sprint = 1 roadmap phase (or half of a large one), about 1 week. One sprint goal. |
| **Backlog** | The roadmap in [context/19](../context/19-implementation-roadmap.md) is the product backlog. Each sprint's items are refined into **task cards** (`pm/tasks/T-xxx.md`) **just in time**, only for the next sprint (saves planning tokens, avoids stale detail). |
| **Kanban flow** | Cards move `Backlog → Ready → In Progress → Review → Done` (or `Blocked`) on [BOARD.md](./BOARD.md). WIP limit: **one card per agent session**, at most **3 cards In Progress** in total. |
| **Definition of Ready / Done** | §5 below. A card that isn't Ready may not be started; a card isn't Done until review passes. |
| **Review** | Every card is reviewed by the `reviewer` agent against its acceptance criteria before Done. |
| **Sprint review + retro** | At sprint end, Opus reviews the sprint report, records lessons in the sprint file, improves agent prompts if agents kept failing in the same way, and plans the next sprint. |

### SDLC phases → where they live

| SDLC phase | Artifact | Status |
|:--|:--|:--|
| 1. Planning / feasibility | [context/01](../context/01-project-overview.md), [context/12 PRD](../context/12-prd.md) | ✅ |
| 2. Requirements analysis | [context/13 SRS](../context/13-srs.md), [context/06 defects + open questions](../context/06-open-issues-doc-gaps.md) | ✅ |
| 3. Design | [context/09 ADRs](../context/09-adrs.md), [14 DB](../context/14-database-schema.md), [15 API](../context/15-api-spec.md), [16 backend](../context/16-backend-architecture.md), [17 frontend](../context/17-frontend-spec.md) | ✅ |
| 4. Implementation | Sprints S1…S8 (task cards) | 🔄 |
| 5. Testing | Per card (unit/integration) + sprint QA card + [context/18](../context/18-testing-strategy.md) | 🔄 |
| 6. Deployment | Sprint for P8, [context/20](../context/20-deployment-ops.md) | ⏳ |
| 7. Maintenance | Defect cards (`D-xx` → `T-xxx`), retros | ⏳ |

### ADLC: agent development lifecycle (per card)

```
SPEC (Opus writes card) → BUILD (builder agent) → VERIFY (agent runs tests/lint/build)
   → REVIEW (reviewer agent) → INTEGRATE (commit, board → Done) → LEARN (retro: fix prompts/cards)
         ▲                                                         │
         └──────────── fails twice / ambiguous → ESCALATE to Opus ◄─┘
```

## 2. Roles and model routing (token policy)

**Rule: Opus thinks, cheaper models type.** Opus never implements a card. Builders never change requirements or architecture.

| Role | Who | Model | Does | Never does |
|:--|:--|:--|:--|:--|
| Product owner | You (human) | — | Priorities, answers open questions, approves sprint goals, merges | — |
| **Planner / architect** | Claude Code main session | **Opus** | Sprint planning, writing task cards, ADRs, resolving escalations, sprint review/retro, hard debugging after 2 failed builder attempts | Writing feature code |
| `frontend-dev` | Claude Code subagent / OpenCode agent | Sonnet / free | React pages, hooks, stores, UI | Change specs/contracts |
| `backend-dev` | Claude Code subagent / OpenCode agent | Sonnet / free | Fastify modules, Mongoose models, jobs, seed | Change specs/contracts |
| `test-engineer` | Claude Code subagent / OpenCode agent | Sonnet / free | Test harness, unit/integration/E2E tests | Change behavior to make tests pass |
| `reviewer` | Claude Code subagent / OpenCode agent | Sonnet (preferred) / free | Reviews a finished card against acceptance criteria and the specs; read-only | Edit code |
| `devops` | Claude Code subagent / OpenCode agent | Sonnet / free | CI, Docker, workspace, deploy configs | Feature code |
| `docs-keeper` | Claude Code subagent / OpenCode agent | Haiku / free | Updates board, defect register, roadmap ticks, README/AGENTS after a sprint | Code |

Role instructions (single source for both tools): [`pm/agents/*.md`](./agents/).
Claude Code wiring: `.claude/agents/*.md` (pinned to `model: sonnet`/`haiku`) and `.claude/commands/*.md`.
OpenCode wiring: [`opencode.json`](../opencode.json) (agents inherit your default model, currently the free `opencode/deepseek-v4.1-flash-free`).
Zen `*-free` models work only inside the OpenCode app. Claude Code via claude-code-router gets `FreeUsageLimitError` (verified 2026-10-30).

### Build routing (from S2)
The Opus session coordinates. Builders run headless, and you leave any interactive OpenCode pane idle during builds so two agents never edit the same tree.
1. **Build.** `free-ok` cards: `opencode run -m opencode/deepseek-v4.1-flash-free --agent <role> "Execute task card pm/tasks/T-xxx-….md following pm/AGENT_PLAYBOOK.md"`. `sonnet` cards: the matching Claude Code subagent.
2. **Verify.** The coordinator runs `pnpm test`, `pnpm lint` (no new warnings) and `pnpm build`, and checks that the diff stays inside the card's Files list.
3. **Review.** The Claude `reviewer` (Sonnet) reviews every card. The free model never reviews.
4. **Retry.** On rejection, resume the same OpenCode session once with the findings. After a second rejection, Sonnet takes the card, and the sprint file records it.
5. **Fallback.** If the Zen free limit is hit, the remaining `free-ok` cards go to Sonnet.

### Which tier per card
Each card says `Model: free-ok` or `Model: sonnet`.
- **free-ok**: mechanical, well-specified, little hidden coupling (data fixes, copy changes, simple utilities, docs).
- **sonnet**: subtle state/closure/timing logic, security-relevant code, cross-file refactors, test design.
- **opus**: never for building. Only planning, escalations and reviews of escalations.

### Token-saving rules (apply to every agent)
1. **One card per session.** Start a fresh session for each card; don't carry history.
2. **Read only what the card lists** (its "Context to read" section) plus the files you edit. No repo-wide exploration. Use `grep`/`rg` for lookups.
3. Specs are long. Read **the cited section**, not the whole document.
4. Report in ≤ 15 lines (template in the playbook). No restating the card.
5. If stuck after **2 verification failures**, stop and escalate (§6). Don't loop.

## 3. Work item types and IDs

| Type | ID | Example | Source |
|:--|:--|:--|:--|
| Requirement | `FR-*`, `NFR-*` | FR-SCORE-04 | context/13 |
| Defect | `D-xx` | D-02 | context/06 |
| Roadmap item | `P<phase>-<nn>` | P0-04 | context/19 |
| **Task card** | `T-xxx` (global, never reused) | T-004 | pm/tasks |
| Sprint | `S<n>` | S1 | pm/sprints |
| Decision | `ADR-xxx` | ADR-015 | context/09 |
| Escalation | `E-xxx` | E-001 | pm/ESCALATIONS.md |

## 4. Git workflow

- One branch per sprint: `sprint/S1-prototype-fixes`, branched from `prototype`.
- **One commit per card**, Conventional Commits with the card ID:
  `fix(anti-cheat): read fresh counters in handlers [T-004]`
- The reviewer reviews `git show <commit>` for that card.
- At sprint end the owner merges the sprint branch into `prototype` (PR optional).
- Never commit secrets, `.env`, or `node_modules`. Never force-push.

## 5. Definition of Ready / Definition of Done

**Ready** (checked by Opus when writing the card):
- [ ] Single, clear outcome; small enough for one session (≈ ≤ 300 changed lines)
- [ ] Role and model tier set; dependencies listed (a Ready card is only *picked* once its dependencies are Done)
- [ ] Exact files to touch and context sections to read are listed
- [ ] Acceptance criteria are testable, and verification commands are given
- [ ] Out-of-scope stated

**Done** (checked by the builder, then the reviewer):
- [ ] Every acceptance criterion met
- [ ] Tests added/updated, including a regression test for any `D-xx` fixed
- [ ] `pnpm lint`, `pnpm test` and `pnpm build` pass (once the harness exists, T-001)
- [ ] Unique `id`s on new interactive elements. No manual `useMemo`/`useCallback`/`React.memo`
- [ ] Card log + board row updated. One commit with the card ID
- [ ] Reviewer verdict `APPROVED`

## 6. Escalation protocol (builder → Opus)

A builder **must stop** and set the card to `⛔ Blocked` when:
- the card is ambiguous or contradicts a spec in `context/`,
- the fix needs a change to an API contract, schema, ADR or requirement,
- verification failed twice after honest attempts,
- the change grows well beyond the card's file list.

How: append an entry to [ESCALATIONS.md](./ESCALATIONS.md) (question, what was tried, options), mark the card and board row Blocked, end the session.
Opus resolves escalations at the next planning session (`/plan-sprint` or `/resolve-escalations`) by updating the card or the specs.

## 7. Ceremonies (lightweight)

| When | Who / model | Command | Output |
|:--|:--|:--|:--|
| Sprint start | Opus | `/plan-sprint S<n>` | `pm/sprints/S<n>.md`, cards `T-xxx`, board updated |
| Daily / any time | Sonnet or free | `/next-task` (Claude Code) or `/next-task` (OpenCode) | One card built and reviewed |
| Any time | Haiku or free | `/sprint-status` | Short status from the board |
| When cards are Blocked | Opus | `/resolve-escalations` | Escalations answered, cards back to Ready |
| Sprint end | Opus | `/sprint-review S<n>` | Review + retro in the sprint file, defect register/roadmap updated, next sprint proposal |
