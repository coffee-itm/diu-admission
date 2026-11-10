import { describe, it, expect, beforeEach } from 'vitest';
import { getAllCandidates, authService } from './authService.js';

describe('getAllCandidates', () => {
  beforeEach(() => localStorage.clear());

  it('returns only candidates, never passwords', () => {
    const list = getAllCandidates();
    expect(list.length).toBeGreaterThan(0);
    list.forEach((c) => {
      expect(c.role).toBe('candidate');
      expect(c).not.toHaveProperty('password');
    });
  });

  it('includes newly registered candidates', async () => {
    await authService.register({ name: 'New One', email: 'new.one@example.com', password: 'secret123' });
    const found = getAllCandidates().find((c) => c.email === 'new.one@example.com');
    expect(found).toBeTruthy();
    expect(found).not.toHaveProperty('password');
  });
});
