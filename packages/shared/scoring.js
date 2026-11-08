import { SECTION_ORDER, ELIGIBILITY } from './constants.js';

// Default scoring configuration — can be overridden per exam
export const DEFAULT_SCORING_CONFIG = {
  overallMinPercent: 50,    // Must score ≥ 50% overall to be ELIGIBLE
  sectionMinPercent: 40,    // Must score ≥ 40% in every section to be ELIGIBLE
  conditionalOverallMin: 40, // ≥ 40% overall for CONDITIONALLY_ELIGIBLE
  conditionalMaxFailedSections: 2, // At most 2 sections below sectionMinPercent
  negativeMarkingFactor: 0,  // 0 = no negative marking
  pointsPerCorrect: 1,
};

/** Merge exam-level passing thresholds over the defaults. */
export function resolveThresholds(passingThresholds) {
  return { ...DEFAULT_SCORING_CONFIG, ...passingThresholds };
}

/**
 * Calculate the full scored result from a candidate's answers.
 *
 * @param {Object} params
 * @param {Object} params.answers     - Map of questionId → selectedOptionId
 * @param {Array}  params.questions   - Array of question objects
 * @param {Object} params.examConfig  - Exam config (passingThresholds, sections)
 * @param {number} params.timeTaken   - Seconds taken to complete
 * @returns {Object} Full result object
 */
export function calculateScore({ answers, questions, examConfig, timeTaken = 0 }) {
  const { passingThresholds, sections } = examConfig;
  const t = resolveThresholds(passingThresholds);

  // Initialize per-section counters
  const sectionMap = {};
  for (const section of sections) {
    sectionMap[section.id] = { correct: 0, total: 0, questions: [] };
  }

  // Tally answers (only valid option ids for questions in the paper count)
  let answeredCount = 0;
  for (const question of questions) {
    const sid = question.section;
    if (!sectionMap[sid]) continue;
    sectionMap[sid].total++;
    sectionMap[sid].questions.push(question.id);
    const given = answers[question.id];
    const isValid = question.options.some((o) => o.id === given);
    if (isValid) {
      answeredCount++;
      if (given === question.correctAnswer) sectionMap[sid].correct++;
    }
  }

  // Build sectionScores and sectionPercentages
  const sectionScores = {};
  const sectionPercentages = {};
  const failedSections = [];

  for (const sid of SECTION_ORDER) {
    if (!sectionMap[sid]) continue;
    const { correct, total } = sectionMap[sid];
    const pct = total > 0 ? (correct / total) * 100 : 0;
    sectionScores[sid] = correct;
    sectionPercentages[sid] = Math.round(pct * 10) / 10;
    if (pct < t.sectionMinPercent) {
      failedSections.push(sid);
    }
  }

  const totalCorrect = Object.values(sectionScores).reduce((a, b) => a + b, 0);
  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const percentageRounded = Math.round(percentage * 10) / 10;

  // Determine eligibility
  let eligibility;
  if (percentage >= t.overallMinPercent && failedSections.length === 0) {
    eligibility = ELIGIBILITY.ELIGIBLE;
  } else if (
    percentage >= t.conditionalOverallMin &&
    failedSections.length <= t.conditionalMaxFailedSections
  ) {
    eligibility = ELIGIBILITY.CONDITIONALLY_ELIGIBLE;
  } else {
    eligibility = ELIGIBILITY.NOT_ELIGIBLE;
  }

  return {
    sectionScores,
    totalScore: totalCorrect,
    totalQuestions,
    percentage: percentageRounded,
    sectionPercentages,
    eligibility,
    failedSections,
    timeTaken,
    answeredCount,
  };
}

/**
 * Get a letter grade from a percentage
 */
export function getGrade(percentage) {
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B+';
  if (percentage >= 50) return 'B';
  if (percentage >= 40) return 'C';
  return 'F';
}
