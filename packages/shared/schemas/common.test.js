import { describe, expect, it } from 'vitest';
import { objectIdString, percent } from './common.js';

describe('common schemas', () => {
  it('accepts percentages from 0 through 100 only', () => {
    expect(percent.safeParse(0).success).toBe(true);
    expect(percent.safeParse(100).success).toBe(true);
    expect(percent.safeParse(-1).success).toBe(false);
    expect(percent.safeParse(101).success).toBe(false);
  });

  it('accepts exactly 24 hexadecimal characters as an object id', () => {
    expect(objectIdString.safeParse('0123456789abcdefABCDEF01').success).toBe(true);
    expect(objectIdString.safeParse('0123456789abcdef').success).toBe(false);
    expect(objectIdString.safeParse('g123456789abcdefABCDEF01').success).toBe(false);
  });
});
