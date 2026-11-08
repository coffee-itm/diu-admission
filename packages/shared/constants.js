// Domain constants shared by the SPA and the server (ADR-019).
// Pure data only — UI presentation (labels, Tailwind classes) lives in src/lib/constants.js.

export const SECTION_ORDER = ['MATH', 'LOGIC', 'IT', 'ENGLISH', 'BUSINESS'];

// User roles (context/14 §3.2).
export const ROLES = ['candidate', 'reviewer', 'admin'];

// Faculties that programs belong to (context/14 §3.1).
export const FACULTIES = ['Science & Technology', 'Business & Entrepreneurship', 'Arts & Humanities'];

// Programs across all DIU faculties that candidates can apply to.
export const PROGRAMS = [
  { id: 'CSE', name: 'B.Sc. in Computer Science & Engineering', faculty: 'Science & Technology' },
  { id: 'SWE', name: 'B.Sc. in Software Engineering', faculty: 'Science & Technology' },
  { id: 'EEE', name: 'B.Sc. in Electrical & Electronic Engineering', faculty: 'Science & Technology' },
  { id: 'ARCH', name: 'B.Arch. in Architecture', faculty: 'Science & Technology' },
  { id: 'PHARM', name: 'B.Pharm. in Pharmacy', faculty: 'Science & Technology' },
  { id: 'NURSING', name: 'B.Sc. in Nursing', faculty: 'Science & Technology' },
  { id: 'BBA', name: 'BBA in Business Administration', faculty: 'Business & Entrepreneurship' },
  { id: 'ACC', name: 'B.Sc. in Accounting & Information Systems', faculty: 'Business & Entrepreneurship' },
  { id: 'THM', name: 'B.Sc. in Tourism & Hospitality Management', faculty: 'Business & Entrepreneurship' },
  { id: 'ITM', name: 'B.Sc. in Information Technology Management', faculty: 'Business & Entrepreneurship' },
  { id: 'ENG', name: 'B.A. (Hons.) in English', faculty: 'Arts & Humanities' },
  { id: 'LAW', name: 'LL.B. (Hons.) in Law', faculty: 'Arts & Humanities' },
  { id: 'JMC', name: 'B.A. (Hons.) in Journalism & Mass Communication', faculty: 'Arts & Humanities' },
];

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
