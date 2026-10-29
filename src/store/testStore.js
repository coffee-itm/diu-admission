import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QUESTION_STATUS } from '../lib/constants.js';

const initialState = {
  sessionId: null,
  examConfig: null,
  questions: [],        // shuffled questions for this session
  answers: {},          // { questionId: optionId }
  questionStatus: {},   // { questionId: QUESTION_STATUS }
  currentSectionId: null,
  currentQuestionIndex: 0,
  startedAt: null,
  submittedAt: null,
  isSubmitted: false,
  deadline: null,       // epoch ms; source of truth for remaining time
  timeRemaining: 0,     // seconds, derived from deadline via syncTime()
  result: null,
};

export const useTestStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      initSession: ({ sessionId, examConfig, questions }) => {
        const totalSeconds = examConfig.totalTimeMinutes * 60;
        const statusMap = {};
        questions.forEach((q) => { statusMap[q.id] = QUESTION_STATUS.NOT_VISITED; });
        set({
          ...initialState,
          sessionId,
          examConfig,
          questions,
          questionStatus: statusMap,
          currentSectionId: questions[0]?.section ?? null,
          currentQuestionIndex: 0,
          startedAt: new Date().toISOString(),
          deadline: Date.now() + totalSeconds * 1000,
          timeRemaining: totalSeconds,
          isSubmitted: false,
          result: null,
        });
      },

      setAnswer: (questionId, optionId) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: optionId },
          questionStatus: {
            ...state.questionStatus,
            [questionId]: optionId ? QUESTION_STATUS.ANSWERED : QUESTION_STATUS.SKIPPED,
          },
        })),

      setQuestionStatus: (questionId, status) =>
        set((state) => ({
          questionStatus: { ...state.questionStatus, [questionId]: status },
        })),

      visitQuestion: (questionId) =>
        set((state) => {
          const current = state.questionStatus[questionId];
          if (current === QUESTION_STATUS.NOT_VISITED) {
            return { questionStatus: { ...state.questionStatus, [questionId]: QUESTION_STATUS.SKIPPED } };
          }
          return {};
        }),

      toggleFlag: (questionId) =>
        set((state) => {
          const current = state.questionStatus[questionId];
          const next = current === QUESTION_STATUS.FLAGGED
            ? (state.answers[questionId] ? QUESTION_STATUS.ANSWERED : QUESTION_STATUS.SKIPPED)
            : QUESTION_STATUS.FLAGGED;
          return { questionStatus: { ...state.questionStatus, [questionId]: next } };
        }),

      navigateTo: (sectionId, questionIndex) =>
        set({ currentSectionId: sectionId, currentQuestionIndex: questionIndex }),

      syncTime: () =>
        set((state) => {
          if (!state.sessionId || state.isSubmitted) return {};
          // Session persisted before deadlines existed: derive one from the stored remaining time.
          const deadline = state.deadline ?? Date.now() + state.timeRemaining * 1000;
          const timeRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          if (deadline === state.deadline && timeRemaining === state.timeRemaining) return {};
          return { deadline, timeRemaining };
        }),

      submitTest: (result) =>
        set({ isSubmitted: true, submittedAt: new Date().toISOString(), result }),

      resetSession: () => set(initialState),

      getQuestionsBySectionId: (sectionId) => {
        const { questions } = get();
        return questions.filter((q) => q.section === sectionId);
      },
    }),
    { name: 'itm-test-session' }
  )
);
