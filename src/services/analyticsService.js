import { resultService } from './resultService.js';
import { getAllCandidates } from './authService.js';
import { SECTION_ORDER } from '../lib/constants.js';
import { sleep } from '../lib/utils.js';

const pad = (n) => String(n).padStart(2, '0');
const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Results per local submission date (YYYY-MM-DD): last 14 days with data, ascending.
export function groupPerDay(results) {
  const days = {};
  for (const r of results) {
    if (!r.submittedAt) continue;
    const day = localDay(r.submittedAt);
    (days[day] ||= []).push(r.percentage ?? 0);
  }
  return Object.keys(days)
    .sort()
    .slice(-14)
    .map((date) => ({
      date,
      count: days[date].length,
      avgScore: Math.round(days[date].reduce((a, b) => a + b, 0) / days[date].length),
    }));
}

export const analyticsService = {
  async getSummary() {
    await sleep(400);
    const results = await resultService.getAll();
    const totalRegistrations = getAllCandidates().length;
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

    return { totalRegistrations, totalCompleted, passRate, avgScore, sectionAverages, eligibilityDist, perDay: groupPerDay(results) };
  },
};
