import { useRef, useState } from 'react';
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
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const submittingRef = useRef(false);

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
    // Read fresh state: this function may be a stale copy held by a timer or anti-cheat callback.
    const s = useTestStore.getState();
    const ac = useAntiCheatStore.getState();
    if (s.isSubmitted || submittingRef.current) return;
    submittingRef.current = true;
    try {
      setLoading(true);
      ac.finalizeTracking();
      const timeTaken = s.examConfig.totalTimeMinutes * 60 - s.timeRemaining;
      const result = await testService.submitTest({
        candidateId: user.id,
        answers: s.answers,
        questions: s.questions,
        examConfig: s.examConfig,
        timeTaken,
      });
      const antiCheatSummary = useAntiCheatStore.getState().getSummary();
      const enrichedResult = { ...result, antiCheat: antiCheatSummary };
      useTestStore.getState().submitTest(enrichedResult);
      navigate(ROUTES.CANDIDATE_RESULT);
    } catch {
      toast.error('Failed to submit test');
    } finally {
      submittingRef.current = false;
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
