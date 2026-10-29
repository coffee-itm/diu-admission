import { describe, it, expect, beforeEach } from 'vitest';
import { useExamConfigStore } from '../store/examConfigStore.js';
import { useQuestionStore } from '../store/questionStore.js';
import { testService } from './testService.js';
import { mockQuestions } from '../data/mockQuestions.js';
import { mockExamConfig } from '../data/mockExamConfig.js';

describe('testService.submitTest', () => {
  beforeEach(() => localStorage.clear());

  const run = () => testService.submitTest({
    candidateId: 'cand_1',
    answers: {},
    questions: mockQuestions,
    examConfig: mockExamConfig,
    timeTaken: 100,
    antiCheat: { tabSwitchCount: 3, totalViolations: 3 },
  });

  it('persists the anti-cheat summary in the stored record', async () => {
    await run();
    const stored = JSON.parse(localStorage.getItem('diu-results'));
    expect(stored).toHaveLength(1);
    expect(stored[0].antiCheat.tabSwitchCount).toBe(3);
  });

  it('returns the record including antiCheat', async () => {
    const result = await run();
    expect(result.antiCheat.tabSwitchCount).toBe(3);
  });
});

describe('testService.loadTest', () => {
  beforeEach(() => {
    localStorage.clear();
    useExamConfigStore.getState().resetToDefault();
    useQuestionStore.setState({ questions: [...mockQuestions] });
  });

  const setCounts = (n) =>
    useExamConfigStore.getState().config.sections.forEach((s) =>
      useExamConfigStore.getState().updateSection(s.id, { questionCount: n })
    );

  it('serves questionCount per section without duplicates', async () => {
    setCounts(3);
    const { questions } = await testService.loadTest();
    expect(questions).toHaveLength(15);
    expect(new Set(questions.map((q) => q.id)).size).toBe(15);
    for (const s of useExamConfigStore.getState().config.sections) {
      expect(questions.filter((q) => q.section === s.id)).toHaveLength(3);
    }
  });

  it('includes a newly created bank question when the pool equals the count', async () => {
    const pool = mockQuestions.filter((q) => q.section === 'MATH').length;
    setCounts(1);
    useExamConfigStore.getState().updateSection('MATH', { questionCount: pool + 1 });
    const q = useQuestionStore.getState().create({
      section: 'MATH', text: 'New?', correctAnswer: 'a', difficulty: 'easy',
      options: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }],
    });
    const { questions } = await testService.loadTest();
    expect(questions.some((x) => x.id === q.id)).toBe(true);
  });

  it('returns the store config', async () => {
    useExamConfigStore.getState().updateConfig({ title: 'Changed title' });
    setCounts(1);
    const { examConfig } = await testService.loadTest();
    expect(examConfig.title).toBe('Changed title');
  });

  it('throws when a section pool is too small', async () => {
    useExamConfigStore.getState().updateSection('IT', { questionCount: 999 });
    await expect(testService.loadTest()).rejects.toThrow(/Not enough questions in section IT: need 999, have/);
  });

  it('keeps original option ids after shuffling', async () => {
    setCounts(3);
    const { questions } = await testService.loadTest();
    for (const q of questions) {
      const orig = mockQuestions.find((m) => m.id === q.id);
      expect(q.options.map((o) => o.id).sort()).toEqual(orig.options.map((o) => o.id).sort());
      for (const o of q.options) expect(orig.options.find((x) => x.id === o.id).text).toBe(o.text);
    }
  });
});
