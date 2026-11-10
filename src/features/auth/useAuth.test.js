import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth, resetAll } from './useAuth.js';
import { useAuthStore } from '../../store/authStore.js';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { queryClient } from '../../lib/queryClient.js';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const logoutSpy = vi.fn(() => Promise.resolve());
vi.mock('../../services/authService.js', () => ({
  authService: { logout: (...args) => logoutSpy(...args) },
}));

describe('useAuth.logout', () => {
  beforeEach(() => {
    logoutSpy.mockClear();
    queryClient.clear();
  });

  it('clears the test session and anti-cheat state', () => {
    useAuthStore.setState({ user: { id: 'c1' }, status: 'authed', isAuthenticated: true });
    useTestStore.getState().initSession({
      sessionId: 's1',
      candidateId: 'c1',
      examConfig: { totalTimeMinutes: 1 },
      questions: [{ id: 'q1', section: 'MATH' }],
    });
    useAntiCheatStore.setState({ tabSwitchCount: 3 });
    const { result } = renderHook(() => useAuth());
    act(() => result.current.logout());
    expect(useTestStore.getState().sessionId).toBeNull();
    expect(useTestStore.getState().candidateId).toBeNull();
    expect(useTestStore.getState().questions).toEqual([]);
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().status).toBe('guest');
  });

  it('clears the react-query cache on logout (D-15, context/17 §3)', () => {
    queryClient.setQueryData(['cycle', 'current'], { id: 'cyc1' });
    const { result } = renderHook(() => useAuth());
    act(() => result.current.logout());
    expect(queryClient.getQueryData(['cycle', 'current'])).toBeUndefined();
  });

  it('clears local state synchronously and best-effort revokes the server session after', () => {
    useAuthStore.setState({ user: { id: 'c1' }, status: 'authed', isAuthenticated: true });
    const { result } = renderHook(() => useAuth());
    act(() => result.current.logout());
    // Local state is already gone by the time logout() returns — a second user on this device must
    // never have to wait on a network call to see a clean slate.
    expect(useAuthStore.getState().status).toBe('guest');
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it('resetAll clears auth, test, anti-cheat and the query cache standalone', () => {
    useAuthStore.setState({ user: { id: 'c1' }, status: 'authed', isAuthenticated: true });
    useTestStore.getState().initSession({
      sessionId: 's1',
      candidateId: 'c1',
      examConfig: { totalTimeMinutes: 1 },
      questions: [{ id: 'q1', section: 'MATH' }],
    });
    useAntiCheatStore.setState({ tabSwitchCount: 2 });
    queryClient.setQueryData(['programs'], []);

    resetAll();

    expect(useAuthStore.getState().status).toBe('guest');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useTestStore.getState().sessionId).toBeNull();
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(0);
    expect(queryClient.getQueryData(['programs'])).toBeUndefined();
  });
});
