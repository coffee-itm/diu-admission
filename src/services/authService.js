// Front door: routes to the mock implementation or the real API client based on VITE_USE_MOCKS.
// Unset (or any value other than the literal string 'false') defaults to mocks, so the demo and the
// test suite keep working without a backend (context/17 §4). Call sites (pages, useAuth) are
// unaffected either way: both sides export the same `authService` shape and `getAllCandidates`.
import { authService as mockAuthService, getAllCandidates as mockGetAllCandidates } from './mock/authService.js';
import { authService as realAuthService, getAllCandidates as realGetAllCandidates } from './real/authService.js';

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

export const authService = useMocks ? mockAuthService : realAuthService;
export const getAllCandidates = useMocks ? mockGetAllCandidates : realGetAllCandidates;
