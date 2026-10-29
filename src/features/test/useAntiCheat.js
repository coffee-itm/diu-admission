import { useEffect, useRef, useState } from 'react';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { ANTI_CHEAT, SECURITY_EVENT_TYPES } from '../../lib/constants.js';
import { toast } from 'sonner';

export function useAntiCheat({ onAutoSubmit }) {
  const store = useAntiCheatStore();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const devtoolsCheckRef = useRef(null);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const submittedRef = useRef(false);

  // Keep the latest callback without re-registering listeners
  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  });

  useEffect(() => {
    const fireAutoSubmit = (reason) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      useAntiCheatStore.getState().logEvent(SECURITY_EVENT_TYPES.AUTO_SUBMIT_CHEAT, reason);
      onAutoSubmitRef.current?.();
    };

    // === 1. TAB SWITCH DETECTION ===
    const handleVisibility = () => {
      if (document.hidden) {
        useAntiCheatStore.getState().incrementTabSwitch();
        const count = useAntiCheatStore.getState().tabSwitchCount;
        if (count >= ANTI_CHEAT.MAX_TAB_SWITCHES) {
          fireAutoSubmit('Too many tab switches');
        } else if (count >= ANTI_CHEAT.WARNING_AT_SWITCHES) {
          setWarningMessage(
            `You have switched tabs ${count} times. Your test will be auto-submitted after ${ANTI_CHEAT.MAX_TAB_SWITCHES} switches. Switches remaining: ${ANTI_CHEAT.MAX_TAB_SWITCHES - count}`
          );
          setShowWarning(true);
          toast.warning(`Tab switch detected (${count}/${ANTI_CHEAT.MAX_TAB_SWITCHES})`);
        }
      }
    };

    // === 2. FULLSCREEN EXIT DETECTION ===
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        useAntiCheatStore.getState().incrementFullscreenExit();
        const count = useAntiCheatStore.getState().fullscreenExitCount;
        if (count >= ANTI_CHEAT.MAX_FULLSCREEN_EXITS) {
          fireAutoSubmit('Too many fullscreen exits');
        } else {
          setWarningMessage(
            `You exited fullscreen mode (${count}/${ANTI_CHEAT.MAX_FULLSCREEN_EXITS}). Please return to fullscreen. Your test will be auto-submitted if you exit ${ANTI_CHEAT.MAX_FULLSCREEN_EXITS - count} more times.`
          );
          setShowWarning(true);
          toast.warning('Fullscreen exit detected');
        }
      }
    };

    // === 3. COPY/PASTE/SELECT BLOCKING ===
    const handleCopy = (e) => {
      e.preventDefault();
      useAntiCheatStore.getState().incrementCopyAttempt();
      useAntiCheatStore.getState().logEvent('copy_attempt', 'Copy blocked');
      toast.error('Copying is disabled during the exam');
    };
    const handlePaste = (e) => {
      e.preventDefault();
      useAntiCheatStore.getState().incrementCopyAttempt();
      useAntiCheatStore.getState().logEvent(SECURITY_EVENT_TYPES.PASTE_ATTEMPT, 'Paste blocked');
      toast.error('Pasting is disabled during the exam');
    };
    const handleCut = (e) => {
      e.preventDefault();
      useAntiCheatStore.getState().incrementCopyAttempt();
      useAntiCheatStore.getState().logEvent(SECURITY_EVENT_TYPES.CUT_ATTEMPT, 'Cut blocked');
      toast.error('Cutting is disabled during the exam');
    };

    // === 4. RIGHT-CLICK BLOCKING ===
    const handleContextMenu = (e) => {
      e.preventDefault();
      useAntiCheatStore.getState().incrementRightClick();
      useAntiCheatStore.getState().logEvent('right_click', 'Right-click blocked');
    };

    // === 5. KEYBOARD SHORTCUT BLOCKING ===
    const handleKeyDown = (e) => {
      for (const rule of ANTI_CHEAT.BLOCKED_KEYS) {
        const ctrlMatch = rule.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = rule.shift ? e.shiftKey : true;
        if (e.key === rule.key && ctrlMatch && shiftMatch) {
          e.preventDefault();
          e.stopPropagation();
          useAntiCheatStore.getState().incrementBlockedKey();
          useAntiCheatStore.getState().logEvent('blocked_key', `Blocked: ${rule.ctrl ? 'Ctrl+' : ''}${rule.shift ? 'Shift+' : ''}${rule.key}`);
          toast.error('This keyboard shortcut is disabled during the exam');
          return;
        }
      }
      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        useAntiCheatStore.getState().logEvent('blocked_key', 'PrintScreen blocked');
      }
    };

    // === 6. TEXT SELECTION BLOCKING (CSS-based) ===
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // === 7. DEVTOOLS DETECTION (resize heuristic) ===
    const checkDevtools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        useAntiCheatStore.getState().incrementDevtools();
        useAntiCheatStore.getState().logEvent('devtools_open', 'DevTools may be open');
        toast.error('Developer tools detected. Please close them.');
      }
    };
    devtoolsCheckRef.current = setInterval(checkDevtools, 3000);

    // Register all listeners
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      clearInterval(devtoolsCheckRef.current);
    };
  }, []); // Empty deps — register once on mount

  // Fullscreen request helper
  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    store.logEvent('fullscreen_entered', 'Entered fullscreen');
  };

  const dismissWarning = () => {
    setShowWarning(false);
    requestFullscreen(); // Re-enter fullscreen after warning
  };

  return {
    showWarning,
    warningMessage,
    dismissWarning,
    requestFullscreen,
    tabSwitchCount: store.tabSwitchCount,
    fullscreenExitCount: store.fullscreenExitCount,
  };
}
