import { describe, it, expect, beforeEach } from 'vitest';
import { analyticsService, groupPerDay } from './analyticsService.js';

describe('analyticsService.getSummary', () => {
  beforeEach(() => localStorage.clear());

  it('counts each mock registration once (16)', async () => {
    const s = await analyticsService.getSummary();
    expect(s.totalRegistrations).toBe(16);
  });

  it('exposes perDay derived from results', async () => {
    const s = await analyticsService.getSummary();
    expect(s.perDay.length).toBeGreaterThan(0);
  });
});

describe('groupPerDay', () => {
  it('groups results by local day, ascending, with counts', () => {
    const local = (d, h) => new Date(2026, 5, d, h, 0, 0).toISOString();
    const out = groupPerDay([
      { submittedAt: local(17, 15), percentage: 60 },
      { submittedAt: local(16, 10), percentage: 80 },
      { submittedAt: local(16, 12), percentage: 70 },
    ]);
    expect(out.map((d) => [d.date, d.count])).toEqual([['2026-06-16', 2], ['2026-06-17', 1]]);
    expect(out[0].avgScore).toBe(75);
  });

  it('keeps only the last 14 days', () => {
    const rs = Array.from({ length: 20 }, (_, i) => ({ submittedAt: new Date(2026, 5, i + 1, 12).toISOString(), percentage: 50 }));
    const out = groupPerDay(rs);
    expect(out).toHaveLength(14);
    expect(out[0].date).toBe('2026-06-07');
  });
});
