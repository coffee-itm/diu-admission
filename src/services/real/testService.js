// Real implementation, routed through src/services/api.js. Endpoint map: context/15-api-spec.md §6, §4.
// Same function names/arity as src/services/mock/testService.js so page call sites don't change (17 §4).
// loadTest/submitTest are not yet called by any page (the TestPage rebuild onto real sessions is S4+);
// they are written to the real contract now so that future card only has to point the page at them.
import { api } from '../api.js';

export const testService = {
  async loadTest() {
    return api('/sessions', { method: 'POST', body: { integrityAcceptedAt: new Date().toISOString() } });
  },

  async submitTest({ sessionId, seq, answers, flags, visited, timeDeltasMs, events, reason = 'manual' }) {
    return api(`/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: { seq, answers, flags, visited, timeDeltasMs, events, reason },
    });
  },

  async getResultForCandidate() {
    // 15 §4: /results/me is the current candidate's own result; it takes no candidateId (the
    // access token identifies the caller), unlike the mock signature which takes one for lookup.
    return api('/results/me');
  },
};
