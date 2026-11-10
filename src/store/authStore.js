import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../lib/constants.js';

// context/17 §3: the access token lives in memory only, in src/services/api.js — never here, never
// persisted. This store only ever holds `user` + `status`. `isAuthenticated` is kept as a plain
// field in lockstep with `status` (not a derived getter) so existing call sites that destructure it
// straight off useAuthStore() (Header, useTestEngine, LoginPage/RegisterPage redirects) stay correct.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      // 'unknown' until AuthProvider confirms (or fails to confirm) the session with the server on
      // mount via refresh + me; 'authed' | 'guest' after that settles. ProtectedRoute only treats
      // 'authed' as let-in.
      status: 'unknown',
      isAuthenticated: false,

      login: (user) => set({ user, status: 'authed', isAuthenticated: true }),
      logout: () => set({ user: null, status: 'guest', isAuthenticated: false }),
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: STORAGE_KEYS.AUTH,
      // Only `user` is ever written to storage going forward.
      partialize: (state) => ({ user: state.user }),
      // Explicit allowlist merge, not the default shallow spread: a blob from the pre-T-050
      // prototype shape (`{user, isAuthenticated}`), or any future shape that smuggled a token-like
      // field into storage, must never resurrect `isAuthenticated`/`status`/a token (the S1 retro
      // rule). Only `user` ever crosses the boundary; `status` always starts 'unknown' so
      // AuthProvider re-validates with the server before anything trusts it.
      merge: (persisted, current) => ({
        ...current,
        user: persisted && typeof persisted === 'object' ? (persisted.user ?? null) : null,
      }),
    }
  )
);
