import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth.js';
import { useAuthStore } from '../../store/authStore.js';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

describe('useAuth.logout', () => {
  it('clears the test session and anti-cheat state', () => {
    useAuthStore.setState({ user: { id: 'c1' }, isAuthenticated: true });
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
  });
});
