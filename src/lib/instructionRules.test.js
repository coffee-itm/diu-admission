import { describe, it, expect } from 'vitest';
import { buildRules } from './instructionRules.js';

describe('buildRules', () => {
  it('computes the duration from config and drops a stale persisted rule', () => {
    const rules = buildRules({
      totalTimeMinutes: 60,
      instructions: ['First.', 'Total duration is 54 minutes. The exam will auto-submit when time expires.', 'Last.'],
    });
    expect(rules).toHaveLength(3);
    expect(rules[1]).toMatch(/^Total duration is 60 minutes/);
    expect(rules.join(' ')).not.toMatch(/54/);
  });
});
