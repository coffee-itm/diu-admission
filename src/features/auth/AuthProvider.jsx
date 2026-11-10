import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { authService } from '../../services/authService.js';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

// Module-level singleton, not per-render state: React 19 StrictMode (dev only) mounts this
// component's effect twice in a row before either async call settles. The refresh token is
// single-use and rotates (FR-AUTH-03); two concurrent /auth/refresh calls reusing the same
// pre-rotation cookie would trip reuse detection and revoke the whole token family. One shared
// in-flight promise means a second effect invocation (or a second AuthProvider mount, were there
// ever one) attaches to the same attempt instead of firing a second request.
let restorePromise = null;
function restoreSession() {
  restorePromise ??= (async () => {
    try {
      // Silent refresh (sets the in-memory access token on success), then fetch the canonical
      // profile with it. Two calls, not one, even though a real /auth/refresh also returns a
      // user: `me` is the source of truth for the freshest profile (15 §2).
      await authService.refresh();
      const user = await authService.me();
      useAuthStore.getState().login(user);
    } catch {
      useAuthStore.getState().logout();
    }
  })();
  return restorePromise;
}

export function AuthProvider({ children }) {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'unknown') restoreSession();
  }, [status]);

  // Render nothing decisive while the session is being confirmed, so ProtectedRoute never sees
  // 'unknown' as "not authed" and bounces an about-to-be-restored user to /login.
  if (status === 'unknown') return <PageSpinner />;

  return <>{children}</>;
}
