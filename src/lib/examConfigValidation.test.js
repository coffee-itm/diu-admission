import { describe, it, expect } from 'vitest';
import {
  validateExamConfigForm,
  isValidQuestionCount,
  isValidTimeMinutes,
} from './examConfigValidation.js';

const validForm = { totalTimeMinutes: 60, overallMinPercent: 50, sectionMinPercent: 40 };

describe('validateExamConfigForm', () => {
  it('accepts a valid form', () => {
    expect(validateExamConfigForm(validForm)).toEqual({ valid: true, errors: {} });
  });

  it('accepts the numeric strings the number inputs produce', () => {
    expect(
      validateExamConfigForm({ totalTimeMinutes: '60', overallMinPercent: '50', sectionMinPercent: '40' })
    ).toEqual({ valid: true, errors: {} });
  });

  describe('totalTimeMinutes', () => {
    it('accepts the boundaries 1 and 600', () => {
      expect(validateExamConfigForm({ ...validForm, totalTimeMinutes: 1 }).valid).toBe(true);
      expect(validateExamConfigForm({ ...validForm, totalTimeMinutes: 600 }).valid).toBe(true);
    });

    it.each([0, -1, 601])('rejects %s', (totalTimeMinutes) => {
      const result = validateExamConfigForm({ ...validForm, totalTimeMinutes });
      expect(result.valid).toBe(false);
      expect(result.errors.totalTimeMinutes).toEqual(expect.any(String));
      expect(Object.keys(result.errors)).toEqual(['totalTimeMinutes']);
    });

    it('rejects a fractional duration', () => {
      const result = validateExamConfigForm({ ...validForm, totalTimeMinutes: 2.5 });
      expect(result.valid).toBe(false);
      expect(result.errors.totalTimeMinutes).toEqual(expect.any(String));
    });

    it.each(['', '   ', null, undefined, NaN, 'abc'])('rejects an empty or non-numeric value (%s)', (value) => {
      const result = validateExamConfigForm({ ...validForm, totalTimeMinutes: value });
      expect(result.valid).toBe(false);
      expect(result.errors.totalTimeMinutes).toEqual(expect.any(String));
    });
  });

  describe('thresholds', () => {
    it('accepts the boundaries 0 and 100', () => {
      expect(
        validateExamConfigForm({ ...validForm, overallMinPercent: 0, sectionMinPercent: 100 }).valid
      ).toBe(true);
    });

    it.each([-1, 101])('rejects %s for both thresholds', (value) => {
      const overall = validateExamConfigForm({ ...validForm, overallMinPercent: value });
      const section = validateExamConfigForm({ ...validForm, sectionMinPercent: value });
      expect(overall.valid).toBe(false);
      expect(overall.errors.overallMinPercent).toEqual(expect.any(String));
      expect(section.valid).toBe(false);
      expect(section.errors.sectionMinPercent).toEqual(expect.any(String));
    });

    it.each(['', '   ', null, NaN])('rejects an empty or non-numeric threshold (%s)', (value) => {
      const result = validateExamConfigForm({ ...validForm, overallMinPercent: value, sectionMinPercent: value });
      expect(result.valid).toBe(false);
      expect(result.errors.overallMinPercent).toEqual(expect.any(String));
      expect(result.errors.sectionMinPercent).toEqual(expect.any(String));
    });

    it('reports every invalid field at once', () => {
      const result = validateExamConfigForm({ totalTimeMinutes: 0, overallMinPercent: 101, sectionMinPercent: -1 });
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).sort()).toEqual(
        ['overallMinPercent', 'sectionMinPercent', 'totalTimeMinutes']
      );
    });
  });
});

describe('isValidQuestionCount', () => {
  it.each([1, 10, '10', 50])('accepts %s', (value) => {
    expect(isValidQuestionCount(value)).toBe(true);
  });

  it.each([0, -1, 0.5, 2.5, '', '  ', null, NaN, 'abc'])('rejects %s', (value) => {
    expect(isValidQuestionCount(value)).toBe(false);
  });
});

describe('isValidTimeMinutes', () => {
  it.each([0, 12, '12', 45])('accepts %s', (value) => {
    expect(isValidTimeMinutes(value)).toBe(true);
  });

  it.each([-1, -0.5, '', '  ', null, NaN, 'abc'])('rejects %s', (value) => {
    expect(isValidTimeMinutes(value)).toBe(false);
  });
});
