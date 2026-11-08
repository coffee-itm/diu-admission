import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { RegisterPage } from './RegisterPage.jsx';
import { useAuthStore } from '../../store/authStore.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/candidate/dashboard" element={<div>Candidate Dashboard</div>} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RegisterPage redirect', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('sends an authenticated candidate to the candidate dashboard', () => {
    useAuthStore.setState({ user: { id: 'c1', role: 'candidate' }, isAuthenticated: true });

    renderAt('/register');

    expect(screen.getByText('Candidate Dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /create account/i })).not.toBeInTheDocument();
  });

  it('sends an authenticated admin to the admin dashboard', () => {
    useAuthStore.setState({ user: { id: 'a1', role: 'admin' }, isAuthenticated: true });

    renderAt('/register');

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });
});
