import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore.js';
import { ROUTES } from '../../lib/constants.js';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

export function ProtectedRoute({ children, role }) {
  const { user, status } = useAuthStore();
  const location = useLocation();

  // AuthProvider already blocks rendering while 'unknown' (so this normally never sees it at the
  // app's top route tree), but a guard rendered on its own — in a test, or if that ever changes —
  // must not bounce to /login before the session is actually confirmed one way or the other.
  if (status === 'unknown') {
    return <PageSpinner />;
  }

  if (status !== 'authed') {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    // If authenticated but wrong role, redirect to appropriate dashboard
    return <Navigate to={user?.role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.CANDIDATE_DASHBOARD} replace />;
  }

  return <>{children}</>;
}
