import { mockResults } from '../data/mockResults.js';
import { getAllCandidates } from './authService.js';
import { sleep } from '../lib/utils.js';
import { STORAGE_KEYS } from '../lib/constants.js';

const getAllResults = () => {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]');
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
    const candidates = getAllCandidates();
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
