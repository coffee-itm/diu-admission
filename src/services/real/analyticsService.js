// Real implementation, routed through src/services/api.js. Endpoint map: context/15-api-spec.md §6.
// Same function name as src/services/mock/analyticsService.js so page call sites don't change (17 §4).
import { api } from '../api.js';

export const analyticsService = {
  async getSummary() {
    return api('/admin/analytics/summary');
  },
};
