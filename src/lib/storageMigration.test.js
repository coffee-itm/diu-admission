import { describe, it, expect, beforeEach } from 'vitest';
import { migrateStorageKeys } from './storageMigration.js';

describe('migrateStorageKeys', () => {
  beforeEach(() => localStorage.clear());

  it('copies old keys to new and removes old', () => {
    localStorage.setItem('itm-auth', 'A');
    localStorage.setItem('itm-results', 'R');
    migrateStorageKeys();
    expect(localStorage.getItem('diu-auth')).toBe('A');
    expect(localStorage.getItem('diu-results')).toBe('R');
    expect(localStorage.getItem('itm-auth')).toBeNull();
    expect(localStorage.getItem('itm-results')).toBeNull();
  });

  it('never overwrites an existing new key', () => {
    localStorage.setItem('itm-lang', 'bn');
    localStorage.setItem('diu-lang', 'en');
    migrateStorageKeys();
    expect(localStorage.getItem('diu-lang')).toBe('en');
    expect(localStorage.getItem('itm-lang')).toBeNull();
  });

  it('is safe to run twice', () => {
    localStorage.setItem('itm-exam-config', 'C');
    migrateStorageKeys();
    migrateStorageKeys();
    expect(localStorage.getItem('diu-exam-config')).toBe('C');
    expect(localStorage.length).toBe(1);
  });
});
