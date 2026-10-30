# 01 — Project Overview

> **DIU Admission** is the university-wide admission aptitude assessment for Daffodil International University.
> It started as an ITM-only "Admission Skill Test" and was widened to all departments
> ([11-pivot-diu-admission.md](./11-pivot-diu-admission.md)). Product requirements: [12-prd.md](./12-prd.md).

---

## Identity

| Field | Value |
|:---|:---|
| Name | **DIU Admission** |
| Owner | Office of Admissions, Daffodil International University (all departments) |
| Purpose | Online aptitude assessment that screens applicants to **every DIU program**, alongside GPA |
| Exam | 50 MCQs, 5 sections (Math, Logic, IT, English, Business), 54 minutes, instant automated scoring |
| Output | Recommendation (Eligible / Conditionally Eligible / Not Eligible), merit lists per program, cohort analytics, integrity reports |
| Programs | 13 across 3 faculties (`PROGRAMS` in `src/lib/constants.js:8-22`) |
| Stage | **Prototype (R0)**: frontend-only React SPA with mock data + localStorage. Presented at mid-defense (`mid-defense/`) |
| Target stack | React SPA + **Fastify + Mongoose + MongoDB** ([09](./09-adrs.md) ADR-013/014) |

## Problem

1. Admission is GPA-based. GPA does not measure logical/analytical thinking, IT literacy, English proficiency,
   business awareness, or mathematical reasoning beyond board exams.
2. As a result, unprepared enrolments, weak first semesters, higher dropout and repeat rates, and wasted remedial resources.
3. No data-driven view of an incoming cohort's strengths and weaknesses. Paper/manual assessment is slow and error-prone.

## Opportunity

- An objective, comparable aptitude signal for every applicant, in every program.
- Cohort profiling per program before classes start → bridge/remedial course planning.
- Instant results and merit lists; large admin time savings.

## Personas

| Persona | Role | Key needs |
|:---|:---|:---|
| Rafiq, 18, HSC graduate on a 3G Android phone | candidate | Simple mobile UI, Bangla, no lost answers, quick result |
| Dr. Fatema, Office of Admissions coordinator | admin | Bulk questions, thresholds per program, merit lists, analytics, integrity review |
| Kamal, department committee member | reviewer | Read-only results for his programs, filters, one-click export |

## Success metrics

See [12 §7](./12-prd.md#7-success-metrics-observable-by-the-app): completion ≥ 90 %, availability ≥ 99.5 % in the window,
result < 1 min after submit, p95 load < 3 s on 3G, −70 % admin time, satisfaction ≥ 4/5.

## Status (2026-10-29)

| Area | State |
|:--|:--|
| Prototype UI (candidate + admin) | ✅ built, demoable |
| Prototype correctness | ⚠️ 29 verified defects, 7 of them P0 ([06](./06-open-issues-doc-gaps.md)) |
| Tests / CI | ❌ none |
| Backend | ❌ not started. Design complete ([14](./14-database-schema.md)–[16](./16-backend-architecture.md)) |
| i18n / dark mode | ❌ not started |

## Roadmap

| Phase | Content | Release |
|:--|:--|:--|
| P0 | Fix prototype defects + test harness | R1 |
| P1–P5 | Workspace, Fastify/MongoDB server, auth, question bank, cycles, server sessions, results, analytics, security review | R2 MVP |
| P6–P7 | OTP, i18n EN/BN, dark mode, a11y, performance | R3 Pilot |
| P8 | Hardening, load test, deployment, rollout | R3/R4 |

Task-level detail: [19-implementation-roadmap.md](./19-implementation-roadmap.md).

## Demo credentials (prototype only)

| Role | Email | Password |
|:---|:---|:---|
| Admin | `admin@diu.edu` | `Admin@1234` |
| Candidate | `demo@candidate.com` | `Test@1234` |

All 16 mock candidates use `Test@1234`. The seed script reuses these for local development only ([14 §5](./14-database-schema.md#5-seeding-serverscriptsseedjs)).

## Background: the original ITM framing (historical)

The test sections were first mapped to the B.Sc. in ITM curriculum (MATH → MATH 101/STA 101, LOGIC → DS/Algorithms,
IT → Computer Fundamentals, ENGLISH → ENG 101/105, BUSINESS → ITM 101–103). After the pivot, the same five sections act as
**general university readiness** areas for every program. Program-specific sections or weights are future work (Q11 in [06](./06-open-issues-doc-gaps.md#3-open-product-questions)).
