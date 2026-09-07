# 01 — Project Overview (Consolidated)

> ⚠️ **SCOPE PIVOT:** This project is now **DIU Admission** — university-wide, all departments.
> See [11-pivot-diu-admission.md](./11-pivot-diu-admission.md). ITM-specific framing below is kept
> as historical context; it is superseded wherever it conflicts.

> Source: `AGENTS.md`, `README.md`, `../SRS_Document.md`, `../PRD_Document.md`,
> `../Project_Proposal.md`, `../DIU_Project_Proposal.md`, `../ITM_BSc_Program_Brochure.md`

## Identity

| Field | Value |
|:---|:---|
| Name | **DIU Admission** (formerly ITM Admission Skill Test WebApp) |
| Owner | Office of Admissions, Daffodil International University (DIU) — all departments |
| Purpose | Web-based aptitude assessment to screen applicants across **all DIU programs** during admission |
| Type | Full-stack SPA — **prototype stage: frontend-only**, mock data + localStorage, no backend |
| Exam | 50 MCQs, 5 sections, 54 minutes, instant automated scoring |
| Output | Eligible / Conditionally Eligible / Not Eligible recommendation + merit list + analytics |

## Problem Being Solved

1. DIU ITM admission is purely GPA-based (SSC/HSC ≥ 2.5, science background). GPA does not measure:
   logical/analytical thinking, IT literacy, English proficiency, business awareness, or mathematical
   reasoning beyond board exams.
2. Consequences: students enroll unprepared → poor first-semester performance, higher dropout and
   course-repeat rates, wasted remedial resources.
3. No data-driven view of incoming cohort strengths/weaknesses; paper/manual assessment is slow and
   error-prone.

## Opportunity / Expected Impact

- Filter candidates who fit the program's dual IT + Management nature.
- Projected 15–25% reduction in first-year attrition.
- Cohort profiling before classes start → bridge/remedial course planning.
- Reusable assessment platform for other DIU departments.

## The ITM Program (from brochure)

- 4-year, 142-credit B.Sc. under Faculty of Science & IT. Two majors: **FinTech** and **IT Project Management**.
- Curriculum mix: 27 cr General Education, 55 cr IT Core, 42 cr Management Core, 6 cr major pool, 12 cr capstone.
- English-medium; taught at Daffodil Smart City, Birulia, Savar.
- The five test sections map directly to curriculum foundations:
  - MATH → MATH 101, STA 101, MATH 312, Engineering Economics
  - LOGIC → Data Structures, Algorithms, Software Analysis
  - IT → ITM 111 Computer Fundamentals, Networking, OS
  - ENGLISH → ENG 101, ENG 105, Business Communication
  - BUSINESS → ITM 101/102/103, Entrepreneurship, HRM

## Personas (PRD)

| Persona | Role | Key needs |
|:---|:---|:---|
| Rafiq, 18 | Candidate, HSC science, Android phone, 3G/4G | Simple mobile UI, Bangla instructions, quick results |
| Dr. Fatema, 42 | Dept. head / admin | Bulk question upload, configurable thresholds, merit lists, analytics |
| Kamal, 55 | Admission committee reviewer | Read-only results, simple filters, one-click PDF export |

## Success Metrics (PRD KPIs)

| KPI | Target |
|:---|:---|
| Test completion rate | ≥ 90% |
| Uptime during admission window | ≥ 99.5% |
| Candidate satisfaction | ≥ 4.0/5.0 |
| Time to publish results | < 1 min |
| First-year retention improvement | +15% |
| Admin time saved vs manual | ≥ 70% |

## Project Status (DIU Proposal v2.0)

- ✅ Prototype complete: registration/login, test engine, anti-cheat, scoring/results/PDF,
  admin dashboard, question bank CRUD + bulk import, exam config, merit list, analytics.
- ○ Planned: backend API + PostgreSQL, OTP (email/SMS), production deployment.
- Roadmap: Phase 1 backend (4–6 wks) → Phase 2 OTP/notifications (2 wks) → Phase 3 testing/UAT (2 wks) → Phase 4 pilot (1 wk).

## Demo Credentials

| Role | Email | Password |
|:---|:---|:---|
| Admin | admin@itm.diu.edu | Admin@1234 |
| Candidate | demo@candidate.com | Test@1234 |