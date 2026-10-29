import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../lib/constants.js';

export const useAntiCheatStore = create(
  persist(
    (set, get) => ({
      // Counters
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
      copyAttemptCount: 0,
      rightClickCount: 0,
      blockedKeyCount: 0,
      devtoolsDetectedCount: 0,

      // Event log: array of { type, timestamp, detail }
      securityEvents: [],
      
      // Integrity declaration
      integrityAgreedAt: null,

      // Time tracking per question: { questionId: { enteredAt, totalMs } }
      questionTimeMap: {},
      currentQuestionId: null,
      currentQuestionEnteredAt: null,

      // Actions
      logEvent: (type, detail = '') => set((state) => ({
        securityEvents: [
          ...state.securityEvents,
          { type, timestamp: new Date().toISOString(), detail }
        ],
      })),

      incrementTabSwitch: () => set((state) => {
        const count = state.tabSwitchCount + 1;
        return {
          tabSwitchCount: count,
          securityEvents: [
            ...state.securityEvents,
            { type: 'tab_switch', timestamp: new Date().toISOString(), detail: `Switch #${count}` }
          ],
        };
      }),

      incrementFullscreenExit: () => set((state) => {
        const count = state.fullscreenExitCount + 1;
        return {
          fullscreenExitCount: count,
          securityEvents: [
            ...state.securityEvents,
            { type: 'fullscreen_exit', timestamp: new Date().toISOString(), detail: `Exit #${count}` }
          ],
        };
      }),

      incrementCopyAttempt: () => set((state) => ({
        copyAttemptCount: state.copyAttemptCount + 1,
      })),

      incrementRightClick: () => set((state) => ({
        rightClickCount: state.rightClickCount + 1,
      })),

      incrementBlockedKey: () => set((state) => ({
        blockedKeyCount: state.blockedKeyCount + 1,
      })),

      incrementDevtools: () => set((state) => ({
        devtoolsDetectedCount: state.devtoolsDetectedCount + 1,
      })),

      setIntegrityAgreed: () => set({
        integrityAgreedAt: new Date().toISOString(),
      }),

      // Question time tracking
      startTrackingQuestion: (questionId) => set((state) => {
        const now = Date.now();
        const map = { ...state.questionTimeMap };
        // Save time for previous question
        if (state.currentQuestionId && state.currentQuestionEnteredAt) {
          const prev = map[state.currentQuestionId] || { totalMs: 0 };
          prev.totalMs += now - state.currentQuestionEnteredAt;
          map[state.currentQuestionId] = prev;
        }
        // Start new
        if (!map[questionId]) map[questionId] = { totalMs: 0 };
        return {
          questionTimeMap: map,
          currentQuestionId: questionId,
          currentQuestionEnteredAt: now,
        };
      }),

      finalizeTracking: () => set((state) => {
        const now = Date.now();
        const map = { ...state.questionTimeMap };
        if (state.currentQuestionId && state.currentQuestionEnteredAt) {
          const prev = map[state.currentQuestionId] || { totalMs: 0 };
          prev.totalMs += now - state.currentQuestionEnteredAt;
          map[state.currentQuestionId] = prev;
        }
        return { questionTimeMap: map, currentQuestionId: null, currentQuestionEnteredAt: null };
      }),

      // Get summary for admin view
      getSummary: () => {
        const s = get();
        return {
          tabSwitchCount: s.tabSwitchCount,
          fullscreenExitCount: s.fullscreenExitCount,
          copyAttemptCount: s.copyAttemptCount,
          rightClickCount: s.rightClickCount,
          blockedKeyCount: s.blockedKeyCount,
          devtoolsDetectedCount: s.devtoolsDetectedCount,
          totalViolations: s.tabSwitchCount + s.fullscreenExitCount + s.copyAttemptCount + s.rightClickCount + s.blockedKeyCount,
          integrityAgreedAt: s.integrityAgreedAt,
          eventCount: s.securityEvents.length,
          securityEvents: s.securityEvents,
          questionTimeMap: s.questionTimeMap,
        };
      },

      reset: () => set({
        tabSwitchCount: 0, fullscreenExitCount: 0, copyAttemptCount: 0,
        rightClickCount: 0, blockedKeyCount: 0, devtoolsDetectedCount: 0,
        securityEvents: [], integrityAgreedAt: null,
        questionTimeMap: {}, currentQuestionId: null, currentQuestionEnteredAt: null,
      }),
    }),
    { name: STORAGE_KEYS.ANTI_CHEAT }
  )
);
