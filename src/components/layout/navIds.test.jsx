import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';
import { navItems } from './navItems.js';
import { useAuthStore } from '../../store/authStore.js';

describe('admin nav ids', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().login({ id: 'a1', name: 'Admin User', role: 'admin' });
  });

  it('navItems each have a unique, non-empty derived id', () => {
    const ids = navItems.map((item) => item.id);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every Sidebar nav link has a unique stable id', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    const links = container.querySelectorAll('nav a');
    expect(links.length).toBe(navItems.length);
    const ids = Array.from(links).map((link) => link.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    navItems.forEach((item) => {
      expect(container.querySelector(`#nav-sidebar-${item.id}`)).not.toBeNull();
    });
  });

  it('every interactive element in the admin Header (desktop + mobile menu) has a unique id', async () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    const user = userEvent.setup();
    const toggle = container.querySelector('#nav-mobile-menu-btn');
    await user.click(toggle);

    const interactive = container.querySelectorAll('a, button');
    const ids = Array.from(interactive).map((el) => el.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);

    navItems.forEach((item) => {
      expect(container.querySelector(`#nav-mobile-${item.id}`)).not.toBeNull();
    });
  });
});
