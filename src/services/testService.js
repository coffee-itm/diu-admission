// Front door: routes to the mock implementation or the real API client based on VITE_USE_MOCKS.
// Unset (or any value other than the literal string 'false') defaults to mocks (context/17 §4).
import { testService as mockTestService } from './mock/testService.js';
import { testService as realTestService } from './real/testService.js';

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

export const testService = useMocks ? mockTestService : realTestService;
