import { useRef, useState } from 'react';
import { useTestStore } from '../../store/testStore.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { testService } from '../../services/testService.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { ROUTES, SECTION_ORDER } from '../../lib/constants.js';

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
      const end = s.deadline == null ? Date.now() : Math.min(Date.now(), s.deadline);
      const timeTaken = Math.max(0, Math.round((end - Date.parse(s.startedAt)) / 1000));
      const result = await testService.submitTest({
        candidateId: user.id,
        answers: s.answers,
        questions: s.questions,
        examConfig: s.examConfig,
        timeTaken,
        antiCheat: useAntiCheatStore.getState().getSummary(),
      });
      useTestStore.getState().submitTest(result);
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

  // Sections that actually have questions, in display order.
  const sectionsWithQuestions = SECTION_ORDER.filter(
    (sid) => store.getQuestionsBySectionId(sid).length > 0,
  );
  const sectionPos = sectionsWithQuestions.indexOf(store.currentSectionId);
  const isFirstOverall = sectionPos <= 0 && store.currentQuestionIndex === 0;
  const isLastOverall =
    sectionPos === sectionsWithQuestions.length - 1 &&
    store.currentQuestionIndex >= currentQuestions.length - 1;

  const goNext = () => {
    if (store.currentQuestionIndex < currentQuestions.length - 1) {
      store.navigateTo(store.currentSectionId, store.currentQuestionIndex + 1);
    } else if (sectionPos >= 0 && sectionPos < sectionsWithQuestions.length - 1) {
      store.navigateTo(sectionsWithQuestions[sectionPos + 1], 0);
    }
  };

  const goPrev = () => {
    if (store.currentQuestionIndex > 0) {
      store.navigateTo(store.currentSectionId, store.currentQuestionIndex - 1);
    } else if (sectionPos > 0) {
      const prevSid = sectionsWithQuestions[sectionPos - 1];
      store.navigateTo(prevSid, store.getQuestionsBySectionId(prevSid).length - 1);
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
    isFirstOverall,
    isLastOverall,
    jumpTo,
  };
}
