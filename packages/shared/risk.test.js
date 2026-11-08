import { describe, expect, it } from 'vitest';
import { computeRisk } from './risk.js';

describe('computeRisk (FR-AC-06)', () => {
  it.each([
    [3.5, { tabSwitch: 1, rightClick: 1, copy: 1 }, 'low'],
    [4, { tabSwitch: 2 }, 'medium'],
    [9.5, { tabSwitch: 2, devtools: 1, copy: 2.5 }, 'medium'],
    [10, { devtools: 2, tabSwitch: 2 }, 'high'],
  ])('classifies score %s as %s', (score, counts, level) => {
    expect(computeRisk(counts).score).toBe(score);
    expect(computeRisk(counts).level).toBe(level);
  });

  it.each([
    ['tabSwitch', 2], ['fullscreenExit', 2], ['devtools', 3], ['copy', 1],
    ['paste', 1], ['cut', 1], ['rightClick', 0.5], ['blockedKey', 0.5],
  ])('applies the weight for %s', (key, score) => {
    expect(computeRisk({ [key]: 1 }).score).toBe(score);
  });

  it('flags only when over 30% of answered questions took under 3000 ms', () => {
    const ids = Array.from({ length: 100 }, (_, i) => String(i));
    const times = Object.fromEntries(ids.map((id, i) => [id, i < 30 ? 2500 : 3000]));
    expect(computeRisk({}, times, ids).fastAnswers).toBe(false);
    times['30'] = 2500;
    expect(computeRisk({}, times, ids).fastAnswers).toBe(true);
  });
});
