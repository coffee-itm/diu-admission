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
