// Validation for the admin exam-config form. The form keeps raw input strings,
// so every check coerces first and treats empty / non-numeric values as invalid.
export const DURATION_MIN = 1;
export const DURATION_MAX = 600;
export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 100;
// A section can't realistically hold more questions than this, or run longer than the whole exam.
export const SECTION_QUESTION_COUNT_MIN = 1;
export const SECTION_QUESTION_COUNT_MAX = 100;
export const SECTION_TIME_MINUTES_MIN = 0;
export const SECTION_TIME_MINUTES_MAX = DURATION_MAX;

// `Number('')` and `Number('   ')` are 0, so blank inputs must be rejected explicitly.
function toNumber(value) {
  if (typeof value === 'string' && value.trim() === '') return NaN;
  if (value === null || value === undefined) return NaN;
  return Number(value);
}

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function validateDuration(value) {
  const minutes = toNumber(value);
  if (Number.isNaN(minutes)) return 'Enter a duration in minutes';
  if (!Number.isInteger(minutes)) return 'Duration must be a whole number of minutes';
  if (minutes < DURATION_MIN || minutes > DURATION_MAX) {
    return `Duration must be between ${DURATION_MIN} and ${DURATION_MAX} minutes`;
  }
  return null;
}

function validateThreshold(value) {
  const percent = toNumber(value);
  if (Number.isNaN(percent)) return 'Enter a percentage between 0 and 100';
  if (percent < THRESHOLD_MIN || percent > THRESHOLD_MAX) {
    return `Percentage must be between ${THRESHOLD_MIN} and ${THRESHOLD_MAX}`;
  }
  return null;
}

/**
 * @param {{ totalTimeMinutes: unknown, overallMinPercent: unknown, sectionMinPercent: unknown }} form
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateExamConfigForm(form = {}) {
  const errors = {};

  const durationError = validateDuration(form.totalTimeMinutes);
  if (durationError) errors.totalTimeMinutes = durationError;

  const overallError = validateThreshold(form.overallMinPercent);
  if (overallError) errors.overallMinPercent = overallError;

  const sectionError = validateThreshold(form.sectionMinPercent);
  if (sectionError) errors.sectionMinPercent = sectionError;

  return { valid: Object.keys(errors).length === 0, errors };
}

// Guards for the per-section inputs: a question count must be a whole number
// between SECTION_QUESTION_COUNT_MIN and SECTION_QUESTION_COUNT_MAX, and a
// recommended time must be between SECTION_TIME_MINUTES_MIN (0 means "not set")
// and SECTION_TIME_MINUTES_MAX.
export function isValidQuestionCount(value) {
  if (isBlank(value)) return false;
  const count = toNumber(value);
  return (
    Number.isInteger(count) &&
    count >= SECTION_QUESTION_COUNT_MIN &&
    count <= SECTION_QUESTION_COUNT_MAX
  );
}

export function isValidTimeMinutes(value) {
  if (isBlank(value)) return false;
  const minutes = toNumber(value);
  return (
    Number.isFinite(minutes) &&
    minutes >= SECTION_TIME_MINUTES_MIN &&
    minutes <= SECTION_TIME_MINUTES_MAX
  );
}

// Message-returning counterparts, used to show an inline error on Save/blur
// instead of silently rejecting a keystroke (that coerced a cleared field
// back to a stale value — see T-042).
export function validateSectionQuestionCount(value) {
  if (isBlank(value)) return 'Enter a question count';
  const count = toNumber(value);
  if (Number.isNaN(count) || !Number.isInteger(count)) return 'Question count must be a whole number';
  if (count < SECTION_QUESTION_COUNT_MIN || count > SECTION_QUESTION_COUNT_MAX) {
    return `Question count must be between ${SECTION_QUESTION_COUNT_MIN} and ${SECTION_QUESTION_COUNT_MAX}`;
  }
  return null;
}

export function validateSectionTimeMinutes(value) {
  if (isBlank(value)) return 'Enter a recommended time';
  const minutes = toNumber(value);
  if (!Number.isFinite(minutes)) return 'Time must be a number';
  if (minutes < SECTION_TIME_MINUTES_MIN || minutes > SECTION_TIME_MINUTES_MAX) {
    return `Time must be between ${SECTION_TIME_MINUTES_MIN} and ${SECTION_TIME_MINUTES_MAX} minutes`;
  }
  return null;
}
