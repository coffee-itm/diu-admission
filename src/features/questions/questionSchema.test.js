import { describe, it, expect } from 'vitest';
import { questionSchema, defaultQuestionValues } from './questionSchema.js';

const valid = { ...defaultQuestionValues, text: 'What is 2 + 2?', options: defaultQuestionValues.options.map((o) => ({ ...o, text: o.id })) };

describe('questionSchema', () => {
  it('accepts a valid question', () => {
    expect(questionSchema.safeParse(valid).success).toBe(true);
  });
  it('trims and lowercases tags', () => {
    const r = questionSchema.parse({ ...valid, tags: ['  Algebra ', 'PERCENT'] });
    expect(r.tags).toEqual(['algebra', 'percent']);
  });
  it('rejects more than 10 tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`);
    expect(questionSchema.safeParse({ ...valid, tags }).success).toBe(false);
  });
  it('uses custom error for missing section', () => {
    const r = questionSchema.safeParse({ ...valid, section: undefined });
    expect(r.error.issues[0].message).toBe('Section is required');
  });
});

describe('questionSchema extras', () => {
  it('says which sections are valid for an unknown section', () => {
    const r = questionSchema.safeParse({ ...valid, section: 'HISTORY' });
    expect(r.error.issues[0].message).toMatch(/^Section must be one of MATH/);
  });
  it('rejects duplicate option text (trimmed, case-insensitive)', () => {
    const options = valid.options.map((o, i) => ({ ...o, text: i === 0 ? 'Paris' : i === 1 ? 'paris ' : o.text }));
    const r = questionSchema.safeParse({ ...valid, options });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].path.slice(0, 1)).toEqual(['options']);
  });
});
