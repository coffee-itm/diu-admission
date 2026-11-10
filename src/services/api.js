// Real HTTP layer for the API (context/17-frontend-spec.md §4, context/15-api-spec.md §1, §6).
// Mock mode (VITE_USE_MOCKS) routes service call sites elsewhere; this file is only the real wrapper.

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    Object.assign(this, { status, code, details });
  }
}

// Bearer access token, kept in memory only (never persisted — context/17 §3). authStore (T-050) calls
// setAccessToken on login/refresh and clearAccessToken on logout.
let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };
export const getAccessToken = () => accessToken;

// Clock sync (context/15 §1, context/17 §4): every response carries X-Server-Time; keep the offset so
// the test timer can compute `deadline − (Date.now() + clockOffsetMs)` without trusting the client clock.
let clockOffsetMs = 0;
export const getClockOffsetMs = () => clockOffsetMs;
function syncClock(headerValue) {
  if (!headerValue) return;
  const serverMs = Date.parse(headerValue);
  if (!Number.isNaN(serverMs)) clockOffsetMs = serverMs - Date.now();
}

function buildUrl(path, query) {
  const url = new URL(BASE_URL.replace(/\/$/, '') + path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, value);
    }
  }
  return url.pathname + (url.search || '') + url.hash;
}

async function doFetch(path, { method, body, query, signal }) {
  const headers = { Accept: 'application/json' };
  const isAuthPath = path.startsWith('/auth/');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return fetch(buildUrl(path, query), {
    method,
    headers,
    body: payload,
    signal,
    // Only auth endpoints need the diu_rt refresh cookie sent/received (context/15 §1).
    credentials: isAuthPath ? 'include' : 'same-origin',
  });
}

let refreshPromise = null;
/** One refresh attempt is shared by every concurrent 401 so a burst of requests triggers a single call. */
async function tryRefresh() {
  refreshPromise ??= api('/auth/refresh', { method: 'POST' })
    .then(() => true)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

/**
 * @param {string} path e.g. '/auth/login'
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>, signal?: AbortSignal, raw?: boolean }} [opts]
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, query, signal, raw = false, _retried = false } = opts;
  const res = await doFetch(path, { method, body, query, signal });
  // Exactly one refresh-retry on 401, and never for /auth/refresh itself (no recursion into itself,
  // and no unbounded loop if the retried request 401s again right after a "successful" refresh).
  if (res.status === 401 && path !== '/auth/refresh' && !_retried && (await tryRefresh())) {
    return api(path, { method, body, query, signal, raw, _retried: true });
  }
  syncClock(res.headers.get('X-Server-Time'));
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: {} }));
    throw new ApiError(res.status, error?.code ?? 'INTERNAL', error?.message ?? res.statusText, error?.details);
  }
  if (raw) return res; // CSV downloads etc.
  return res.status === 204 ? null : res.json();
}
