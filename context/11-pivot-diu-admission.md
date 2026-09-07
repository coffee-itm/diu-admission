# 11 — Pivot: ITM-only → DIU Admission (University-Wide)

> Change-of-plan record. Supersedes all ITM-only framing in docs 01–10 wherever they conflict.

## The Pivot

| Before | After |
|:---|:---|
| ITM Admission Skill Test WebApp | **DIU Admission** (web app) |
| Screens applicants to B.Sc. in ITM only | Screens applicants to **all departments** of Daffodil International University |
| Dept.-owned (ITM) | University-level: **Office of Admissions** |
| `admin@itm.diu.edu` | `admin@diu.edu` |
| localStorage key `itm-candidates` | `diu-candidates` |
| PDF: `ITM_SkillTest_Report_*.pdf` | `DIU_Admission_Report_*.pdf` |

## Model Changes

1. **New entity: Program** — `{ id, name, faculty }`. 13 programs across 3 faculties
   (Science & Technology, Business & Entrepreneurship, Arts & Humanities) seeded in
   `src/lib/constants.js → PROGRAMS`. ITM becomes one program among many.
2. **Candidate gains `program`** — chosen at registration (required select in RegisterPage,
   validated by Zod). All 16 mock candidates now carry varied `program` values.
3. **Exam stays university-common** for the prototype: the same 5-section, 50-question,
   54-minute aptitude test applies to every program. One ExamConfig, many programs.

## What Stays Valid (from docs 01–10)

- Entire tech stack, architecture, stores, services, anti-cheat system, scoring algorithm,
  eligibility tiers, and all grilling findings (scoring dead zone, bank-leak risk, i18n gap,
  advisory-vs-gate question) — unchanged.

## New Open Questions Introduced by the Pivot

1. **Who owns the system now?** Office of Admissions vs individual departments — affects
   admin roles (single university admin? per-department sub-admins?).
2. **Per-program scoring/thresholds?** Same 50/40 thresholds for Law and Pharmacy? Likely not —
   per-program `passingThresholds` become a requirement.
3. **Per-program question weighting or extra sections?** (e.g., heavier MATH for CSE).
4. **Merit lists per program** — MeritListPage must filter/rank by `program`.
5. **Registration volume scales ~30×** (all departments) — reinforces peak-load and
   question-bank-size risks from doc 06.
6. **Analytics must add program dimension** (registrations/results per program).

## Code Changes Applied

- `src/lib/constants.js` — APP_NAME, APP_DEPT, PROGRAMS, admin email
- `src/services/authService.js` — storage key
- `src/data/mockCandidates.js` — program field + university admin
- `src/data/mockExamConfig.js` — title
- `src/pages/public/RegisterPage.jsx` — program select + copy
- `src/pages/public/LoginPage.jsx` — demo admin email
- `src/pages/public/LandingPage.jsx` — hero/copy
- `src/components/layout/Header.jsx`, `Footer.jsx` — branding
- `src/lib/pdfGenerator.js` — header + filename
- `index.html`, `package.json` — metadata

## Deferred (future work)

- Per-program exam configs & thresholds
- Program-specific question sections / weighting
- Per-department sub-admin roles
- Program filter on MeritListPage / CandidatesPage / Analytics