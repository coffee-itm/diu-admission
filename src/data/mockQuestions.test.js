import { describe, it, expect } from 'vitest';
import { mockQuestions } from './mockQuestions';
import { SECTION_ORDER } from '../lib/constants';

describe('mockQuestions data integrity', () => {
  it('has unique ids', () => {
    const ids = mockQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(mockQuestions.map((q) => [q.id, q]))('%s is well-formed', (_id, q) => {
    expect(q.options.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(q.options.map((o) => o.id)).toContain(q.correctAnswer);
    expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
  });

  it.each(SECTION_ORDER)('has exactly 10 questions in %s', (section) => {
    expect(mockQuestions.filter((q) => q.section === section)).toHaveLength(10);
  });

  it('q_logic_010 key is a (15)', () => {
    const q = mockQuestions.find((x) => x.id === 'q_logic_010');
    expect(q.correctAnswer).toBe('a');
  });
});
