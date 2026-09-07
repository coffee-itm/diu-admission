import { useEffect, useRef } from 'react';
import { useTestStore } from '../../store/testStore.js';

export function useTimer(onExpire) {
  const { timeRemaining, tickTimer, isSubmitted, sessionId } = useTestStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isSubmitted || !sessionId || timeRemaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isSubmitted, sessionId, timeRemaining, tickTimer]);

  useEffect(() => {
    if (timeRemaining === 0 && !isSubmitted && sessionId) {
      onExpire?.();
    }
  }, [timeRemaining, isSubmitted, sessionId, onExpire]);

  return { timeRemaining };
}
