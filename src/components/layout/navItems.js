import { LayoutDashboard, Users, FileText, Settings, BarChart3, Database } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';

export const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.ADMIN_DASHBOARD },
  { label: 'Question Bank', icon: Database, path: ROUTES.ADMIN_QUESTIONS },
  { label: 'Exam Config', icon: Settings, path: ROUTES.ADMIN_EXAM_CONFIG },
  { label: 'Candidates', icon: Users, path: ROUTES.ADMIN_CANDIDATES },
  { label: 'Merit List', icon: FileText, path: ROUTES.ADMIN_MERIT_LIST },
  { label: 'Analytics', icon: BarChart3, path: ROUTES.ADMIN_ANALYTICS },
];
