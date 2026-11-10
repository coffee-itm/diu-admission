// AC5: with VITE_USE_MOCKS=true (and when unset, the default) the front doors must never call fetch.
// import.meta.env is read once at module-eval time, so this only proves the *current* test env (unset
// → mocks); see each service file for the explicit `=== 'false'` switch that selects the real path.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authService, getAllCandidates } from './authService.js';
import { testService } from './testService.js';
import { resultService } from './resultService.js';
import { analyticsService } from './analyticsService.js';

describe('mock mode never calls fetch (VITE_USE_MOCKS unset, default)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('fetch must not be called in mock mode'); }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('authService.login resolves without fetching', async () => {
    const { user } = await authService.login('demo@candidate.com', 'Test@1234');
    expect(user).toBeTruthy();
  });

  it('getAllCandidates resolves without fetching', () => {
    expect(getAllCandidates().length).toBeGreaterThan(0);
  });

  it('resultService.getAll resolves without fetching', async () => {
    await expect(resultService.getAll()).resolves.toBeInstanceOf(Array);
  });

  it('analyticsService.getSummary resolves without fetching', async () => {
    await expect(analyticsService.getSummary()).resolves.toHaveProperty('totalRegistrations');
  });

  it('testService.getResultForCandidate resolves without fetching', async () => {
    await expect(testService.getResultForCandidate('cand_1')).resolves.not.toThrow;
  });
});
