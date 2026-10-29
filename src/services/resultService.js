import { mockResults } from '../data/mockResults.js';
import { mockCandidates } from '../data/mockCandidates.js';
import { sleep } from '../lib/utils.js';

const getAllResults = () => {
  const stored = JSON.parse(localStorage.getItem('itm-results') || '[]');
  const storedIds = new Set(stored.map((r) => r.candidateId));
  const filtered = mockResults.filter((r) => !storedIds.has(r.candidateId));
  return [...filtered, ...stored];
};

export const resultService = {
  async getAll() {
    await sleep(300);
    return getAllResults();
  },

  async getById(resultId) {
    await sleep(200);
    return getAllResults().find((r) => r.id === resultId) || null;
  },

  async getForCandidate(candidateId) {
    await sleep(200);
    return getAllResults().find((r) => r.candidateId === candidateId) || null;
  },

  async getMeritList() {
    await sleep(400);
    const results = getAllResults();
    const candidates = [
      ...mockCandidates,
      ...JSON.parse(localStorage.getItem('diu-candidates') || '[]'),
    ];
    const seen = new Set();
    return results
      .map((r) => {
        const cand = candidates.find((c) => c.id === r.candidateId);
        return { ...r, candidateName: cand?.name || 'Unknown', candidateEmail: cand?.email || '' };
      })
      .filter((r) => { if (seen.has(r.candidateId)) return false; seen.add(r.candidateId); return true; })
      .sort((a, b) => b.percentage - a.percentage)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  },
};
