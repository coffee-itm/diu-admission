import { useEffect, useRef } from 'react';
import { useTestStore } from '../../store/testStore.js';

export function useTimer(onExpire) {
  const timeRemaining = useTestStore((s) => s.timeRemaining);
  const isSubmitted = useTestStore((s) => s.isSubmitted);
  const sessionId = useTestStore((s) => s.sessionId);
  const syncTime = useTestStore((s) => s.syncTime);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    firedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (isSubmitted || !sessionId) return;

    const check = () => {
      syncTime();
      const s = useTestStore.getState();
      if (s.timeRemaining <= 0 && !s.isSubmitted && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    check();
    const id = setInterval(check, 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isSubmitted, sessionId, syncTime]);

  return { timeRemaining };
}
