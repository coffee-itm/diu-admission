import { useEffect, useRef, useState } from 'react';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { ANTI_CHEAT } from '../../lib/constants.js';
import { toast } from 'sonner';

export function useAntiCheat({ onAutoSubmit }) {
  const store = useAntiCheatStore();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const devtoolsCheckRef = useRef(null);

  useEffect(() => {
    // === 1. TAB SWITCH DETECTION ===
    const handleVisibility = () => {
      if (document.hidden) {
        store.incrementTabSwitch();
        const count = store.tabSwitchCount + 1; // +1 because state hasn't updated yet in sync
        if (count >= ANTI_CHEAT.MAX_TAB_SWITCHES) {
          store.logEvent('auto_submit_cheat', 'Too many tab switches');
          onAutoSubmit?.();
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
        store.incrementFullscreenExit();
        const count = store.fullscreenExitCount + 1;
        if (count >= ANTI_CHEAT.MAX_FULLSCREEN_EXITS) {
          store.logEvent('auto_submit_cheat', 'Too many fullscreen exits');
          onAutoSubmit?.();
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
      store.incrementCopyAttempt();
      store.logEvent('copy_attempt', 'Copy blocked');
      toast.error('Copying is disabled during the exam');
    };
    const handlePaste = (e) => {
      e.preventDefault();
      store.logEvent('paste_attempt', 'Paste blocked');
      toast.error('Pasting is disabled during the exam');
    };
    const handleCut = (e) => {
      e.preventDefault();
      toast.error('Cutting is disabled during the exam');
    };

    // === 4. RIGHT-CLICK BLOCKING ===
    const handleContextMenu = (e) => {
      e.preventDefault();
      store.incrementRightClick();
      store.logEvent('right_click', 'Right-click blocked');
    };

    // === 5. KEYBOARD SHORTCUT BLOCKING ===
    const handleKeyDown = (e) => {
      for (const rule of ANTI_CHEAT.BLOCKED_KEYS) {
        const ctrlMatch = rule.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = rule.shift ? e.shiftKey : true;
        if (e.key === rule.key && ctrlMatch && shiftMatch) {
          e.preventDefault();
          e.stopPropagation();
          store.incrementBlockedKey();
          store.logEvent('blocked_key', `Blocked: ${rule.ctrl ? 'Ctrl+' : ''}${rule.shift ? 'Shift+' : ''}${rule.key}`);
          toast.error('This keyboard shortcut is disabled during the exam');
          return;
        }
      }
      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        store.logEvent('blocked_key', 'PrintScreen blocked');
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
        store.incrementDevtools();
        store.logEvent('devtools_open', 'DevTools may be open');
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
