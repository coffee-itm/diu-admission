import { describe, it, expect } from 'vitest';
import { buildMeritRows, MERIT_COLUMNS } from './meritCsv.js';
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
