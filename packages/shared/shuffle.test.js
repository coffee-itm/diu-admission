import { describe, it, expect } from 'vitest';
import { shuffle } from './shuffle.js';

// Small deterministic LCG so the expected order is stable.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('shuffle', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];

  it('returns a permutation and does not mutate the input', () => {
    const copy = [...input];
    const out = shuffle(input, seeded(1));
    expect(input).toEqual(copy);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it('is deterministic for the same seed', () => {
    expect(shuffle(input, seeded(42))).toEqual(shuffle(input, seeded(42)));
  });

  it('differs across seeds', () => {
    expect(shuffle(input, seeded(1))).not.toEqual(shuffle(input, seeded(2)));
  });

  it('uses the injected rng (rng = 0 rotates left by one)', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['a'])).toEqual(['a']);
  });
});
