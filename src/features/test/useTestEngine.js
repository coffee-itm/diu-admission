import { useState } from 'react';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { testService } from '../../services/testService.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { ROUTES } from '../../lib/constants.js';

export function useTestEngine() {
  const [loading, setLoading] = useState(false);
  const store = useTestStore();
  const antiCheatStore = useAntiCheatStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const startTest = async () => {
    try {
      setLoading(true);
      const session = await testService.loadTest(user.id);
      store.initSession({
        sessionId: session.sessionId,
        examConfig: session.examConfig,
        questions: session.questions,
      });
      navigate(ROUTES.CANDIDATE_TEST);
    } catch {
      toast.error('Failed to load test session');
    } finally {
      setLoading(false);
    }
  };

  const submitTest = async () => {
    if (store.isSubmitted) return;
    try {
      setLoading(true);
      antiCheatStore.finalizeTracking();
      const timeTaken = store.examConfig.totalTimeMinutes * 60 - store.timeRemaining;
      const result = await testService.submitTest({
        candidateId: user.id,
        answers: store.answers,
        questions: store.questions,
        examConfig: store.examConfig,
        timeTaken,
      });
      const antiCheatSummary = antiCheatStore.getSummary();
      const enrichedResult = { ...result, antiCheat: antiCheatSummary };
      store.submitTest(enrichedResult);
      navigate(ROUTES.CANDIDATE_RESULT);
    } catch {
      toast.error('Failed to submit test');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestions = store.getQuestionsBySectionId(store.currentSectionId);
  const currentQuestion = currentQuestions[store.currentQuestionIndex];

  const goNext = () => {
    if (store.currentQuestionIndex < currentQuestions.length - 1) {
      store.navigateTo(store.currentSectionId, store.currentQuestionIndex + 1);
      store.visitQuestion(currentQuestions[store.currentQuestionIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (store.currentQuestionIndex > 0) {
      store.navigateTo(store.currentSectionId, store.currentQuestionIndex - 1);
      store.visitQuestion(currentQuestions[store.currentQuestionIndex - 1].id);
    }
  };

  const jumpTo = (sectionId, index) => {
    store.navigateTo(sectionId, index);
    const q = store.getQuestionsBySectionId(sectionId)[index];
    if (q) store.visitQuestion(q.id);
  };

  return {
    ...store,
    loading,
    startTest,
    submitTest,
    currentQuestions,
    currentQuestion,
    goNext,
    goPrev,
    jumpTo,
  };
}
