import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer.js';
import { useTestStore } from '../../store/testStore.js';

const examConfig = { id: 'e', totalTimeMinutes: 54, sections: [] };
const questions = [{ id: 'q1', section: 'MATH' }];

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00Z'));
    useTestStore.getState().resetSession();
    useTestStore.getState().initSession({ sessionId: 's', examConfig, questions });
  });
  afterEach(() => vi.useRealTimers());

  it('calls onExpire exactly once after the deadline', () => {
    const onExpire = vi.fn();
    renderHook(() => useTimer(onExpire));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(54 * 60 * 1000 + 5000); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(useTestStore.getState().timeRemaining).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('expires once for a restored session with a past deadline', () => {
    useTestStore.setState({ deadline: Date.now() - 60000, timeRemaining: 1000 });
    const onExpire = vi.fn();
    renderHook(() => useTimer(onExpire));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(useTestStore.getState().timeRemaining).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('resyncs on visibilitychange after the clock jumped', () => {
    renderHook(() => useTimer(vi.fn()));
    vi.setSystemTime(new Date('2026-06-15T10:10:00Z'));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(useTestStore.getState().timeRemaining).toBe(44 * 60);
  });
});
