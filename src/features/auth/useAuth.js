import { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { authService } from '../../services/authService.js';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { toast } from 'sonner';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, login: setLogin, logout: setLogout } = useAuthStore();

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
    setLogout();
    useTestStore.getState().resetSession();
    useAntiCheatStore.getState().reset();
    toast.info('Logged out');
  };

  return { user, isAuthenticated, loading, login, register, logout };
}
