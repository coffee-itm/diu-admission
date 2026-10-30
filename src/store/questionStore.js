import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockQuestions } from '../data/mockQuestions.js';
import { generateId } from '../lib/utils.js';
import { STORAGE_KEYS } from '../lib/constants.js';

export const useQuestionStore = create(
  persist(
    (set, get) => ({
      questions: [...mockQuestions],

      getAll: () => get().questions,

      getById: (id) => get().questions.find((q) => q.id === id),

      getBySection: (sectionId) => get().questions.filter((q) => q.section === sectionId),

      create: (data) => {
        const newQ = { ...data, id: generateId('q') };
        set((state) => ({ questions: [...state.questions, newQ] }));
        return newQ;
      },

      update: (id, data) =>
        set((state) => ({
          questions: state.questions.map((q) => (q.id === id ? { ...q, ...data } : q)),
        })),

      remove: (id) =>
        set((state) => ({
          questions: state.questions.filter((q) => q.id !== id),
        })),
    }),
    { name: STORAGE_KEYS.QUESTIONS }
  )
);
