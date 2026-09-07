# 03 — Assessment & Scoring Domain (Consolidated)

## Exam Configuration (`src/data/mockExamConfig.js`)

```js
{
  id: "exam_spring_2026",
  title: "ITM Admission Skill Test — Spring 2026",
  sections: [
    { id: "MATH",     name: "Mathematical Reasoning",            questionCount: 10, timeMinutes: 12 },
    { id: "LOGIC",    name: "Logical & Analytical Thinking",     questionCount: 10, timeMinutes: 12 },
    { id: "IT",       name: "Basic IT Literacy",                 questionCount: 10, timeMinutes: 10 },
    { id: "ENGLISH",  name: "English Proficiency",               questionCount: 10, timeMinutes: 10 },
    { id: "BUSINESS", name: "Business & Management Aptitude",    questionCount: 10, timeMinutes: 10 },
  ],
  totalTimeMinutes: 54,
  passingThresholds: { overallMinPercent: 50, sectionMinPercent: 40 },
  negativeMarking: false,
  maxAttempts: 1,
  startDate: "2026-06-15T00:00:00+06:00",
  endDate:   "2026-07-15T23:59:59+06:00",
}
```

## Question Schema

```js
{
  id: "q_math_001",
  section: "MATH",                       // MATH | LOGIC | IT | ENGLISH | BUSINESS
  text: "What is 15% of 200?",
  options: [ { id: "a", text }, { id: "b", ... }, { id: "c", ... }, { id: "d", ... } ],
  correctAnswer: "b",                    // option id
  difficulty: "easy" | "medium" | "hard",
  explanation: "15% of 200 = 0.15 × 200 = 30",
  tags: ["percentage", "arithmetic"],
}
```

Mock bank: 50 questions, exactly 10 per section, mixed difficulty.
Admin can CRUD + bulk-import CSV (client-side parse in prototype).

## Scoring Algorithm (`src/lib/scoring.js`)

```
Input : { answers[], questions[], examConfig }
Output: {
  sectionScores:      { MATH: n, LOGIC: n, IT: n, ENGLISH: n, BUSINESS: n },  // correct counts
  totalScore, totalQuestions: 50,
  percentage,
  sectionPercentages: { MATH: %, ... },
  eligibility:        "ELIGIBLE" | "CONDITIONALLY_ELIGIBLE" | "NOT_ELIGIBLE",
  failedSections:     [sectionIds below section threshold],
  timeTaken,          // seconds
}

Rules (defaults from examConfig.passingThresholds, admin-configurable):
  ELIGIBLE               overall ≥ 50% AND every section ≥ 40%
  CONDITIONALLY_ELIGIBLE overall ≥ 40% AND failedSections.length ∈ {1, 2}
  NOT_ELIGIBLE           overall < 40% OR failedSections.length ≥ 3
```

- +1 per correct answer, 0 otherwise; negativeMarking flag exists but is off.
- Scoring thresholds mirrored in `features/scoring/scoringConfig.js` for UI copy.

## Eligibility Semantics

| Status | Meaning | Downstream action (planned) |
|:---|:---|:---|
| ELIGIBLE | Meets aptitude bar | Normal admission processing |
| CONDITIONALLY_ELIGIBLE | Borderline; weak in 1–2 areas | Admissible with bridge/remedial courses |
| NOT_ELIGIBLE | Insufficient readiness | Admission committee rejection or counseling |

## Result Artefacts

- Candidate ResultPage: total score, section-wise ScoreCards, EligibilityBadge, time taken,
  PDF download (`lib/pdfGenerator.js`, jsPDF — header, candidate info, score table, section bars).
- Admin: result rows join candidate + result; CandidateDetailPage shows full per-section report;
  MeritListPage ranks by totalScore (desc) with tie handling by timeTaken (faster wins).

## Mock Data Sets

| File | Content |
|:---|:---|
| mockQuestions.js | 50 questions (10/section), tags, explanations, difficulties |
| mockCandidates.js | 15 candidates (name, email, phone, SSC/HSC GPA, board, status) |
| mockResults.js | 10 completed results (scores across all three eligibility tiers) |
| mockExamConfig.js | Single exam window, Spring 2026 |