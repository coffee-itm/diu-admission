import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore.js';
import { ROUTES } from '../../lib/constants.js';

export function ProtectedRoute({ children, role }) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    // If authenticated but wrong role, redirect to appropriate dashboard
    return <Navigate to={user?.role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.CANDIDATE_DASHBOARD} replace />;
  }

  return <>{children}</>;
}
