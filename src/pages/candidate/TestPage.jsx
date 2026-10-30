import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { ROUTES, QUESTION_STATUS } from '../../lib/constants.js';
import { useTestEngine } from '../../features/test/useTestEngine.js';
import { useTimer } from '../../features/test/useTimer.js';
import { useAutoSave } from '../../features/test/useAutoSave.js';
import { Button } from '../../components/ui/Button.jsx';
import { Timer } from '../../components/ui/Timer.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { QuestionCard } from '../../features/test/QuestionCard.jsx';
import { QuestionNav } from '../../features/test/QuestionNav.jsx';
import { SectionHeader } from '../../features/test/SectionHeader.jsx';
import { TestSubmitDialog } from '../../features/test/TestSubmitDialog.jsx';
import { useAntiCheat } from '../../features/test/useAntiCheat.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { SecurityWarningModal } from '../../features/test/SecurityWarningModal.jsx';

export function CandidateTestPage() {
  const navigate = useNavigate();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const {
    sessionId,
    isSubmitted,
    currentQuestions,
    currentQuestion,
    currentSectionId,
    currentQuestionIndex,
    answers,
    questionStatus,
    setAnswer,
    toggleFlag,
    goNext,
    goPrev,
    jumpTo,
    submitTest,
    loading,
    navigateTo,
    isFirstOverall,
    isLastOverall,
    getQuestionsBySectionId,
    visitQuestion,
  } = useTestEngine();

  // Redirect if no session or already submitted
  useEffect(() => {
    if (!sessionId) {
      navigate(ROUTES.CANDIDATE_DASHBOARD, { replace: true });
    } else if (isSubmitted) {
      navigate(ROUTES.CANDIDATE_RESULT, { replace: true });
    }
  }, [sessionId, isSubmitted, navigate]);

  // Use timer and auto-save hooks
  const { timeRemaining } = useTimer(async () => {
    // Timer expired
    await submitTest();
  });
  
  useAutoSave();

  const { showWarning, warningMessage, dismissWarning, returnToFullscreen, isFullscreen } = useAntiCheat({
    onAutoSubmit: async () => {
      useAntiCheatStore.getState().finalizeTracking();
      await submitTest();
    },
  });

  // Mark every question the candidate lands on as visited (first load, tabs, next/prev).
  const currentQuestionId = currentQuestion?.id;
  useEffect(() => {
    if (currentQuestionId) {
      visitQuestion(currentQuestionId);
    }
  }, [currentQuestionId, visitQuestion]);

  // Track time per question
  useEffect(() => {
    if (currentQuestionId) {
      useAntiCheatStore.getState().startTrackingQuestion(currentQuestionId);
    }
  }, [currentQuestionId]);

  if (!sessionId || isSubmitted || !currentQuestion) {
    return <PageSpinner />;
  }

  const isFlagged = questionStatus[currentQuestion.id] === QUESTION_STATUS.FLAGGED;
  const handleSectionChange = (sid) => {
    const qs = getQuestionsBySectionId(sid);
    const firstUnanswered = qs.findIndex((q) => !answers[q.id]);
    navigateTo(sid, firstUnanswered === -1 ? 0 : firstUnanswered);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 p-4 flex flex-col gap-4 z-40 overflow-hidden">
      {/* Top Bar: Sections & Timer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex-1 w-full overflow-hidden">
          <SectionHeader 
            currentSectionId={currentSectionId} 
            onSectionChange={handleSectionChange} 
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <Button variant="danger" onClick={() => setSubmitDialogOpen(true)}>Submit Exam</Button>
          <Timer seconds={timeRemaining} />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left: Question Content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Question {currentQuestionIndex + 1} of {currentQuestions.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFlag(currentQuestion.id)}
              leftIcon={<Flag size={16} />}
              className={isFlagged ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 hover:text-yellow-700' : ''}
            >
              {isFlagged ? 'Flagged' : 'Flag for review'}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px]">
            <QuestionCard 
              question={currentQuestion}
              selectedOptionId={answers[currentQuestion.id]}
              onSelect={(optionId) => setAnswer(currentQuestion.id, optionId)}
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shrink-0 shadow-sm">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={isFirstOverall}
              leftIcon={<ChevronLeft size={20} />}
            >
              Previous
            </Button>
            <Button
              variant="primary"
              onClick={goNext}
              disabled={isLastOverall}
              rightIcon={<ChevronRight size={20} />}
            >
              Next Question
            </Button>
          </div>
        </div>

        {/* Right: Question Navigator */}
        <div className="w-full lg:w-80 shrink-0 min-h-[250px] lg:h-full">
          <QuestionNav 
            sectionId={currentSectionId}
            questions={currentQuestions}
            currentIndex={currentQuestionIndex}
            onSelect={(idx) => jumpTo(currentSectionId, idx)}
          />
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <TestSubmitDialog 
        isOpen={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        onConfirm={() => submitTest()}
        loading={loading}
      />

      <SecurityWarningModal
        isOpen={showWarning}
        message={warningMessage}
        onDismiss={dismissWarning}
        onReturnToFullscreen={returnToFullscreen}
        isFullscreen={isFullscreen}
      />
    </div>
  );
}
