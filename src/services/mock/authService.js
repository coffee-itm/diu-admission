import { mockCandidates, mockAdmins } from '../../data/mockCandidates.js';
import { sleep, generateId } from '../../lib/utils.js';
import { STORAGE_KEYS } from '../../lib/constants.js';

// There is no real server session offline, so refresh/me simulate one from whatever authStore
// already persisted under STORAGE_KEYS.AUTH (T-050): AuthProvider's restore-on-mount flow (try
// refresh, then me) needs the same two-call shape in both modes to stay mode-agnostic.
const readSessionUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    return raw ? (JSON.parse(raw)?.state?.user ?? null) : null;
  } catch {
    return null;
  }
};

const getStoredCandidates = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
    return stored ? JSON.parse(stored) : [...mockCandidates];
  } catch {
    return [...mockCandidates];
  }
};

const storeCandidates = (candidates) => {
  localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
};

const stripPassword = (u) => Object.fromEntries(Object.entries(u).filter(([k]) => k !== 'password'));

const findUserById = (id) => {
  const admin = mockAdmins.find((a) => a.id === id);
  if (admin) return stripPassword(admin);
  const candidate = getStoredCandidates().find((c) => c.id === id);
  return candidate ? stripPassword(candidate) : null;
};

export const getAllCandidates = () =>
  getStoredCandidates().filter((c) => c.role === 'candidate').map(stripPassword);

export const authService = {
  async login(email, password) {
    await sleep(600);
    const admin = mockAdmins.find((a) => a.email === email && a.password === password);
    if (admin) {
      const safe = stripPassword(admin);
      return { user: safe };
    }
    const candidates = getStoredCandidates();
    const candidate = candidates.find((c) => c.email === email && c.password === password);
    if (candidate) {
      const safe = stripPassword(candidate);
      return { user: safe };
    }
    throw new Error('Invalid email or password.');
  },

  async register(data) {
    await sleep(700);
    const candidates = getStoredCandidates();
    if (candidates.find((c) => c.email === data.email)) {
      throw new Error('An account with this email already exists.');
    }
    const newCandidate = {
      id: generateId('cand'),
      ...data,
      role: 'candidate',
      registeredAt: new Date().toISOString(),
      attemptCount: 0,
    };
    candidates.push(newCandidate);
    storeCandidates(candidates);
    const safe = stripPassword(newCandidate);
    return { user: safe };
  },

  async refresh() {
    await sleep(200);
    if (!readSessionUser()) throw new Error('No active session.');
    return 'mock-token';
  },

  async logout() {
    await sleep(200);
    // Nothing server-side to revoke offline; the caller clears local state regardless.
  },

  async me() {
    await sleep(200);
    const sessionUser = readSessionUser();
    if (!sessionUser) throw new Error('No active session.');
    return findUserById(sessionUser.id) ?? sessionUser;
  },
};
