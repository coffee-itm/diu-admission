import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setAccessToken, clearAccessToken, getClockOffsetMs } from './api.js';

const jsonResponse = (body, { status = 200, headers = {} } = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

describe('api()', () => {
  beforeEach(() => {
    clearAccessToken();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a 401 triggers exactly one refresh attempt and then one retry; a second 401 propagates', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async (url) => {
      calls += 1;
      if (String(url).includes('/auth/refresh')) return jsonResponse({}, { status: 200 });
      // The protected endpoint always 401s, even after refresh — must not loop forever.
      return jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'no' } }, { status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api('/admin/users')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    // 1 initial call + 1 refresh + 1 retry = 3, never more (no infinite loop).
    expect(calls).toBe(3);
  });

  it('/auth/refresh returning 401 does not recurse', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      return jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'expired' } }, { status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api('/auth/refresh', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
    expect(calls).toBe(1);
  });

  it('a successful refresh retries the original request exactly once and resolves', async () => {
    const calls = [];
    const fetchMock = vi.fn(async (url) => {
      calls.push(String(url));
      if (String(url).includes('/auth/refresh')) return jsonResponse({}, { status: 200 });
      if (calls.filter((u) => !u.includes('/auth/refresh')).length === 1) {
        return jsonResponse({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });
      }
      return jsonResponse({ ok: true }, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await api('/sessions/current');
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(3); // request, refresh, retry
  });

  it('the retried request after a silent refresh uses the new token, not the pre-refresh one', async () => {
    setAccessToken('stale-token');
    const calls = [];
    const fetchMock = vi.fn(async (url, opts) => {
      calls.push({ url: String(url), auth: opts?.headers?.Authorization });
      if (String(url).includes('/auth/refresh')) {
        return jsonResponse({ accessToken: 'fresh-token', user: { id: 'u1' } }, { status: 200 });
      }
      const nonRefreshCalls = calls.filter((c) => !c.url.includes('/auth/refresh'));
      if (nonRefreshCalls.length === 1) {
        return jsonResponse({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });
      }
      return jsonResponse({ ok: true }, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await api('/sessions/current');
    const nonRefreshCalls = calls.filter((c) => !c.url.includes('/auth/refresh'));
    expect(nonRefreshCalls).toHaveLength(2); // initial request + retry
    expect(nonRefreshCalls[0].auth).toBe('Bearer stale-token');
    expect(nonRefreshCalls[1].auth).toBe('Bearer fresh-token'); // tryRefresh() captured the rotated token before the retry
  });

  it('throws ApiError carrying status, code, message and details from the envelope', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'Bad input', details: [{ path: 'email', message: 'invalid' }] } },
        { status: 422 }
      )
    ));
    const err = await api('/auth/register', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Bad input');
    expect(err.details).toEqual([{ path: 'email', message: 'invalid' }]);
  });

  it('a non-JSON error body still throws ApiError, never a SyntaxError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502, statusText: 'Bad Gateway' })));
    const err = await api('/admin/users').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.code).toBe('INTERNAL');
    expect(err.message).toBe('Bad Gateway');
  });

  it('204 resolves to null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    const result = await api('/auth/logout', { method: 'POST' });
    expect(result).toBeNull();
  });

  it('raw: true returns the Response itself (e.g. for CSV downloads)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('a,b\n1,2', { status: 200, headers: { 'Content-Type': 'text/csv' } })));
    const result = await api('/admin/merit-list', { raw: true });
    expect(result).toBeInstanceOf(Response);
    expect(await result.text()).toBe('a,b\n1,2');
  });

  it('syncs the clock offset from X-Server-Time on every response', async () => {
    const serverTime = new Date(Date.now() + 60_000).toISOString();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true }, { headers: { 'X-Server-Time': serverTime } })));
    await api('/cycles/current');
    expect(getClockOffsetMs()).toBeGreaterThan(55_000);
    expect(getClockOffsetMs()).toBeLessThan(65_000);
  });

  it('sends the bearer token from memory when set', async () => {
    setAccessToken('tok-123');
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await api('/sessions/current');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-123');
  });

  it('uses credentials: include only for /auth/* paths', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await api('/auth/login', { method: 'POST', body: {} });
    await api('/cycles/current');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
    expect(fetchMock.mock.calls[1][1].credentials).not.toBe('include');
  });
});
