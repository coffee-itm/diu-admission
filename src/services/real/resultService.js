// Real implementation, routed through src/services/api.js. Endpoint map: context/15-api-spec.md §6.
// Same function names as src/services/mock/resultService.js so page call sites don't change (17 §4).
import { api } from '../api.js';

export const resultService = {
  async getAll() {
    const { items } = await api('/admin/candidates');
    return items;
  },

  async getById(resultId) {
    return api(`/admin/candidates/${resultId}`);
  },

  async getForCandidate(candidateId) {
    return api(`/admin/candidates/${candidateId}`);
  },

  async getMeritList() {
    const { items } = await api('/admin/merit-list');
    return items;
  },
};
