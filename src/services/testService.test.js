import { describe, it, expect, beforeEach } from 'vitest';
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
    const stored = JSON.parse(localStorage.getItem('itm-results'));
    expect(stored).toHaveLength(1);
    expect(stored[0].antiCheat.tabSwitchCount).toBe(3);
  });

  it('returns the record including antiCheat', async () => {
    const result = await run();
    expect(result.antiCheat.tabSwitchCount).toBe(3);
  });
});
