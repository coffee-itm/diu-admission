import { resultService } from './resultService.js';
import { mockCandidates } from '../data/mockCandidates.js';
import { SECTION_ORDER } from '../lib/constants.js';
import { sleep } from '../lib/utils.js';

export const analyticsService = {
  async getSummary() {
    await sleep(400);
    const results = await resultService.getAll();
    const storedCands = JSON.parse(localStorage.getItem('diu-candidates') || '[]');
    const totalRegistrations = mockCandidates.filter((c) => c.role === 'candidate').length + storedCands.filter((c) => c.role === 'candidate').length;
    const totalCompleted = results.length;
    const eligible = results.filter((r) => r.eligibility === 'ELIGIBLE').length;
    const passRate = totalCompleted > 0 ? Math.round((eligible / totalCompleted) * 100) : 0;
    const avgScore = totalCompleted > 0
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / totalCompleted * 10) / 10
      : 0;

    // Section averages
    const sectionAverages = {};
    for (const sid of SECTION_ORDER) {
      const scores = results.map((r) => r.sectionPercentages?.[sid] ?? 0);
      sectionAverages[sid] = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
        : 0;
    }

    // Eligibility distribution
    const eligibilityDist = {
      ELIGIBLE: results.filter((r) => r.eligibility === 'ELIGIBLE').length,
      CONDITIONALLY_ELIGIBLE: results.filter((r) => r.eligibility === 'CONDITIONALLY_ELIGIBLE').length,
      NOT_ELIGIBLE: results.filter((r) => r.eligibility === 'NOT_ELIGIBLE').length,
    };

    return { totalRegistrations, totalCompleted, passRate, avgScore, sectionAverages, eligibilityDist };
  },
};
