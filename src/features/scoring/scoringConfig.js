// Default scoring configuration — can be overridden per exam

export const DEFAULT_SCORING_CONFIG = {
  overallMinPercent: 50,    // Must score ≥ 50% overall to be ELIGIBLE
  sectionMinPercent: 40,    // Must score ≥ 40% in every section to be ELIGIBLE
  conditionalOverallMin: 40, // ≥ 40% overall for CONDITIONALLY_ELIGIBLE
  conditionalMaxFailedSections: 2, // At most 2 sections below sectionMinPercent
  negativeMarkingFactor: 0,  // 0 = no negative marking
  pointsPerCorrect: 1,
};

export const SECTION_WEIGHTS = {
  MATH: 1.0,
  LOGIC: 1.0,
  IT: 1.0,
  ENGLISH: 1.0,
  BUSINESS: 1.0,
};
