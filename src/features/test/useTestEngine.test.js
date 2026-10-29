import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router';
import { useTestEngine } from './useTestEngine.js';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { testService } from '../../services/testService.js';

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

const wrapper = ({ children }) => createElement(MemoryRouter, null, children);

const examConfig = { id: 'exam', totalTimeMinutes: 54, sections: [] };
const questions = [
  { id: 'q1', section: 'MATH', correctAnswer: 'a', options: [{ id: 'a', text: 'x' }] },
];

describe('useTestEngine.submitTest', () => {
  let spy;
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'cand-1' } });
    useAntiCheatStore.getState().reset();
    useTestStore.getState().initSession({ sessionId: 's1', examConfig, questions });
    spy = vi.spyOn(testService, 'submitTest').mockResolvedValue({ id: 'res-1', totalScore: 1 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits the latest answers even from a stale function', async () => {
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    const stale = result.current.submitTest;
    act(() => useTestStore.getState().setAnswer('q1', 'a'));
    await act(async () => {
      await stale();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].answers).toMatchObject({ q1: 'a' });
    expect(useTestStore.getState().isSubmitted).toBe(true);
  });

  it('ignores a second call while the first is in flight', async () => {
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    await act(async () => {
      await Promise.all([result.current.submitTest(), result.current.submitTest()]);
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
