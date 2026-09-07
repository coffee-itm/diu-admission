import { Link, useLocation } from 'react-router';
import { LayoutDashboard, Users, FileText, Settings, BarChart3, Database } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { cn } from '../../lib/utils.js';

export const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.ADMIN_DASHBOARD },
  { label: 'Question Bank', icon: Database, path: ROUTES.ADMIN_QUESTIONS },
  { label: 'Exam Config', icon: Settings, path: ROUTES.ADMIN_EXAM_CONFIG },
  { label: 'Candidates', icon: Users, path: ROUTES.ADMIN_CANDIDATES },
  { label: 'Merit List', icon: FileText, path: ROUTES.ADMIN_MERIT_LIST },
  { label: 'Analytics', icon: BarChart3, path: ROUTES.ADMIN_ANALYTICS },
];

export function Sidebar({ className }) {
  const location = useLocation();

  return (
    <aside className={cn('w-64 bg-white border-r border-slate-200 flex flex-col', className)}>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path) && (item.path !== ROUTES.ADMIN_DASHBOARD || location.pathname === ROUTES.ADMIN_DASHBOARD);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon size={18} className={isActive ? 'text-blue-700' : 'text-slate-400'} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
