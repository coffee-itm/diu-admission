// Domain constants shared by the SPA and the server (ADR-019).
// Pure data only — UI presentation (labels, Tailwind classes) lives in src/lib/constants.js.

export const SECTION_ORDER = ['MATH', 'LOGIC', 'IT', 'ENGLISH', 'BUSINESS'];

export const ELIGIBILITY = {
  ELIGIBLE: 'ELIGIBLE',
  CONDITIONALLY_ELIGIBLE: 'CONDITIONALLY_ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
};

export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const QUESTION_STATUS = {
  NOT_VISITED: 'not_visited',
  ANSWERED: 'answered',
  SKIPPED: 'skipped',
  FLAGGED: 'flagged',
};

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
  CUT_ATTEMPT: 'cut_attempt',
  FULLSCREEN_UNSUPPORTED: 'fullscreen_unsupported',
};
