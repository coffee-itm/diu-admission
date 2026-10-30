import { describe, it, expect, beforeEach } from 'vitest';
import { useExamConfigStore } from './examConfigStore.js';
import { mockExamConfig } from '../data/mockExamConfig.js';

describe('examConfigStore persist merge', () => {
  beforeEach(() => localStorage.clear());

  it('adds missing default fields and keeps persisted edits', async () => {
    const old = { ...mockExamConfig };
    delete old.instructions;
    localStorage.setItem(
      'diu-exam-config',
      JSON.stringify({ state: { config: { ...old, title: 'Custom Title' } }, version: 0 })
    );
    await useExamConfigStore.persist.rehydrate();
    const { config } = useExamConfigStore.getState();
    expect(config.title).toBe('Custom Title');
    expect(config.instructions).toEqual(mockExamConfig.instructions);
  });
});
