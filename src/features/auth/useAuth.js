import { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { authService } from '../../services/authService.js';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { queryClient } from '../../lib/queryClient.js';
import { toast } from 'sonner';

// Clears every local trace of the session — auth, test and anti-cheat state, plus the react-query
// cache (context/17 §3, D-15) — so a second user on the same browser sees nothing of the first
// (FR-AUTH-04). A plain function, not a hook, so it can also run from non-component code.
export function resetAll() {
  useAuthStore.getState().logout();
  useTestStore.getState().resetSession();
  useAntiCheatStore.getState().reset();
  queryClient.clear();
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, login: setLogin } = useAuthStore();

  const login = async (email, password) => {
    try {
      setLoading(true);
      const { user } = await authService.login(email, password);
      setLogin(user);
      toast.success('Logged in successfully');
      return user;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    try {
      setLoading(true);
      const { user } = await authService.register(data);
      setLogin(user);
      toast.success('Registered successfully');
      return user;
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Local state clears synchronously first — a second user on this device must never see the
    // first's data, even if the network call below is slow or fails. The server-side revoke is
    // best-effort after that.
    resetAll();
    toast.info('Logged out');
    authService.logout().catch(() => {});
  };

  return { user, isAuthenticated, loading, login, register, logout };
}
