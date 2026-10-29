import { STORAGE_KEYS } from './constants.js';

// Legacy (pre university-wide pivot) key -> current key.
export const LEGACY_KEY_MAP = {
  'itm-auth': STORAGE_KEYS.AUTH,
  'itm-test-session': STORAGE_KEYS.TEST_SESSION,
  'itm-anti-cheat': STORAGE_KEYS.ANTI_CHEAT,
  'itm-exam-config': STORAGE_KEYS.EXAM_CONFIG,
  'itm-results': STORAGE_KEYS.RESULTS,
  'itm-lang': STORAGE_KEYS.LANG,
};

// One-time, idempotent: copy old -> new unless new exists, then drop old.
export function migrateStorageKeys() {
  try {
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
      const value = localStorage.getItem(oldKey);
      if (value === null) continue;
      if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  } catch {
    // storage unavailable; nothing to migrate
  }
}
