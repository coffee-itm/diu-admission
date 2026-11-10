// Front door: routes to the mock implementation or the real API client based on VITE_USE_MOCKS.
// Unset (or any value other than the literal string 'false') defaults to mocks (context/17 §4).
import { resultService as mockResultService } from './mock/resultService.js';
import { resultService as realResultService } from './real/resultService.js';

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

export const resultService = useMocks ? mockResultService : realResultService;
