import { mockQuestions } from '../data/mockQuestions.js';
import { mockExamConfig } from '../data/mockExamConfig.js';
import { mockResults } from '../data/mockResults.js';
import { shuffleArray, sleep, generateId } from '../lib/utils.js';
import { calculateScore } from '../lib/scoring.js';
import { SECTION_ORDER } from '../lib/constants.js';

export const testService = {
  async loadTest() {
    await sleep(500);
    // Shuffle questions and their options per section
    const shuffled = SECTION_ORDER.flatMap((sectionId) => {
      const sectionQs = mockQuestions.filter((q) => q.section === sectionId);
      return shuffleArray(sectionQs).map((q) => ({
        ...q,
        options: shuffleArray(q.options),
      }));
    });
    return {
      sessionId: generateId('session'),
      examConfig: mockExamConfig,
      questions: shuffled,
    };
  },

  async submitTest({ candidateId, answers, questions, examConfig, timeTaken, antiCheat }) {
    await sleep(800);
    const result = calculateScore({ answers, questions, examConfig, timeTaken });
    const resultRecord = {
      id: generateId('res'),
      candidateId,
      examId: examConfig.id,
      submittedAt: new Date().toISOString(),
      timeTaken,
      ...result,
      antiCheat: antiCheat ?? null,
    };
    // Persist to localStorage
    const stored = JSON.parse(localStorage.getItem('itm-results') || '[]');
    stored.push(resultRecord);
    localStorage.setItem('itm-results', JSON.stringify(stored));
    return resultRecord;
  },

  async getResultForCandidate(candidateId) {
    await sleep(300);
    // Check localStorage first
    const stored = JSON.parse(localStorage.getItem('itm-results') || '[]');
    const found = stored.find((r) => r.candidateId === candidateId);
    if (found) return found;
    // Fallback to mock
    return mockResults.find((r) => r.candidateId === candidateId) || null;
  },
};
