// Real implementation, routed through src/services/api.js. Endpoint map: context/15-api-spec.md §6.
// login/register/refresh set the in-memory access token (src/services/api.js) on success; logout
// clears it. authStore (T-050) only ever sees the `user`/`status` that result from these calls.
import { api, setAccessToken, clearAccessToken } from '../api.js';

export const authService = {
  async login(email, password) {
    const { user, accessToken } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setAccessToken(accessToken);
    return { user };
  },

  async register(data) {
    const { user, accessToken } = await api('/auth/register', { method: 'POST', body: data });
    setAccessToken(accessToken);
    return { user };
  },

  async refresh() {
    const { accessToken } = await api('/auth/refresh', { method: 'POST' });
    setAccessToken(accessToken);
    return accessToken;
  },

  async logout() {
    await api('/auth/logout', { method: 'POST' });
    clearAccessToken();
  },

  async me() {
    const { user } = await api('/auth/me');
    return user;
  },
};

// `getAllCandidates` (mock-only helper used by resultService/analyticsService to join candidate
// names) has no single-call equivalent in the real API: candidate lists come back already joined
// from /admin/candidates and /admin/merit-list (15 §6). Real-mode callers must not need this.
export function getAllCandidates() {
  throw new Error('getAllCandidates is mock-only; real mode gets candidate data already joined from /admin/*');
}
