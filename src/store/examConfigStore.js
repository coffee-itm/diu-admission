import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockExamConfig } from '../data/mockExamConfig.js';

export const useExamConfigStore = create(
  persist(
    (set) => ({
      config: { ...mockExamConfig },

      updateConfig: (updates) =>
        set((state) => ({ config: { ...state.config, ...updates } })),

      updateSection: (sectionId, updates) =>
        set((state) => ({
          config: {
            ...state.config,
            sections: state.config.sections.map((s) =>
              s.id === sectionId ? { ...s, ...updates } : s
            ),
          },
        })),

      resetToDefault: () => set({ config: { ...mockExamConfig } }),
    }),
    {
      name: 'itm-exam-config',
      // One-level deep merge so configs persisted before new default fields existed gain them.
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        config: { ...current.config, ...(persisted?.config ?? {}) },
      }),
    }
  )
);
