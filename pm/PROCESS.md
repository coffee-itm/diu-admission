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

**Rule: Opus plans, Sonnet builds hard things, GPT-6 Luna does everything mechanical, and no model reviews its own family.**
Opus never implements a card. Builders never change requirements or architecture.

**The verified model list, prices, blocked models, failover pins and the savings analysis live in
[MODELS.md](./MODELS.md).** This section is the policy; MODELS.md is the data.

### 2.1 The tiers

| Tier | Model | Thinking | Used by |
|:--|:--|:--|:--|
| **plan** | `anthropic/claude-opus-5-5` | high | your main session (planning, cards, ADRs, escalations, review/retro, hard debugging) |
| **build** | `anthropic/claude-sonnet-5-5` | high | `frontend-dev` `backend-dev` `test-engineer` `devops` |
| **lite** | `openai-codex/gpt-6-luna` | medium | `builder-lite`, `scout` (`low` for `docs-keeper`) |
| **review** | `anthropic/claude-haiku-5-5` (lite cards) · `openai-codex/gpt-5.6-terra` (build cards) | high | `reviewer` · `reviewer-pro` |

Two providers only, both already authenticated in Pi: **Anthropic** and **OpenAI Codex (Sign in with ChatGPT)**.
The OpenCode DeepSeek free lane is **retired** — it ran out mid-sprint, could not be driven from Pi or Claude Code, and was
never allowed to review.

Why this split (full reasoning in MODELS.md §2):
- `gpt-6-luna` matches Haiku 5.5 at $0.10 / $0.50 but **has no 5× price cliff above 100K input tokens**, and builder sessions
  cross 100K easily. So the cheap tier is OpenAI.
- Only Anthropic models declare `promptCache`, so only they benefit from Pi's cache warming. **Long-lived sessions belong on
  Anthropic (cache pays); one-shot subagents belong on OpenAI (cache cannot pay).**
- Reasoning tokens bill as output at 5–12× input, so the **thinking level** pinned per agent is as important as the model.

### 2.2 Role → agent → model

| Role | Agent dispatched | Model | Does | Never does |
|:--|:--|:--|:--|:--|
| Product owner (you) | — | — | Priorities, open questions, sprint goals, merges | — |
| Planner / architect | main session | Opus 5.5 | Planning, cards, ADRs, escalations, retro | Writing feature code |
| `frontend-dev` | `frontend-dev` | Sonnet 5.5 | React pages, hooks, stores, UI | Change specs/contracts |
| `backend-dev` | `backend-dev` | Sonnet 5.5 | Fastify modules, Mongoose models, jobs, seed | Change specs/contracts |
| `test-engineer` | `test-engineer` | Sonnet 5.5 | Test harness, unit/integration/E2E tests | Change behavior to pass tests |
| `devops` | `devops` | Sonnet 5.5 | CI, Docker, workspace, deploy configs | Feature code |
| any role, `lite` card | **`builder-lite`** | GPT-6 Luna | Reads the card's `Role:` line and obeys that role file | Judgement calls — it hands back |
| review (lite card) | `reviewer` | Haiku 5.5 | Acceptance-criteria review, read-only on source | Edit code |
| review (build card) | **`reviewer-pro`** | GPT-5.6 Terra | Invariant-attacking review of auth/session/scoring/key/anti-cheat diffs | Edit code |
| `docs-keeper` | `docs-keeper` | GPT-6 Luna (low) | Board, defect register, roadmap ticks, README/AGENTS | Code |
| recon | `scout` | GPT-6 Luna | Read-only recon before planning | Edit, propose fixes |

Role instructions (single source): [`pm/agents/*.md`](./agents/). A card's `Role:` names the rules; its `Model:` tier names the
**agent process**. Harness support and the inherit-Opus trap: MODELS.md §5. **Run sprints from Pi** — it is the only harness
that can reach both providers.

### 2.3 Which tier per card

Every card carries `Model: lite | build` (legacy cards may say `free-ok` = `lite`, `sonnet` = `build`) plus a one-line
`Tier rationale:`. The planner picks with this test — **if any answer is yes, it is `build`:**

1. Does it touch closures, timers, async ordering or persisted-state migration?
2. Is it security-relevant (auth, tokens, answer keys, session authority, anti-cheat)?
3. Does it move or rename code across more than ~3 files, or change import sites repo-wide?
4. Does the card design new tests rather than follow a given list?
5. Is the failure mode *silent* (wrong number, leaked field) rather than loud (build/lint/test breaks)?

Otherwise it is `lite`. Rule of thumb: **loud failures are safe on the cheap tier; silent failures need Sonnet.**

### 2.4 Dispatch (the coordinator does this)

| Card says | Dispatch to | Model it runs on |
|:--|:--|:--|
| `Model: build` | the agent named in `Role:` | Sonnet 5.5 (Anthropic) |
| `Model: lite` | `builder-lite` | GPT-6 Luna (OpenAI) |
| review of a `lite` card | `reviewer` | Haiku 5.5 (Anthropic) |
| review of a `build` card, or any diff touching auth / sessions / scoring / answer keys / anti-cheat | `reviewer-pro` | GPT-5.6 Terra (OpenAI) |
| recon before planning | `scout` | GPT-6 Luna (OpenAI) |

**Cross-provider review rule: a card is never reviewed by the family that built it.** Following this table gives that for free.

Prompt in every case: `Execute task card pm/tasks/<file>. Follow pm/AGENT_PLAYBOOK.md.`
Pi: `subagent` tool, `agent: "<agent>"`. Claude Code: Agent tool, `subagent_type: "<agent>"` (Anthropic lane only).

Then: **Verify** — the coordinator runs `pnpm lint`, `pnpm test`, `pnpm build` and checks the diff stayed inside the card's
Files list. **Retry** — on rejection, resume the same builder once with the findings; a second rejection promotes the card one
tier (`lite` → `build`, `build` → stop for Opus) and the sprint file records it. **Hand-back** — if `builder-lite` reports
`WRONG TIER`, re-dispatch to the Sonnet role agent and change the card's `Model:` line. **Quota failover** — one-line pin
swaps, listed in MODELS.md §3.

### 2.5 ECC skills (context budget)

The 16 vendored ECC skills (`.pi/skills/ecc/`, `ecc:*` in Claude Code) cost ~1.1K tokens of descriptions permanently and load
their bodies only on demand. Each role file lists the 4–7 relevant to it. **Load at most one or two that the card needs**;
never a set "just in case". Where a skill disagrees with `AGENTS.md`, `context/13-srs.md` or `context/09-adrs.md`, the project
wins — notably React Compiler bans the manual `useMemo`/`useCallback`/`memo` that ECC's React skills teach.

### 2.6 Token-saving rules (apply to every agent)
1. **One card per session.** Fresh session each time; don't carry history.
2. **Read only what the card lists** plus the files you edit. No repo-wide exploration. Use `grep`/`rg` for lookups.
3. Specs are long. Read **the cited section**, not the whole document.
4. Report in ≤ 15 lines (template in the playbook). No restating the card.
5. Stuck after **2 verification failures** → stop and escalate (§6). Don't loop.
6. Cheap work belongs on the cheap model: board recounts, `/sprint-status`, docs sync and recon never run on Opus or Sonnet.
7. Thinking level is a cost dial: `low` for docs, `medium` for mechanical builds and recon, `high` only for build and review.

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

### Branch model

```
sprint/S<n>-<topic>   one per sprint, branched from prototype, deleted after merge
        │  push → PR → CI green → "Merge" on GitHub (merge commit, never squash)
        ▼
prototype             the integration branch. Default branch today. Always green
        │  created once the product is pilot-ready (end of R2/R3)
        ▼
main                  release branch. Does not exist yet — deliberately
```

- **You never run `git merge` on `prototype` locally.** The merge happens on GitHub, on the PR, after CI is green.
  Merging locally skips CI and review and auto-closes the PR as if it had been reviewed.
- Per sprint: `git switch -c sprint/S<n>-<topic> prototype` → commit per card → `git push` → the PR updates →
  CI runs → merge the PR → `git switch prototype && git pull` → delete the branch (local and remote).
- **`main` is created later, not now.** `prototype` is the integration branch while the product is being built; it
  carries mock data and an unfinished backend. When the system is feature-complete and pilot-ready (R2 exit, after P5,
  with E2E and load tests passing per `context/20`), we branch `main` off `prototype`, make it the default, and from then on
  `prototype` → `main` is a release PR per release. Creating `main` earlier would just be a second name for the same code.
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
