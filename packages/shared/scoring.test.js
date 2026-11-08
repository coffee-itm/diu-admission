import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring.js';

const SECTIONS = ['MATH', 'LOGIC', 'IT', 'ENGLISH', 'BUSINESS'];

function makeConfig(sectionIds = SECTIONS, passingThresholds = {}) {
  return {
    sections: sectionIds.map((id) => ({ id })),
    passingThresholds: { overallMinPercent: 50, sectionMinPercent: 40, ...passingThresholds },
  };
}

// counts: { MATH: 10, ... } -> questions with correct answer 'b'
function makeQuestions(counts) {
  const out = [];
  for (const [section, n] of Object.entries(counts)) {
    for (let i = 1; i <= n; i++) {
      out.push({
        id: `q_${section}_${i}`,
        section,
        correctAnswer: 'b',
        options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id })),
      });
    }
  }
  return out;
}

// correct: { MATH: k, ... } -> first k questions of each section answered correctly
function makeAnswers(questions, correct) {
  const answers = {};
  const seen = {};
  for (const q of questions) {
    seen[q.section] = (seen[q.section] || 0) + 1;
    if (seen[q.section] <= (correct[q.section] || 0)) answers[q.id] = q.correctAnswer;
  }
  return answers;
}

function run(correctArr, { perSection = 10, thresholds } = {}) {
  const counts = Object.fromEntries(SECTIONS.map((s) => [s, perSection]));
  const questions = makeQuestions(counts);
  const correct = Object.fromEntries(SECTIONS.map((s, i) => [s, correctArr[i]]));
  return calculateScore({
    answers: makeAnswers(questions, correct),
    questions,
    examConfig: makeConfig(SECTIONS, thresholds),
  });
}

describe('calculateScore boundary table', () => {
  it('S1 exactly on both thresholds is ELIGIBLE', () => {
    const r = run([5, 5, 5, 5, 5]);
    expect(r.percentage).toBe(50);
    expect(r.eligibility).toBe('ELIGIBLE');
    expect(r.failedSections).toEqual([]);
  });

  it('S2 48% with no failed sections is CONDITIONALLY_ELIGIBLE', () => {
    const r = run([5, 5, 5, 5, 4]);
    expect(r.percentage).toBe(48);
    expect(r.eligibility).toBe('CONDITIONALLY_ELIGIBLE');
  });

  it('S3 section at exactly 40% is not failed', () => {
    const r = run([4, 4, 4, 4, 4]);
    expect(r.failedSections).toEqual([]);
    expect(r.eligibility).toBe('CONDITIONALLY_ELIGIBLE');
  });

  it('S4 high overall with 2 failed sections is CONDITIONALLY_ELIGIBLE', () => {
    const r = run([10, 10, 10, 3, 0]);
    expect(r.failedSections).toEqual(['ENGLISH', 'BUSINESS']);
    expect(r.eligibility).toBe('CONDITIONALLY_ELIGIBLE');
  });

  it('S5 3 failed sections is NOT_ELIGIBLE', () => {
    const r = run([10, 10, 3, 3, 3]);
    expect(r.failedSections).toHaveLength(3);
    expect(r.eligibility).toBe('NOT_ELIGIBLE');
  });

  it('S6 both rules failing is NOT_ELIGIBLE', () => {
    const r = run([10, 9, 0, 0, 0]);
    expect(r.percentage).toBe(38);
    expect(r.eligibility).toBe('NOT_ELIGIBLE');
  });

  it('S7 overall below 40% is NOT_ELIGIBLE', () => {
    const r = run([4, 4, 4, 4, 3]);
    expect(r.percentage).toBe(38);
    expect(r.failedSections).toHaveLength(1);
    expect(r.eligibility).toBe('NOT_ELIGIBLE');
  });

  it('S8 one failed section blocks ELIGIBLE', () => {
    const r = run([10, 10, 10, 10, 3]);
    expect(r.failedSections).toEqual(['BUSINESS']);
    expect(r.eligibility).toBe('CONDITIONALLY_ELIGIBLE');
  });

  it('S9 empty submission is NOT_ELIGIBLE with answeredCount 0', () => {
    const r = run([0, 0, 0, 0, 0]);
    expect(r.percentage).toBe(0);
    expect(r.failedSections).toHaveLength(5);
    expect(r.answeredCount).toBe(0);
    expect(r.eligibility).toBe('NOT_ELIGIBLE');
  });

  it.todo('S10 program override applied (R2)');

  it('S11 compares unrounded values (66.67% < 66.7)', () => {
    const questions = makeQuestions({ MATH: 3 });
    const r = calculateScore({
      answers: makeAnswers(questions, { MATH: 2 }),
      questions,
      examConfig: makeConfig(['MATH'], { overallMinPercent: 66.7 }),
    });
    expect(r.percentage).toBe(66.7);
    expect(r.eligibility).toBe('CONDITIONALLY_ELIGIBLE');
  });

  it.todo('S12 negative marking (R2)');

  it('S13 ignores answers that are not a valid option id', () => {
    const questions = makeQuestions({ MATH: 2 });
    const r = calculateScore({
      answers: { [questions[0].id]: 'z', [questions[1].id]: 'b' },
      questions,
      examConfig: makeConfig(['MATH']),
    });
    expect(r.totalScore).toBe(1);
    expect(r.answeredCount).toBe(1);
  });

  it('S14 ignores answers for question ids not in the paper', () => {
    const questions = makeQuestions({ MATH: 2 });
    const r = calculateScore({
      answers: { [questions[0].id]: 'b', q_unknown: 'b' },
      questions,
      examConfig: makeConfig(['MATH']),
    });
    expect(r.totalScore).toBe(1);
    expect(r.answeredCount).toBe(1);
  });

  it('reads conditional tier from config', () => {
    const r = run([5, 5, 5, 5, 4], { thresholds: { conditionalOverallMin: 49 } });
    expect(r.eligibility).toBe('NOT_ELIGIBLE');
    const r2 = run([10, 10, 10, 3, 0], { thresholds: { conditionalMaxFailedSections: 1 } });
    expect(r2.eligibility).toBe('NOT_ELIGIBLE');
  });
});
