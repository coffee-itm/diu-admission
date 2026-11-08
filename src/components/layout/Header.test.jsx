import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Header } from './Header.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';

describe('Header logout', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().login({ id: 'c1', name: 'Test Candidate', role: 'candidate' });
    useTestStore.setState({
      sessionId: 's1', candidateId: 'c1', answers: { q1: 'a' }, isSubmitted: true,
      result: { totalScore: 5 },
    });
    useAntiCheatStore.setState({ tabSwitchCount: 3, copyAttemptCount: 2 });
  });

  it('clears test session and anti-cheat state', async () => {
    const initial = JSON.stringify(useTestStore.getInitialState());
    render(<MemoryRouter><Header /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /^logout$/i }));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(JSON.stringify(useTestStore.getState())).toBe(initial);
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(0);
    expect(useAntiCheatStore.getState().copyAttemptCount).toBe(0);

    const persisted = JSON.parse(localStorage.getItem('diu-test-session')).state;
    expect(persisted.answers).toEqual({});
    expect(persisted.result).toBeNull();
  });
});
