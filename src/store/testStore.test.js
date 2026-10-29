import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTestStore } from './testStore.js';

const examConfig = { id: 'e', totalTimeMinutes: 54, sections: [] };
const questions = [{ id: 'q1', section: 'MATH' }];

describe('testStore wall-clock timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00Z'));
    useTestStore.getState().resetSession();
    useTestStore.getState().initSession({ sessionId: 's', examConfig, questions });
  });
  afterEach(() => vi.useRealTimers());

  it('derives remaining time from the clock, not from ticks', () => {
    expect(useTestStore.getState().timeRemaining).toBe(54 * 60);
    vi.setSystemTime(new Date('2026-06-15T10:10:00Z'));
    useTestStore.getState().syncTime();
    expect(useTestStore.getState().timeRemaining).toBe(44 * 60);
  });

  it('clamps at 0 past the deadline', () => {
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    useTestStore.getState().syncTime();
    expect(useTestStore.getState().timeRemaining).toBe(0);
  });
});
