# Model catalogue & routing — DIU Admission

> Authoritative list of the models this project uses, what each one is for, and why.
> Routing policy that consumes this list: [PROCESS.md §2](./PROCESS.md#2-roles-and-model-routing-token-policy).
> **Verified on 2026-11-08** by actually calling every model through Pi (`pi -p "Reply with exactly: OK" --model <id>`).
> Two providers only: **Anthropic** and **OpenAI (Codex / Sign in with ChatGPT)**. The OpenCode DeepSeek free lane is **retired**.

---

## 1. Verified available models

Prices are list USD per 1M tokens from Pi's catalog. Both providers are authenticated with **OAuth subscriptions**
(`~/.pi/agent/auth.json`: `anthropic` = Claude subscription, `openai-codex` = ChatGPT subscription), so the real day-to-day
constraint is **each subscription's quota**, and the prices below are the right way to compare *relative* cost of a task.

| # | Model ID (use exactly this) | In | Out | Cache read | Context | Status |
|:-:|:--|--:|--:|--:|--:|:--|
| 1 | `anthropic/claude-opus-5-5` | 4.00 | 20.00 | 0.20 | 1M | ✅ verified |
| 2 | `anthropic/claude-sonnet-5-5` | 2.00 | 10.00 | 0.10 | 1M | ✅ verified |
| 3 | `anthropic/claude-haiku-5-5` | 0.10 | 0.50 | 0.01 | 1M | ✅ verified — **5× price cliff above 100K input** → 0.50 / 2.50 |
| 4 | `openai-codex/gpt-5.6-terra` | 2.00 | 12.00 | 0.20 | 272K | ✅ verified |
| 5 | `openai-codex/gpt-5.6-luna` | 0.20 | 1.20 | 0.02 | 272K | ✅ verified |
| 6 | `openai-codex/gpt-6-luna` | 0.10 | 0.50 | 0.01 | 272K | ✅ verified — **no cliff until 272K** (then 0.20 / 0.75) |

### Blocked on this ChatGPT account (do not put them in an agent file)

`gpt-6-sol`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-astra`, `gpt-5.6-sol` — all return
*"model is not supported when using Codex with a ChatGPT account"*. They are in Pi's catalog but not in this plan.
Re-test them after a plan change before using them.

### Deliberately unused
`claude-fable-5-1` ($10/$50, creative writing), every `claude-*-4-*` (older generation, 200K context, strictly worse
price/perf than the 5.x line), `opencode/deepseek-v4.1-flash-free` (**retired**: free but it hit its quota mid-sprint,
can't be driven from Claude Code or Pi, and was never allowed to review).

---

## 2. The two economic facts that drive the routing

**(a) `gpt-6-luna` ties Haiku 5.5 on price but has no 100K cliff.**
Both are $0.10 / $0.50. Haiku 5.5 jumps to **$0.50 / $2.50 above 100K input tokens** — and a builder session that reads a
card, a role file, the playbook, several source files and then pastes `pnpm test` output crosses 100K easily. `gpt-6-luna`
stays at base price to 272K. **So the cheap tier runs on OpenAI, not on Haiku.**

**(b) Only Anthropic models declare `promptCache` in the catalog, so only they are eligible for Pi's cache warming.**
That makes Anthropic cheapest where a *large, stable prefix is reused across many turns* — i.e. a long-lived session —
and makes the no-cache OpenAI models cheapest for **one-shot subagents**, which read a fresh set of files, answer once and
exit. This maps perfectly onto our architecture:

> **Long-lived sessions → Anthropic (cache pays). One-shot children → OpenAI (cache can't pay).**

---

## 3. Routing table (what runs where, and why)

| Tier | Agent(s) | Model | Thinking | Why this model |
|:--|:--|:--|:--|:--|
| **plan** | your main session | `anthropic/claude-opus-5-5` | high | Only tier with no OpenAI alternative on this plan (`sol`/`astra` blocked). Long-lived session with a huge stable prefix → cache read at $0.20 instead of $4.00. Never builds. |
| **build** | `frontend-dev` `backend-dev` `test-engineer` `devops` | `anthropic/claude-sonnet-5-5` | high | Strongest available coder for subtle state/closure/timing and security work. $2/$10 with a $0.10 cache read. |
| **build-review** | `reviewer-pro` | `openai-codex/gpt-5.6-terra` | high | Same input price as Sonnet, **different model family** — a cross-lab reviewer finds what the builder's own family is blind to. Reviews the Sonnet-built cards. |
| **lite** | `builder-lite` | `openai-codex/gpt-6-luna` | medium | 20× cheaper than Sonnet, no 100K cliff, 272K context. Runs every mechanical card. |
| **lite-review** | `reviewer` | `anthropic/claude-haiku-5-5` | high | Cross-family against the OpenAI-built lite cards. Reviews are short-context, so the Haiku cliff never bites, and high thinking on a $0.10 model is the cheapest quality available. |
| **recon** | `scout` | `openai-codex/gpt-6-luna` | medium | Recon reads many files → long context at base price. |
| **docs** | `docs-keeper` | `openai-codex/gpt-6-luna` | low | Mechanical edits; low thinking = far fewer billed reasoning tokens. |

### The cross-provider review rule (free quality, no extra cost)
**A card is never reviewed by the family that built it.**
Sonnet (Anthropic) builds → `reviewer-pro` (OpenAI) reviews. `gpt-6-luna` (OpenAI) builds → `reviewer` (Anthropic) reviews.
This is already how the agents are pinned, so the coordinator gets it for free by following §2.4 of PROCESS.md.

### Quota failover (one-line pin swap, documented so nobody improvises)
| If this runs out | Swap this pin | To |
|:--|:--|:--|
| ChatGPT / Codex quota | `.pi/agents/builder-lite.md`, `scout.md`, `docs-keeper.md` | `anthropic/claude-haiku-5-5:medium` (accept the 100K cliff) |
| ChatGPT / Codex quota | `.pi/agents/reviewer-pro.md` | `anthropic/claude-sonnet-5-5:high` (loses cross-family diversity — note it in the sprint file) |
| Claude quota | `.pi/agents/{frontend,backend}-dev.md`, `test-engineer.md`, `devops.md` | `openai-codex/gpt-5.6-terra:high` |
| Claude quota (planning) | main session | `openai-codex/gpt-5.6-terra:high` and **split planning into smaller prompts** — there is no Opus-class OpenAI model on this plan |

---

## 4. Where the tokens actually go, and the five levers that cut them

Reasoning tokens bill as **output**, and output costs 5–12× input on every model here. So thinking level, not file reading,
is usually the biggest line item on a builder run.

| # | Lever | Mechanism | Effect |
|:-:|:--|:--|:--|
| 1 | **Right tier per card** | `lite` default, `build` only if PROCESS §2.3 says yes | 20× on input for every mechanical card |
| 2 | **Thinking level per agent** | `:low` docs · `:medium` lite/recon · `:high` build/review | reasoning output is the dominant cost; `low` on mechanical work cuts it several-fold |
| 3 | **One card per session, read only what the card cites** | PROCESS §2.6, enforced by every role file | keeps builders under the 100K cliff and under 272K entirely |
| 4 | **Cache-aware placement** | long-lived session on Anthropic (cache read 1/20th of input); one-shot children on OpenAI | the planning session's repeated prefix costs $0.20 instead of $4.00 per 1M |
| 5 | **Cheap work never touches an expensive model** | `/sprint-status`, board recounts, docs sync, recon → `gpt-6-luna` | these are frequent; they were previously inheriting **Opus** |

### Illustrative cost of one S2 wave-2 pass (9 cards, build + review each)

Rough per-card session: ~60K input, ~12K output for a lite card; ~120K input, ~25K output for a build card.

| Routing | Builder cost | Reviewer cost | Total |
|:--|--:|--:|--:|
| Everything on Opus 5.5 (what unpinned Pi subagents were doing) | ~$7.0 | ~$4.5 | **~$11.5** |
| All-Sonnet builds + Haiku reviews (the 2026-11-08 morning policy) | ~$3.3 | ~$0.5 | **~$3.8** |
| **This policy** (5 lite on `gpt-6-luna`, 4 build on Sonnet, cross-family reviews) | ~$2.2 | ~$0.6 | **~$2.8** |

≈ **4× cheaper than the unpinned baseline** and ≈ 25 % below the all-Anthropic policy — while *adding* cross-family review
diversity and moving roughly half the work onto a second, separately-metered subscription.

---

## 5. Harness support (important limitation)

| Harness | Can use Anthropic | Can use OpenAI Codex | Notes |
|:--|:-:|:-:|:--|
| **Pi** | ✅ | ✅ | The only harness that can run **both lanes**. Model is pinned per agent in `.pi/agents/*.md` frontmatter as `provider/id:thinking`. **An unpinned Pi subagent inherits the parent session's model** (`.pi/extensions/subagent/index.ts:300`) — that is how everything silently ran on Opus before 2026-11-08. |
| **Claude Code** | ✅ | ❌ | `.claude/agents/*.md` take `opus`/`sonnet`/`haiku` aliases only. Its `builder-lite` therefore falls back to **Haiku 5.5**, and `reviewer-pro` to Sonnet — same tiers, no cross-family diversity. |
| **OpenCode** | — | — | **Retired for this project.** |

**Therefore: run the sprint from Pi.** Claude Code remains a valid fallback with the Anthropic-only lane.

---

## 6. Maintenance

- Re-verify after any plan change: `for m in <ids>; do pi -p "Reply with exactly: OK" --model "$m"; done`.
- Refresh the catalog with `pi update --models`, then re-check prices here.
- When a pin changes, update the table in §3 **and** `.pi/README.md`'s pin table in the same commit.
- Never add a model to an agent file that is not in §1.
