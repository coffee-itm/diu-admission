# T-039 · Docs sync after S2

Status: ✅ Ready
Sprint: S2 · Role: docs-keeper · Model: free-ok · Size: S
Depends on: T-024 … T-038
Implements: Definition of Done ("update the docs in the same change"), roadmap ticks P1-01 … P1-06

## Goal
The docs match the repo after S2: the workspace layout, the new scripts, how to run Mongo and the server locally, the fixed carry-over items, and the roadmap ticks.

## Context to read
- `pm/sprints/S2.md` (scope), each S2 card's Agent log
- `AGENTS.md` ("Reality check" block, Development Commands), `README.md`, `context/02-tech-architecture.md` (actual tree), `context/06-open-issues-doc-gaps.md`, `context/19-implementation-roadmap.md` (P1), `ANTI_CHEAT_IMPLEMENTATION.md` (storage key)

## Files
- `context/19-implementation-roadmap.md`: tick P1-01 … P1-06 when their cards are Done.
- `AGENTS.md`: update the Reality check (now exist: `packages/shared`, `server/`, `docker-compose.yml`, `.github/workflows/ci.yml`), and add `pnpm dev:server`, `pnpm test:all` and `docker compose up -d mongo` to Development Commands.
- `README.md`: a "Run the backend locally" section (copy `.env.example`, compose up, `pnpm dev:server`, curl `/api/v1/ready`).
- `context/02-tech-architecture.md`: the actual tree, including the workspace packages.
- `context/06-open-issues-doc-gaps.md`: mark the S1 carry-over items fixed by T-024 … T-031 with their card IDs.
- `ANTI_CHEAT_IMPLEMENTATION.md`: note that the key is now `diu-anti-cheat` and that `itm-anti-cheat` is migrated (T-018).

## Acceptance criteria
1. [ ] `grep -n "itm-anti-cheat" ANTI_CHEAT_IMPLEMENTATION.md`: every hit is explained as the legacy key.
2. [ ] Every command in the new README section runs as written. Spot-check `pnpm test:all`.
3. [ ] The roadmap ticks match the cards that are Done on the board.
4. [ ] No code files changed (`git diff --stat` shows only `.md` files).

## Verify
```bash
git diff --stat && pnpm test:all
```

## Out of scope
- Rewriting specs. Gaps found go to `pm/ESCALATIONS.md`.

## Agent log

## Review
