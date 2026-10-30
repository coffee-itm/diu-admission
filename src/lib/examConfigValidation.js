// Validation for the admin exam-config form. The form keeps raw input strings,
// so every check coerces first and treats empty / non-numeric values as invalid.
export const DURATION_MIN = 1;
export const DURATION_MAX = 600;
export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 100;

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

// Guards for the per-section inputs: a question count must be a whole number >= 1
// and a recommended time must be >= 0 (0 means "not set").
export function isValidQuestionCount(value) {
  if (isBlank(value)) return false;
  const count = toNumber(value);
  return Number.isInteger(count) && count >= 1;
}

export function isValidTimeMinutes(value) {
  if (isBlank(value)) return false;
  const minutes = toNumber(value);
  return Number.isFinite(minutes) && minutes >= 0;
}
