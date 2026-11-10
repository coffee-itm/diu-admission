import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { useAuthStore } from './authStore.js';

const user = { id: 'c1', name: 'Test Candidate', role: 'candidate' };

describe('authStore status + isAuthenticated', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, status: 'unknown', isAuthenticated: false });
  });

  it('starts unknown until AuthProvider settles it', () => {
    expect(useAuthStore.getState().status).toBe('unknown');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('login sets status authed and isAuthenticated true', () => {
    useAuthStore.getState().login(user);
    expect(useAuthStore.getState().status).toBe('authed');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('logout sets status guest and clears the user', () => {
    useAuthStore.getState().login(user);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe('guest');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('authStore persistence (context/17 §3: user persisted, token never)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, status: 'unknown', isAuthenticated: false });
  });

  it('AC1: after login, diu-auth holds the user and no token, nor status/isAuthenticated', () => {
    useAuthStore.getState().login(user);
    const raw = localStorage.getItem('diu-auth');
    expect(raw).not.toBeNull();
    expect(raw.toLowerCase()).not.toContain('token');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ state: { user }, version: 0 });
  });

  it('a repo-wide grep finds no source file writing a token to localStorage/sessionStorage', () => {
    const offenders = [];
    for (const file of collectSourceFiles(join(import.meta.dirname, '..'))) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/\.setItem\(/.test(line)) return;
        const context = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
        if (/token/i.test(context)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('AC5: an old prototype blob ({user, isAuthenticated}, no status) loads without crashing and without restoring a token', async () => {
    localStorage.setItem(
      'diu-auth',
      JSON.stringify({
        state: { user, isAuthenticated: true, accessToken: 'leftover-prototype-token' },
        version: 0,
      })
    );

    await expect(useAuthStore.persist.rehydrate()).resolves.not.toThrow();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    // The old isAuthenticated/accessToken fields must not cross the merge boundary: status stays
    // 'unknown' so AuthProvider re-validates with the server, and isAuthenticated is not resurrected.
    expect(state.status).toBe('unknown');
    expect(state.isAuthenticated).toBe(false);
    expect(state).not.toHaveProperty('accessToken');
  });

  it('a malformed/garbage persisted blob does not crash rehydration', async () => {
    localStorage.setItem('diu-auth', 'not json at all');
    await expect(useAuthStore.persist.rehydrate()).resolves.not.toThrow();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unknown');
  });
});

function collectSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (
      ['.js', '.jsx'].includes(extname(entry)) &&
      !entry.endsWith('.test.js') &&
      !entry.endsWith('.test.jsx')
    ) {
      acc.push(full);
    }
  }
  return acc;
}
