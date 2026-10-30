import { Link, useNavigate } from 'react-router';
import { GraduationCap, LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { ROUTES } from '../../lib/constants.js';
import { Button } from '../ui/Button.jsx';
import { navItems } from './navItems.js';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2.5 group" id="nav-logo">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none">DIU Admission</p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">All Departments</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to={ROUTES.HOME} className="text-sm text-slate-600 hover:text-blue-700 font-medium transition-colors">Home</Link>
            {!isAuthenticated && (
              <>
                <Link to={ROUTES.LOGIN} className="text-sm text-slate-600 hover:text-blue-700 font-medium transition-colors">Login</Link>
                <Button id="nav-register-btn" size="sm" as={Link} to={ROUTES.REGISTER}>Register</Button>
              </>
            )}
            {isAuthenticated && user?.role === 'candidate' && (
              <Link to={ROUTES.CANDIDATE_DASHBOARD} className="text-sm text-slate-600 hover:text-blue-700 font-medium transition-colors">Dashboard</Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link to={ROUTES.ADMIN_DASHBOARD} className="text-sm text-slate-600 hover:text-blue-700 font-medium transition-colors">Admin Panel</Link>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <User size={14} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{user?.name?.split(' ')[0]}</span>
                </div>
                <Button id="nav-logout-btn" variant="ghost" size="sm" leftIcon={<LogOut size={14} />} onClick={handleLogout}>Logout</Button>
              </div>
            )}
          </nav>

          {/* Mobile menu toggle */}
          <button
            id="nav-mobile-menu-btn"
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 flex flex-col gap-2">
            <Link to={ROUTES.HOME} className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMenuOpen(false)}>Home</Link>
            {!isAuthenticated && (
              <>
                <Link to={ROUTES.LOGIN} className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to={ROUTES.REGISTER} className="px-3 py-2 text-sm text-blue-700 font-medium hover:bg-blue-50 rounded-lg" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <div className="py-2 border-y border-slate-100 my-2 flex flex-col gap-1">
                <span className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Menu</span>
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                    <item.icon size={16} className="text-slate-400" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {isAuthenticated && (
              <button
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left"
                onClick={() => { handleLogout(); setMenuOpen(false); }}
              >Logout ({user?.name})</button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
