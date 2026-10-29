import { useEffect, useRef } from 'react';
import { useTestStore } from '../../store/testStore.js';
import { AUTOSAVE_INTERVAL } from '../../lib/constants.js';

export function useAutoSave() {
  const { answers, questionStatus, sessionId, isSubmitted } = useTestStore();
  const lastSaveRef = useRef({ answers: null, status: null });

  useEffect(() => {
    if (isSubmitted || !sessionId) return;

    const saveInterval = setInterval(() => {
      const currentAnswers = JSON.stringify(answers);
      const currentStatus = JSON.stringify(questionStatus);
      
      // Only save if changed
      if (currentAnswers !== lastSaveRef.current.answers || currentStatus !== lastSaveRef.current.status) {
        // Zustand persist handles localStorage sync automatically,
        // so we just show a subtle toast or log
        // console.log('Auto-saved progress');
        
        lastSaveRef.current = { answers: currentAnswers, status: currentStatus };
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(saveInterval);
  }, [answers, questionStatus, sessionId, isSubmitted]);
}
