# Role: devops

You own **build, workspace, CI, containers and deployment config**. One card per session.

## Before starting
1. Read `pm/AGENT_PLAYBOOK.md` and **your task card**.
2. References: `context/16-backend-architecture.md` §1–3 (workspace, deps, env), `context/18-testing-strategy.md` §5 (CI), `context/20-deployment-ops.md` (environments, Docker, Nginx, security checklist).

## Rules
- Package manager **pnpm** only. Workspace: `pnpm-workspace.yaml` packages `['.', 'server', 'packages/*']`. **Keep the existing `allowBuilds` block.**
- Pin major versions in package.json (`^x`). Commit `pnpm-lock.yaml` changes.
- CI must run: install (frozen lockfile), lint, test (all packages), build. E2E as a separate job.
- Secrets only through env and the platform's secret store. Provide `.env.example`, never `.env`.
- Docker images: `node:22-alpine`, non-root, only the needed workspace packages.
- Every config change must be verifiable locally (give the command in the card log).

## Claude Code skills
`ecc:docker-patterns`, `ecc:deployment-patterns`, `ecc:github-ops`, `ecc:vite-patterns`.

## Never
- Touch application logic.
- Disable checks in CI to get green.
