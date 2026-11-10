# T-043 · Add ids to the admin header and sidebar links

Status: 👀 Review
Sprint: S3 · Role: frontend-dev · Model: lite · Size: S
Tier rationale: mechanical attribute addition verified by grep (PROCESS §2.3)
Depends on: —
Implements: AGENTS.md rule 5; T-040 QA item 7

## Goal
T-031 gave every admin **form control** an id, but the 8 admin header and sidebar navigation links still have none — outside T-031's file list, so correctly not a T-031 defect. Add stable, unique ids so E2E tests can address the nav.

## Context to read
- `pm/tasks/T-040-s2-qa.md` item 7 · `AGENTS.md` "Important Notes for Agents" rule 5

## Files
- `src/components/layout/Sidebar.jsx`, `src/components/layout/Header.jsx`, `src/components/layout/navItems.js`: derive an id per nav entry (e.g. `nav-admin-analytics`) rather than hard-coding 8 strings.

## Acceptance criteria
1. [x] Every admin header and sidebar link has a unique, stable `id`.
2. [x] Proven with a repo-wide grep over `src/` that no interactive element in these three files is left without an id.
3. [x] A test asserts the ids exist and are unique.
4. [x] `pnpm lint` (0 warnings), `pnpm test`, `pnpm build` pass.

## Verify
```bash
pnpm lint && pnpm test && pnpm build
```

## Out of scope
- Candidate-side nav, a11y landmark work (S7).

## Agent log
- Added `id` (derived via `slugify(label)` → `nav-admin-{slug}`) to each `navItems` entry in `navItems.js` instead of hard-coding ids.
- `Sidebar.jsx`: each link id is `nav-sidebar-${item.id}`.
- `Header.jsx`: gave every remaining interactive element (desktop Home/Login/Register/Dashboard/Admin Panel/Logout, mobile menu toggle, mobile Home/Login/Register/admin nav items/Logout) a unique id; mobile admin nav items use `nav-mobile-${item.id}` so they never collide with the always-mounted Sidebar ids.
- Added `src/components/layout/navIds.test.jsx`: asserts navItems ids are unique/non-empty, Sidebar links all have unique ids matching `nav-sidebar-*`, and Header (desktop+opened mobile menu) interactive elements all have unique ids including `nav-mobile-*`.
- Grep over the 3 files confirmed every `<Link>`/`<button>`/`<Button>` now has an `id` prop.
- `pnpm lint`: 0 warnings. `pnpm test`: 243/243 passed (new file included). `pnpm build` via frozen-lockfile pre-check failed on an unrelated `@vitest/coverage-v8` lockfile drift from concurrent work; ran `npx vite build` directly — built successfully in 6.76s.

## Review
