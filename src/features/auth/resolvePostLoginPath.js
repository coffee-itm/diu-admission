import { ROUTES } from '../../lib/constants.js';

// Returns where to send a user after login: the originally requested page
// when it belongs to their role area, otherwise their role's dashboard.
export function resolvePostLoginPath(from, role) {
  const dashboard = role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.CANDIDATE_DASHBOARD;
  if (typeof from !== 'string') return dashboard;
  const area = role === 'admin' ? '/admin' : role === 'candidate' ? '/candidate' : null;
  if (area && (from === area || from.startsWith(`${area}/`))) return from;
  return dashboard;
}
