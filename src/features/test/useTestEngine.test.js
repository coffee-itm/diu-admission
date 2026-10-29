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

describe('useTestEngine navigation', () => {
  const qs = [
    { id: 'm1', section: 'MATH', options: [] },
    { id: 'm2', section: 'MATH', options: [] },
    { id: 'l1', section: 'LOGIC', options: [] },
    { id: 'l2', section: 'LOGIC', options: [] },
  ];
  beforeEach(() => {
    useTestStore.getState().initSession({ sessionId: 's2', examConfig, questions: qs });
  });

  it('Next from the last MATH question goes to the first LOGIC question', () => {
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    expect(result.current.isFirstOverall).toBe(true);
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    expect(useTestStore.getState().currentSectionId).toBe('LOGIC');
    expect(useTestStore.getState().currentQuestionIndex).toBe(0);
    expect(result.current.isFirstOverall).toBe(false);
  });

  it('Prev from the first LOGIC question goes to the last MATH question', () => {
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    act(() => useTestStore.getState().navigateTo('LOGIC', 0));
    act(() => result.current.goPrev());
    expect(useTestStore.getState().currentSectionId).toBe('MATH');
    expect(useTestStore.getState().currentQuestionIndex).toBe(1);
  });

  it('flags the very last question only', () => {
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    expect(result.current.isLastOverall).toBe(false);
    act(() => useTestStore.getState().navigateTo('LOGIC', 1));
    expect(result.current.isLastOverall).toBe(true);
  });
});

describe('useTestEngine.startTest', () => {
  let loadSpy;
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: { id: 'cand-1' } });
    useTestStore.getState().resetSession();
    loadSpy = vi.spyOn(testService, 'loadTest').mockResolvedValue({
      sessionId: 'new',
      examConfig,
      questions,
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useTestStore.getState().resetSession();
  });

  it('resumes the same user active session without loading a new one', async () => {
    useTestStore.getState().initSession({ sessionId: 'old', candidateId: 'cand-1', examConfig, questions });
    useTestStore.getState().setAnswer('q1', 'a');
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    await act(async () => { await result.current.startTest(); });
    expect(loadSpy).not.toHaveBeenCalled();
    expect(useTestStore.getState().sessionId).toBe('old');
    expect(useTestStore.getState().answers).toMatchObject({ q1: 'a' });
  });

  it('blocks a second attempt', async () => {
    localStorage.setItem('diu-results', JSON.stringify([{ id: 'r1', candidateId: 'cand-1' }]));
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    await act(async () => { await result.current.startTest(); });
    expect(loadSpy).not.toHaveBeenCalled();
    expect(useTestStore.getState().sessionId).toBeNull();
  });

  it('starts a new session when no attempt exists, and never resumes another user session', async () => {
    useTestStore.getState().initSession({ sessionId: 'other', candidateId: 'cand-2', examConfig, questions });
    const { result } = renderHook(() => useTestEngine(), { wrapper });
    await act(async () => { await result.current.startTest(); });
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(useTestStore.getState().sessionId).toBe('new');
    expect(useTestStore.getState().candidateId).toBe('cand-1');
  });
});
