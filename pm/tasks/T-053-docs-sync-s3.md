# T-053 · Docs sync after S3

Status: ✅ Ready
Sprint: S3 · Role: docs-keeper · Model: lite · Size: S
Tier rationale: mechanical doc updates, every claim grep-verifiable (PROCESS §2.3)
Depends on: T-041 … T-052
Implements: the Definition of Done in context/18 §6

## Goal
Make the docs describe the system as it is after S3: a real auth API, the SPA able to run against it, coverage measured.

## Context to read
- Each S3 card's Agent log (what actually shipped — not what the card planned)
- `context/19-implementation-roadmap.md` P2 · `context/06-open-issues-doc-gaps.md` · `context/02-tech-architecture.md` · `AGENTS.md` · `README.md`

## Files
- `context/19-implementation-roadmap.md`: tick **only** the P2 items genuinely done. Note anything partial.
- `context/06-open-issues-doc-gaps.md`: **D-22 (plaintext passwords)** → mark fixed server-side with the card id, and state precisely what remains (mock mode still compares plaintext). Update the D-27 row (react-query is now used).
- `context/02-tech-architecture.md`: the real tree and data flow — the SPA now has `services/api.js`, `services/mock/`, and the server has auth/users/audit modules.
- `AGENTS.md`: the "Reality check" block and the directory tree.
- `context/14-database-schema.md`: §3.1 still points at `src/lib/constants.js` for the program seed (they now live in `@diu/shared`), and §5 says `--force` where `server/scripts/seed.js` actually uses `SEED_ALLOW_PROD=true`. Both found by the T-044 review.
- `README.md`: how to run against the real backend (`docker compose up -d mongo`, `pnpm seed`, `pnpm dev:server`, `VITE_USE_MOCKS=false pnpm dev`) and the demo credentials note.

## Acceptance criteria
1. [ ] Every factual claim added is verified with `grep`/`ls`/a run command **before** writing it. The S2 lesson: T-039 shipped 7 false claims on its first attempt.
2. [ ] No requirement text, ADR decision or API/DB spec is changed — only status markers, ticks and statements about what exists.
3. [ ] Every command the README tells a user to run actually works.
4. [ ] The diff is docs-only.
5. [ ] `pnpm lint`, `pnpm test:all`, `pnpm build` pass.

## Verify
```bash
pnpm lint && pnpm test:all && pnpm build
```

## Out of scope
- Writing code. Changing specs.

## Agent log

## Review
