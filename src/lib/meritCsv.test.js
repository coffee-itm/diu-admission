import { describe, it, expect } from 'vitest';
import { buildMeritRows, filterMeritByEligibility, MERIT_COLUMNS } from './meritCsv.js';
import { toCSV } from './csvExport.js';

describe('buildMeritRows', () => {
  const merit = [
    { candidateId: 'c1', candidateName: 'রহিম', candidateEmail: 'a@x.com', percentage: 80, totalScore: 40, timeTaken: 125, eligibility: 'ELIGIBLE', sectionPercentages: { MATH: 100 } },
    { candidateId: 'zz', candidateName: 'Ghost', candidateEmail: '', percentage: 50, timeTaken: 60, eligibility: 'ELIGIBLE' },
  ];
  const cands = [{ id: 'c1', phone: '01711-000001', program: 'CSE' }];

  it('joins phone and program by candidateId and ranks', () => {
    const rows = buildMeritRows(merit, cands);
    expect(rows[0]).toMatchObject({ rank: 1, phone: '01711-000001', program: 'CSE' });
    expect(rows[1]).toMatchObject({ rank: 2, phone: '', program: '' });
  });

  it('exports them in the CSV', () => {
    const csv = toCSV(buildMeritRows(merit, cands), MERIT_COLUMNS);
    expect(csv.split('\r\n')[1].startsWith('1,রহিম,a@x.com,01711-000001,CSE,40,80,100,')).toBe(true);
    expect(csv).toContain(',02:05,');
  });
});

describe('filterMeritByEligibility', () => {
  const list = [
    { candidateId: 'c1', eligibility: 'ELIGIBLE', rank: 1 },
    { candidateId: 'c2', eligibility: 'CONDITIONALLY_ELIGIBLE', rank: 2 },
    { candidateId: 'c3', eligibility: 'NOT_ELIGIBLE', rank: 3 },
    { candidateId: 'c4', eligibility: 'ELIGIBLE', rank: 4 },
  ];

  it('defaults to eligible + conditional and hides NOT_ELIGIBLE', () => {
    const rows = filterMeritByEligibility(list);
    expect(rows.map((r) => r.candidateId)).toEqual(['c1', 'c2', 'c4']);
  });

  it('also defaults to eligible + conditional when the filter is undefined', () => {
    expect(filterMeritByEligibility(list, undefined).map((r) => r.candidateId)).toEqual(['c1', 'c2', 'c4']);
  });

  it('"all" keeps every row', () => {
    expect(filterMeritByEligibility(list, 'all')).toHaveLength(4);
  });

  it.each([
    ['ELIGIBLE', ['c1', 'c4']],
    ['CONDITIONALLY_ELIGIBLE', ['c2']],
    ['NOT_ELIGIBLE', ['c3']],
  ])('keeps only %s rows', (filter, ids) => {
    expect(filterMeritByEligibility(list, filter).map((r) => r.candidateId)).toEqual(ids);
  });

  it('keeps the ranks computed on the full list (no re-ranking)', () => {
    expect(filterMeritByEligibility(list).map((r) => r.rank)).toEqual([1, 2, 4]);
    expect(filterMeritByEligibility(list, 'NOT_ELIGIBLE').map((r) => r.rank)).toEqual([3]);
  });

  it('builds a CSV of exactly the filtered rows', () => {
    const rows = filterMeritByEligibility(list.map((r) => ({ ...r, candidateName: r.candidateId })), 'ELIGIBLE');
    const csv = toCSV(rows, MERIT_COLUMNS);
    expect(csv.trim().split('\r\n')).toHaveLength(3);
    expect(csv).not.toContain('c2');
    expect(csv).not.toContain('c3');
  });
});
