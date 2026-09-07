# Anti-Cheat System — Implementation Guide

> **Purpose:** Step-by-step instructions for implementing 10 anti-cheat features into the existing prototype. Each feature lists the exact files to create/modify with complete code.

---

## Overview of Features to Implement

| # | Feature | New Files | Modified Files |
|---|---------|-----------|----------------|
| 1 | Anti-Cheat Store | `src/store/antiCheatStore.js` | — |
| 2 | Anti-Cheat Hook | `src/features/test/useAntiCheat.js` | — |
| 3 | Security Warning Modal | `src/features/test/SecurityWarningModal.jsx` | — |
| 4 | Integrity Declaration | — | `src/pages/candidate/InstructionsPage.jsx` |
| 5 | Fullscreen Test Layout | — | `src/pages/candidate/TestPage.jsx` |
| 6 | Admin Security Flags | — | `src/pages/admin/CandidateDetailPage.jsx` |
| 7 | Constants Update | — | `src/lib/constants.js` |
| 8 | AGENTS.md auto-save ref | — | `AGENTS.md` line 341 |
| 9 | mockExamConfig instructions | — | `src/data/mockExamConfig.js` |
| 10 | Store integration | — | `src/features/test/useTestEngine.js` |

---

## STEP 1: Add Anti-Cheat Constants

**File:** `src/lib/constants.js` — Add these at the bottom, BEFORE the mock credentials:

```javascript
// Anti-Cheat Configuration
export const ANTI_CHEAT = {
  MAX_TAB_SWITCHES: 5,        // Auto-submit after this many
  WARNING_AT_SWITCHES: 2,     // Show warning modal after this many
  MAX_FULLSCREEN_EXITS: 3,    // Auto-submit after this many
  BLOCKED_KEYS: [
    { key: 'c', ctrl: true },      // Ctrl+C
    { key: 'v', ctrl: true },      // Ctrl+V
    { key: 'a', ctrl: true },      // Ctrl+A
    { key: 'p', ctrl: true },      // Ctrl+P
    { key: 'u', ctrl: true },      // Ctrl+U (view source)
    { key: 's', ctrl: true },      // Ctrl+S
    { key: 'I', ctrl: true, shift: true },  // DevTools
    { key: 'J', ctrl: true, shift: true },  // DevTools
    { key: 'C', ctrl: true, shift: true },  // DevTools
    { key: 'F12', ctrl: false },            // DevTools
  ],
};

export const SECURITY_EVENT_TYPES = {
  TAB_SWITCH: 'tab_switch',
  FULLSCREEN_EXIT: 'fullscreen_exit',
  COPY_ATTEMPT: 'copy_attempt',
  PASTE_ATTEMPT: 'paste_attempt',
  RIGHT_CLICK: 'right_click',
  BLOCKED_KEY: 'blocked_key',
  DEVTOOLS_OPEN: 'devtools_open',
  AUTO_SUBMIT_CHEAT: 'auto_submit_cheat',
  INTEGRITY_AGREED: 'integrity_agreed',
  FULLSCREEN_ENTERED: 'fullscreen_entered',
};
```

---

## STEP 2: Create Anti-Cheat Store

**File:** `src/store/antiCheatStore.js` — CREATE NEW

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    { name: 'itm-anti-cheat' }
  )
);
```

---

## STEP 3: Create useAntiCheat Hook

**File:** `src/features/test/useAntiCheat.js` — CREATE NEW

This hook activates ALL client-side protections when mounted on TestPage.

```javascript
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
```

---

## STEP 4: Create SecurityWarningModal

**File:** `src/features/test/SecurityWarningModal.jsx` — CREATE NEW

```jsx
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ShieldAlert } from 'lucide-react';

export function SecurityWarningModal({ isOpen, message, onDismiss }) {
  return (
    <Modal isOpen={isOpen} onClose={onDismiss} title="⚠️ Security Warning" size="md" hideClose>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <ShieldAlert size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 leading-relaxed">{message}</p>
        </div>
        <p className="text-sm text-slate-600">
          Any suspicious activity is being logged and will be reviewed by the exam administrator. 
          Continued violations will result in automatic test submission.
        </p>
        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onDismiss}>
            I Understand, Continue Test
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## STEP 5: Modify InstructionsPage — Add Integrity Declaration

**File:** `src/pages/candidate/InstructionsPage.jsx`

**What to change:** Add a checkbox for academic integrity declaration. The "Start Test" button must be disabled until the checkbox is checked. When checked, call `useAntiCheatStore().setIntegrityAgreed()`.

Add this import at the top:
```javascript
import { useState } from 'react';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
```

Inside the component, add state:
```javascript
const [integrityChecked, setIntegrityChecked] = useState(false);
const { setIntegrityAgreed, reset: resetAntiCheat } = useAntiCheatStore();
```

Add this JSX block BEFORE the button row (`<div className="flex justify-end gap-4 pt-4">`):
```jsx
<Card className="p-6 border-2 border-amber-300 bg-amber-50/50">
  <h3 className="text-lg font-bold text-slate-900 mb-3">Academic Integrity Declaration</h3>
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      id="integrity-checkbox"
      checked={integrityChecked}
      onChange={(e) => {
        setIntegrityChecked(e.target.checked);
        if (e.target.checked) {
          resetAntiCheat();
          setIntegrityAgreed();
        }
      }}
      className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
    />
    <span className="text-sm text-slate-700 leading-relaxed">
      I hereby declare that I will complete this exam honestly and independently. 
      I will not use AI tools, search engines, external help, or any unauthorized resources. 
      I understand that my activity is being monitored and any violation may result in 
      disqualification. I accept the terms of the academic integrity policy.
    </span>
  </label>
</Card>
```

Update the Start button to be disabled when checkbox is unchecked:
```jsx
<Button size="lg" onClick={startTest} loading={loading} disabled={!integrityChecked}>
  I Agree, Start Test
</Button>
```

---

## STEP 6: Modify TestPage — Integrate Anti-Cheat + Fullscreen

**File:** `src/pages/candidate/TestPage.jsx`

**Add imports:**
```javascript
import { useAntiCheat } from '../../features/test/useAntiCheat.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { SecurityWarningModal } from '../../features/test/SecurityWarningModal.jsx';
```

**Inside the component, after the existing hooks:**
```javascript
const antiCheatStore = useAntiCheatStore();

const { showWarning, warningMessage, dismissWarning, requestFullscreen } = useAntiCheat({
  onAutoSubmit: async () => {
    antiCheatStore.finalizeTracking();
    await submitTest();
  },
});

// Request fullscreen on mount
useEffect(() => {
  requestFullscreen();
}, []);

// Track time per question
useEffect(() => {
  if (currentQuestion) {
    antiCheatStore.startTrackingQuestion(currentQuestion.id);
  }
}, [currentQuestion?.id]);
```

**Add SecurityWarningModal at the end of JSX, after TestSubmitDialog:**
```jsx
<SecurityWarningModal
  isOpen={showWarning}
  message={warningMessage}
  onDismiss={dismissWarning}
/>
```

**Wrap the entire test page in a fullscreen-optimized container.** Replace the outermost `<div>` className:
```
Old: className="h-[calc(100vh-8rem)] flex flex-col gap-6"
New: className="fixed inset-0 bg-slate-50 p-4 flex flex-col gap-4 z-40 overflow-hidden"
```

This makes the test page cover the full screen, hiding nav/footer.

---

## STEP 7: Modify useTestEngine — Include Anti-Cheat Data in Submission

**File:** `src/features/test/useTestEngine.js`

**Add import:**
```javascript
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
```

**Inside the hook, add:**
```javascript
const antiCheatStore = useAntiCheatStore();
```

**In the `submitTest` function, before calling `testService.submitTest`, finalize tracking:**
```javascript
antiCheatStore.finalizeTracking();
```

**Add antiCheat summary to the result object in `testService.submitTest` call or after:**
```javascript
const antiCheatSummary = antiCheatStore.getSummary();
// Attach to result - store in localStorage for admin viewing
const enrichedResult = { ...result, antiCheat: antiCheatSummary };
```

Update the `store.submitTest(result)` call to use `enrichedResult` instead.

---

## STEP 8: Modify CandidateDetailPage — Show Security Flags

**File:** `src/pages/admin/CandidateDetailPage.jsx`

**Add import:**
```javascript
import { ShieldAlert, Eye, Copy, Mouse, Keyboard } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
```

**After the EligibilityBadge + ScoreCard section, add a new "Security Report" section:**

```jsx
{/* Security Report */}
{result.antiCheat && (
  <Card className="p-6">
    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <ShieldAlert size={20} className="text-red-600" />
      Security Report
    </h3>
    
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="p-3 bg-slate-50 rounded-lg text-center">
        <Eye size={18} className="mx-auto mb-1 text-slate-500" />
        <p className="text-2xl font-bold text-slate-900">{result.antiCheat.tabSwitchCount}</p>
        <p className="text-xs text-slate-500">Tab Switches</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg text-center">
        <Copy size={18} className="mx-auto mb-1 text-slate-500" />
        <p className="text-2xl font-bold text-slate-900">{result.antiCheat.copyAttemptCount}</p>
        <p className="text-xs text-slate-500">Copy Attempts</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg text-center">
        <Mouse size={18} className="mx-auto mb-1 text-slate-500" />
        <p className="text-2xl font-bold text-slate-900">{result.antiCheat.rightClickCount}</p>
        <p className="text-xs text-slate-500">Right Clicks</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg text-center">
        <Keyboard size={18} className="mx-auto mb-1 text-slate-500" />
        <p className="text-2xl font-bold text-slate-900">{result.antiCheat.blockedKeyCount}</p>
        <p className="text-xs text-slate-500">Blocked Keys</p>
      </div>
    </div>

    {/* Risk Level Badge */}
    {(() => {
      const total = result.antiCheat.totalViolations || 0;
      let level = 'Low Risk';
      let color = 'bg-green-100 text-green-800';
      if (total >= 10) { level = 'High Risk'; color = 'bg-red-100 text-red-800'; }
      else if (total >= 4) { level = 'Medium Risk'; color = 'bg-yellow-100 text-yellow-800'; }
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${color}`}>
          <ShieldAlert size={14} />
          {level} — {total} total violations
        </div>
      );
    })()}

    {/* Event Log */}
    {result.antiCheat.securityEvents?.length > 0 && (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Event Log</h4>
        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium text-slate-600">Time</th>
                <th className="text-left p-2 font-medium text-slate-600">Event</th>
                <th className="text-left p-2 font-medium text-slate-600">Detail</th>
              </tr>
            </thead>
            <tbody>
              {result.antiCheat.securityEvents.map((evt, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2 font-mono text-slate-500">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-2 font-medium text-slate-700">{evt.type.replace(/_/g, ' ')}</td>
                  <td className="p-2 text-slate-500">{evt.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </Card>
)}
```

---

## STEP 9: Update AGENTS.md Test Engine Section

In the existing AGENTS.md, update the **Test Engine** spec (around line 341) to change:
```
- **Auto-Save:** Every 5 seconds, save current answers to localStorage (prototype) or API.
```

And add this bullet:
```
- **Anti-Cheat System:** Tab-switch detection, fullscreen enforcement, copy/paste blocking, keyboard shortcut blocking, DevTools detection, right-click prevention, time-per-question tracking, integrity declaration, and security event logging. See `ANTI_CHEAT_IMPLEMENTATION.md` for details.
```

---

## File Dependency Order

Implement in this exact order to avoid import errors:

1. `src/lib/constants.js` — add constants
2. `src/store/antiCheatStore.js` — create store
3. `src/features/test/SecurityWarningModal.jsx` — create modal
4. `src/features/test/useAntiCheat.js` — create hook
5. `src/pages/candidate/InstructionsPage.jsx` — add integrity checkbox
6. `src/features/test/useTestEngine.js` — integrate store
7. `src/pages/candidate/TestPage.jsx` — integrate hook + fullscreen
8. `src/pages/admin/CandidateDetailPage.jsx` — add security view
9. `src/data/mockExamConfig.js` — update instructions text

---

## Testing Checklist

After implementing, verify:

- [ ] Switching to another tab shows warning toast after 2 switches
- [ ] After 5 tab switches, test auto-submits
- [ ] Test enters fullscreen on start
- [ ] Exiting fullscreen shows warning modal
- [ ] Right-click is blocked on test page
- [ ] Ctrl+C, Ctrl+V, Ctrl+A, F12 are all blocked
- [ ] Text cannot be selected on test page
- [ ] Integrity checkbox must be checked to start test
- [ ] Admin candidate detail page shows security report
- [ ] Security events are logged with timestamps
- [ ] Auto-save triggers every 5 seconds (not 30)
- [ ] All protections are REMOVED when test is submitted (cleanup)
