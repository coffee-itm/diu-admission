// App-wide constants

export const APP_NAME = 'DIU Admission';
export const APP_ORG = 'Daffodil International University';
export const APP_DEPT = 'Office of Admissions — All Departments';

// Programs across all DIU faculties that candidates can apply to
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

export const SECTIONS = {
  MATH: { id: 'MATH', name: 'Mathematical Reasoning', shortName: 'Math', color: '#1e40af', bg: 'bg-blue-100', text: 'text-blue-800' },
  LOGIC: { id: 'LOGIC', name: 'Logical & Analytical Thinking', shortName: 'Logic', color: '#7c3aed', bg: 'bg-violet-100', text: 'text-violet-800' },
  IT: { id: 'IT', name: 'Basic IT Literacy', shortName: 'IT', color: '#0f766e', bg: 'bg-teal-100', text: 'text-teal-800' },
  ENGLISH: { id: 'ENGLISH', name: 'English Proficiency', shortName: 'English', color: '#b45309', bg: 'bg-amber-100', text: 'text-amber-800' },
  BUSINESS: { id: 'BUSINESS', name: 'Business & Management Aptitude', shortName: 'Business', color: '#be185d', bg: 'bg-pink-100', text: 'text-pink-800' },
};

export const SECTION_ORDER = ['MATH', 'LOGIC', 'IT', 'ENGLISH', 'BUSINESS'];

export const DIFFICULTY = {
  easy: { label: 'Easy', color: 'text-green-700', bg: 'bg-green-100' },
  medium: { label: 'Medium', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  hard: { label: 'Hard', color: 'text-red-700', bg: 'bg-red-100' },
};

export const ELIGIBILITY = {
  ELIGIBLE: {
    label: 'Eligible',
    color: 'text-green-700',
    bg: 'bg-green-100',
    border: 'border-green-300',
    icon: 'CheckCircle',
    description: 'Congratulations! You meet all requirements for admission.',
  },
  CONDITIONALLY_ELIGIBLE: {
    label: 'Conditionally Eligible',
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    icon: 'AlertCircle',
    description: 'You may be considered for admission with additional review.',
  },
  NOT_ELIGIBLE: {
    label: 'Not Eligible',
    color: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-300',
    icon: 'XCircle',
    description: 'Unfortunately, you do not meet the minimum requirements.',
  },
};

export const QUESTION_STATUS = {
  NOT_VISITED: 'not_visited',
  ANSWERED: 'answered',
  SKIPPED: 'skipped',
  FLAGGED: 'flagged',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  CANDIDATE_DASHBOARD: '/candidate/dashboard',
  CANDIDATE_INSTRUCTIONS: '/candidate/instructions',
  CANDIDATE_TEST: '/candidate/test',
  CANDIDATE_RESULT: '/candidate/result',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_QUESTIONS: '/admin/questions',
  ADMIN_QUESTIONS_NEW: '/admin/questions/new',
  ADMIN_EXAM_CONFIG: '/admin/exam-config',
  ADMIN_CANDIDATES: '/admin/candidates',
  ADMIN_MERIT_LIST: '/admin/merit-list',
  ADMIN_ANALYTICS: '/admin/analytics',
};

export const AUTOSAVE_INTERVAL = 5000; // 5 seconds
export const TIMER_WARNING_THRESHOLD = 300; // 5 minutes in seconds

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

// Mock credentials
export const MOCK_ADMIN = { email: 'admin@diu.edu', password: 'Admin@1234' };
export const MOCK_CANDIDATE = { email: 'demo@candidate.com', password: 'Test@1234' };
