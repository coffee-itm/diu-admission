import { useExamConfigStore } from '../store/examConfigStore.js';
import { useQuestionStore } from '../store/questionStore.js';
import { mockResults } from '../data/mockResults.js';
import { shuffleArray, sleep, generateId } from '../lib/utils.js';
import { calculateScore } from '../lib/scoring.js';

export const testService = {
  async loadTest() {
    await sleep(500);
    const { config } = useExamConfigStore.getState();
    const { questions } = useQuestionStore.getState();
    // Sample questionCount per configured section, shuffling questions and options
    const sampled = config.sections.flatMap((section) => {
      const pool = questions.filter((q) => q.section === section.id);
      if (pool.length < section.questionCount) {
        throw new Error(
          `Not enough questions in section ${section.id}: need ${section.questionCount}, have ${pool.length}`
        );
      }
      return shuffleArray(pool)
        .slice(0, section.questionCount)
        .map((q) => ({ ...q, options: shuffleArray(q.options) }));
    });
    return {
      sessionId: generateId('session'),
      examConfig: config,
      questions: sampled,
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
