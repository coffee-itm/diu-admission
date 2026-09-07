import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';

export function AuthProvider({ children }) {
  // The persist middleware handles rehydration automatically
  // We just need a component to wrap the app if we want to run any init logic
  
  useEffect(() => {
    // We could verify token validity here if we had a real backend
  }, []);

  return <>{children}</>;
}
