// App-wide constants
// Domain constants live in @diu/shared (ADR-019) and are re-exported here for existing imports.
// UI-only presentation data (labels, Tailwind classes, routes, storage keys) stays in this file.
import { ELIGIBILITY as ELIGIBILITY_ID, DIFFICULTY as DIFFICULTY_ID } from '@diu/shared/constants';

export {
  SECTION_ORDER,
  PROGRAMS,
  QUESTION_STATUS,
  ANTI_CHEAT,
  SECURITY_EVENT_TYPES,
} from '@diu/shared/constants';

export const APP_NAME = 'DIU Admission';
export const APP_ORG = 'Daffodil International University';
export const APP_DEPT = 'Office of Admissions — All Departments';

export const SECTIONS = {
  MATH: { id: 'MATH', name: 'Mathematical Reasoning', shortName: 'Math', color: '#1e40af', bg: 'bg-blue-100', text: 'text-blue-800' },
  LOGIC: { id: 'LOGIC', name: 'Logical & Analytical Thinking', shortName: 'Logic', color: '#7c3aed', bg: 'bg-violet-100', text: 'text-violet-800' },
  IT: { id: 'IT', name: 'Basic IT Literacy', shortName: 'IT', color: '#0f766e', bg: 'bg-teal-100', text: 'text-teal-800' },
  ENGLISH: { id: 'ENGLISH', name: 'English Proficiency', shortName: 'English', color: '#b45309', bg: 'bg-amber-100', text: 'text-amber-800' },
  BUSINESS: { id: 'BUSINESS', name: 'Business & Management Aptitude', shortName: 'Business', color: '#be185d', bg: 'bg-pink-100', text: 'text-pink-800' },
};

export const DIFFICULTY = {
  [DIFFICULTY_ID.EASY]: { label: 'Easy', color: 'text-green-700', bg: 'bg-green-100' },
  [DIFFICULTY_ID.MEDIUM]: { label: 'Medium', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  [DIFFICULTY_ID.HARD]: { label: 'Hard', color: 'text-red-700', bg: 'bg-red-100' },
};

export const ELIGIBILITY = {
  [ELIGIBILITY_ID.ELIGIBLE]: {
    label: 'Eligible',
    color: 'text-green-700',
    bg: 'bg-green-100',
    border: 'border-green-300',
    icon: 'CheckCircle',
    description: 'Congratulations! You meet all requirements for admission.',
  },
  [ELIGIBILITY_ID.CONDITIONALLY_ELIGIBLE]: {
    label: 'Conditionally Eligible',
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    icon: 'AlertCircle',
    description: 'You may be considered for admission with additional review.',
  },
  [ELIGIBILITY_ID.NOT_ELIGIBLE]: {
    label: 'Not Eligible',
    color: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-300',
    icon: 'XCircle',
    description: 'Unfortunately, you do not meet the minimum requirements.',
  },
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

// Mock credentials
export const MOCK_ADMIN = { email: 'admin@diu.edu', password: 'Admin@1234' };
export const MOCK_CANDIDATE = { email: 'demo@candidate.com', password: 'Test@1234' };

// localStorage keys (renamed from itm-* in T-018; see lib/storageMigration.js)
export const STORAGE_KEYS = {
  AUTH: 'diu-auth',
  TEST_SESSION: 'diu-test-session',
  ANTI_CHEAT: 'diu-anti-cheat',
  EXAM_CONFIG: 'diu-exam-config',
  RESULTS: 'diu-results',
  LANG: 'diu-lang',
  CANDIDATES: 'diu-candidates',
  QUESTIONS: 'diu-questions',
};
