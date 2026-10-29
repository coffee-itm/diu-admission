# 03 — Assessment & Scoring Domain

> Current behavior verified against the code on 2026-10-29. Target behavior is defined by FR-SCORE-* in [13-srs.md](./13-srs.md).

---

## Exam configuration

### Current (`src/data/mockExamConfig.js`)

```js
{
  id: 'exam_spring_2026',
  title: 'DIU Admission — Spring 2026',
  sections: [
    { id: 'MATH',     name: 'Mathematical Reasoning',         questionCount: 10, timeMinutes: 12 },
    { id: 'LOGIC',    name: 'Logical & Analytical Thinking',  questionCount: 10, timeMinutes: 12 },
    { id: 'IT',       name: 'Basic IT Literacy',              questionCount: 10, timeMinutes: 10 },
    { id: 'ENGLISH',  name: 'English Proficiency',            questionCount: 10, timeMinutes: 10 },
    { id: 'BUSINESS', name: 'Business & Management Aptitude', questionCount: 10, timeMinutes: 10 },
  ],
  totalTimeMinutes: 54,
  passingThresholds: { overallMinPercent: 50, sectionMinPercent: 40 },
  negativeMarking: false,
  maxAttempts: 1,
  startDate: '2026-06-15T00:00:00+06:00',
  endDate:   '2026-07-15T23:59:59+06:00',
  instructions: [/* 8 strings */],
}
```
Caveats: `questionCount`, `timeMinutes`, `maxAttempts` and the date window are **not enforced** (D-08, D-12, D-24).
The admin Exam Config page edits a copy that the test never reads (D-08).

### Target: Exam Cycle
Stored in `examCycles` ([14 §3.4](./14-database-schema.md#34-examcycles)). Adds `status`
(draft/published/closed/archived), conditional thresholds, `programOverrides`, `resultRelease`, the anti-cheat
policy, and Bangla instructions. Structural fields lock when the first session starts (FR-CFG-03).

## Question schema

```js
{
  id: 'q_math_001',          // target: Mongo _id + human `code`
  section: 'MATH',           // MATH | LOGIC | IT | ENGLISH | BUSINESS
  text: 'What is 15% of 200?',
  options: [{ id: 'a', text: '25' }, { id: 'b', text: '30' }, { id: 'c', text: '35' }, { id: 'd', text: '40' }],
  correctAnswer: 'b',
  difficulty: 'easy',        // easy | medium | hard
  explanation: '15% of 200 = 0.15 × 200 = 30',
  tags: ['percentage', 'arithmetic'],
  // target additions: status (draft|reviewed|active|retired), textBn, options[].textBn, timesServed, stats
}
```

Mock bank: **50 questions**, 10 per section. Difficulty: 26 easy, 18 medium, 6 hard. **`q_logic_010` has a wrong key** (D-01).
Zod schema: `src/features/questions/questionSchema.js` (exactly 4 options, `correctAnswer` required; uses the Zod 3 `required_error`, D-27).

## Scoring

### Current algorithm (`src/lib/scoring.js`)

```
calculateScore({ answers, questions, examConfig, timeTaken })
  correct           ⇔ answers[q.id] === q.correctAnswer      (+1, else 0; no negative marking)
  sectionPct        = round1(correct_s / count_s × 100); failed if sectionPct < sectionMinPercent
  overall           = totalCorrect / questions.length × 100, rounded to 1 decimal BEFORE classification
  ELIGIBLE               if overall ≥ overallMinPercent (50) AND failed = 0
  CONDITIONALLY_ELIGIBLE else if overall ≥ 40 (hard-coded) AND failed ≤ 2 (hard-coded)
  NOT_ELIGIBLE           otherwise
returns { sectionScores, totalScore, totalQuestions, percentage, sectionPercentages,
          eligibility, failedSections, timeTaken, answeredCount }
```

Notes:
- **There is no "dead zone" in the code.** `failed ≤ 2` includes 0, so 40–49 % with no failed
  section is Conditionally Eligible. The dead zone exists only in the old written rule
  ("< 40 % in 1–2 sections") in AGENTS.md and the earlier docs, which was wrong. See [07](./07-grilling.md) Q7.
- `getGrade()` (A+…F) and `src/features/scoring/scoringConfig.js` (`DEFAULT_SCORING_CONFIG`, `SECTION_WEIGHTS`) are unused (D-09).

### Target algorithm (FR-SCORE-01…07)

Lives in `packages/shared/scoring.js` and is run by the server.

```
thresholds = resolveThresholds(cycle, candidate.programCode)   // default ⊕ program override
per section s: score_s = correct_s − (negativeMarking ? value × wrong_s : 0), floored at 0
               pct_s   = score_s / served_s × 100              (unrounded for comparison)
               failed  ⇔ pct_s < sectionMinPercent
overall = Σ score_s / Σ served_s × 100                        (unrounded for comparison)
ELIGIBLE               ⇔ overall ≥ overallMinPercent ∧ |failed| = 0
CONDITIONALLY_ELIGIBLE ⇔ ¬ELIGIBLE ∧ overall ≥ conditionalMinPercent (40) ∧ |failed| ≤ maxFailedSectionsForConditional (2)
NOT_ELIGIBLE           ⇔ otherwise
stored values rounded to 1 decimal; thresholdsUsed snapshotted in the result
```

Boundary cases: [18 §3.1](./18-testing-strategy.md#31-scoring-boundary-table).

## Eligibility semantics

UI wording per PRD Q1 (advisory): **"Recommendation: …"**.

| Status | Meaning | Downstream |
|:---|:---|:---|
| ELIGIBLE | Meets the aptitude bar for the program | Normal admission processing |
| CONDITIONALLY_ELIGIBLE | Borderline or weak in ≤ 2 areas | Admissible with bridge/remedial courses |
| NOT_ELIGIBLE | Insufficient readiness | Committee decision / counselling |

## Merit ranking

- **Current** (`src/services/resultService.js` `getMeritList`): sorts by percentage desc only, all programs mixed, over mock candidates only.
- **Target** (FR-RES-05): per program, percentage desc → timeTaken asc, competition ranking (1,2,2,4), disqualified excluded. Aggregation in [14 §4.3](./14-database-schema.md#43-merit-list).

## Mock data sets

| File | Content |
|:---|:---|
| `mockQuestions.js` | 50 questions (10/section), tags, explanations, difficulties. One wrong key (D-01) |
| `mockCandidates.js` | **16 candidates** (`cand_001…015` + `cand_demo`, each with a `program`) **+ 1 admin**. All passwords plaintext (`Test@1234` / `Admin@1234`) |
| `mockResults.js` | **15 results** (`res_001…015`), spread over all three tiers. No `answeredCount`, no `antiCheat` |
| `mockExamConfig.js` | One exam, Spring 2026 window |

These are seed sources for MongoDB ([14 §5](./14-database-schema.md#5-seeding-serverscriptsseedjs)).
