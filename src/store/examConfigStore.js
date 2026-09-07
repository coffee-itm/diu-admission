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
    { name: 'itm-exam-config' }
  )
);
