// Front door: routes to the mock implementation or the real API client based on VITE_USE_MOCKS.
// Unset (or any value other than the literal string 'false') defaults to mocks (context/17 §4).
import { analyticsService as mockAnalyticsService, groupPerDay } from './mock/analyticsService.js';
import { analyticsService as realAnalyticsService } from './real/analyticsService.js';

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

export const analyticsService = useMocks ? mockAnalyticsService : realAnalyticsService;
export { groupPerDay };
