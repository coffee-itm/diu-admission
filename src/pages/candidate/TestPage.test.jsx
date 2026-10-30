import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CandidateTestPage } from './TestPage.jsx';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';

const h = vi.hoisted(() => ({ engine: null }));

vi.mock('../../features/test/useTestEngine.js', () => ({
  useTestEngine: () => h.engine,
}));
vi.mock('../../features/test/useTimer.js', () => ({
  useTimer: () => ({ timeRemaining: 600 }),
}));
vi.mock('../../features/test/useAutoSave.js', () => ({
  useAutoSave: () => {},
}));
vi.mock('../../features/test/useAntiCheat.js', () => ({
  useAntiCheat: () => ({
    showWarning: false,
    warningMessage: '',
    dismissWarning: vi.fn(),
    returnToFullscreen: vi.fn(),
    isFullscreen: true,
  }),
}));

const question = (id) => ({
  id,
  section: 'MATH',
  text: `Question ${id}`,
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
  ],
});

function engineFor(currentQuestion) {
  return {
    sessionId: 's1',
    isSubmitted: false,
    currentQuestions: [currentQuestion],
    currentQuestion,
    currentSectionId: 'MATH',
    currentQuestionIndex: 0,
    answers: {},
    questionStatus: {},
    setAnswer: vi.fn(),
    toggleFlag: vi.fn(),
    goNext: vi.fn(),
    goPrev: vi.fn(),
    jumpTo: vi.fn(),
    submitTest: vi.fn(),
    loading: false,
    navigateTo: vi.fn(),
    isFirstOverall: true,
    isLastOverall: true,
    getQuestionsBySectionId: () => [currentQuestion],
    visitQuestion: vi.fn(),
  };
}

const renderPage = () => render(
  <MemoryRouter>
    <CandidateTestPage />
  </MemoryRouter>
);

describe('CandidateTestPage time-per-question tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T10:00:00.000Z'));
    useAntiCheatStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    useAntiCheatStore.getState().reset();
  });

  it('starts tracking the question on first load', () => {
    h.engine = engineFor(question('q1'));

    renderPage();

    const state = useAntiCheatStore.getState();
    expect(state.currentQuestionId).toBe('q1');
    expect(state.questionTimeMap.q1).toEqual({ totalMs: 0 });
  });

  it('moves tracking to the next question and banks time for the previous one', () => {
    h.engine = engineFor(question('q1'));
    const { rerender } = renderPage();

    vi.setSystemTime(new Date('2026-10-30T10:00:01.500Z'));
    h.engine = engineFor(question('q2'));
    rerender(
      <MemoryRouter>
        <CandidateTestPage />
      </MemoryRouter>
    );

    const state = useAntiCheatStore.getState();
    expect(state.currentQuestionId).toBe('q2');
    expect(state.questionTimeMap.q1).toEqual({ totalMs: 1500 });
    expect(state.questionTimeMap.q2).toEqual({ totalMs: 0 });
  });
});
