import { mockCandidates, mockAdmins } from '../data/mockCandidates.js';
import { sleep, generateId } from '../lib/utils.js';

const getStoredCandidates = () => {
  try {
    const stored = localStorage.getItem('diu-candidates');
    return stored ? JSON.parse(stored) : [...mockCandidates];
  } catch {
    return [...mockCandidates];
  }
};

const storeCandidates = (candidates) => {
  localStorage.setItem('diu-candidates', JSON.stringify(candidates));
};

export const authService = {
  async login(email, password) {
    await sleep(600);
    const admin = mockAdmins.find((a) => a.email === email && a.password === password);
    if (admin) {
      const { password: _, ...safe } = admin;
      return { user: safe };
    }
    const candidates = getStoredCandidates();
    const candidate = candidates.find((c) => c.email === email && c.password === password);
    if (candidate) {
      const { password: _, ...safe } = candidate;
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
    const { password: _, ...safe } = newCandidate;
    return { user: safe };
  },
};
