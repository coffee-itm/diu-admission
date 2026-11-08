import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSigner } from 'fast-jwt'
import { z } from 'zod'
import { Types } from 'mongoose'
import { startTestApp } from './helpers/app.js'
import { createUser } from './helpers/factories.js'
import { loadConfig } from '../src/config.js'
import { signAccessToken } from '../src/modules/auth/service.js'
import { User } from '../src/modules/users/model.js'

const API = '/api/v1'
const SECRET = 'test-jwt-secret-test-jwt-secret-0123456789'
const config = loadConfig({ NODE_ENV: 'test', MONGODB_URI: 'mongodb://localhost:27017/unused', JWT_ACCESS_SECRET: SECRET })

// ------------------------------------------------------------------ test-only guard probes
// No real endpoint is admin-only yet, so these stand in for the guard combinations later modules will use.
// They exist only in this test app (`extraRoutes`); production never registers them.
async function probeRoutes(app) {
  const guarded = (path, roles, handler) =>
    app.get(path, { onRequest: [app.authenticate, app.requireRole(...roles)] }, handler)
  guarded('/_probe/admin', ['admin'], async () => ({ ok: true }))
  guarded('/_probe/staff', ['reviewer', 'admin'], async () => ({ ok: true }))
  guarded('/_probe/candidate', ['candidate'], async () => ({ ok: true }))
  // POST with a body schema: the guards must answer BEFORE validation, or a wrong-role caller sees this schema in a 422.
  app.post(
    '/_probe/admin-write',
    { onRequest: [app.authenticate, app.requireRole('admin')], schema: { body: z.object({ name: z.string().min(1) }) } },
    async () => ({ ok: true }),
  )
  app.get('/_probe/scope', { onRequest: app.authenticate }, async (req) => ({ programCodes: app.programScope(req) }))
  // Guard without `authenticate` in front of it: must fail closed as 401, never crash or let the request in.
  app.get('/_probe/no-authenticate', { onRequest: app.requireRole('admin') }, async () => ({ ok: true }))
}

// ------------------------------------------------------------------ THE MATRIX
// One row per endpoint group (or per distinct guard). To cover a new group, add a row; do not write a test body.
// Status per actor: anon | candidate | reviewer (CSE) | admin.
// A new role-sensitive module adds, e.g.:
//   { group: 'results (admin)', method: 'GET', url: '/admin/results', anon: 401, candidate: 403, reviewer: 200, admin: 200 }
// `body` is sent as the JSON payload when present. 401 rows are asserted to carry UNAUTHENTICATED, 403 rows FORBIDDEN.
const MATRIX = [
  // public
  { group: 'health (public)', method: 'GET', url: '/health', anon: 200, candidate: 200, reviewer: 200, admin: 200 },
  { group: 'readiness (public)', method: 'GET', url: '/ready', anon: 200, candidate: 200, reviewer: 200, admin: 200 },
  // auth: public endpoints must not care who calls (an empty body is a 422 for everybody)
  { group: 'auth login (public)', method: 'POST', url: '/auth/login', body: {}, anon: 422, candidate: 422, reviewer: 422, admin: 422 },
  // any signed-in role
  { group: 'auth me (any role)', method: 'GET', url: '/auth/me', anon: 401, candidate: 200, reviewer: 200, admin: 200 },
  // role guards (probes stand in until real groups exist)
  { group: 'admin only', method: 'GET', url: '/_probe/admin', anon: 401, candidate: 403, reviewer: 403, admin: 200 },
  // POST + body schema, sent an empty body: guards run before validation, so only admin reaches the 422
  { group: 'admin only write (body schema)', method: 'POST', url: '/_probe/admin-write', body: {}, anon: 401, candidate: 403, reviewer: 403, admin: 422 },
  { group: 'staff (reviewer + admin)', method: 'GET', url: '/_probe/staff', anon: 401, candidate: 403, reviewer: 200, admin: 200 },
  { group: 'candidate only', method: 'GET', url: '/_probe/candidate', anon: 401, candidate: 200, reviewer: 403, admin: 403 },
  { group: 'requireRole without authenticate', method: 'GET', url: '/_probe/no-authenticate', anon: 401, candidate: 401, reviewer: 401, admin: 401, noAuth: true },
]
const ACTORS = ['anon', 'candidate', 'reviewer', 'admin']
const CODE_FOR = { 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN' }

let ctx
const users = {}
const tokens = {}
let ip = 0

// Fresh client IP per request so the per-IP rate limit never couples rows together.
const nextIp = () => `10.7.${Math.floor(++ip / 250)}.${(ip % 250) + 1}`
const call = (method, url, { token, headers, body } = {}) =>
  ctx.app.inject({
    method,
    url: `${API}${url}`,
    payload: body,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    remoteAddress: nextIp(),
  })

const sign = (payload, opts = {}) => createSigner({ key: SECRET, algorithm: 'HS256', expiresIn: '15m', ...opts })(payload)

beforeAll(async () => {
  ctx = await startTestApp({ extraRoutes: [probeRoutes] })
  users.candidate = await createUser({ role: 'candidate' })
  users.reviewer = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
  users.admin = await createUser({ role: 'admin' })
  for (const [actor, user] of Object.entries(users)) tokens[actor] = signAccessToken(user, config)
}, 120_000)
afterAll(() => ctx?.stop())

describe('RBAC matrix', () => {
  describe.each(MATRIX)('$group — $method $url', (row) => {
    it.each(ACTORS)('%s', async (actor) => {
      const res = await call(row.method, row.url, { token: row.noAuth ? undefined : tokens[actor], body: row.body })
      expect(res.statusCode).toBe(row[actor])
      if (CODE_FOR[row[actor]]) expect(res.json()).toEqual({ error: { code: CODE_FOR[row[actor]], message: expect.any(String) } })
    })
  })

  it('every row states an expectation for every actor (a half-filled row cannot silently pass)', () => {
    for (const row of MATRIX) for (const actor of ACTORS) expect(Number.isInteger(row[actor]), `${row.group}/${actor}`).toBe(true)
  })
})

describe('authenticate: token failures are 401 with the standard envelope', () => {
  const expected = { error: { code: 'UNAUTHENTICATED', message: expect.any(String) } }

  it('missing token', async () => {
    const res = await call('GET', '/auth/me')
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual(expected)
  })

  it('malformed token (garbage, wrong scheme, empty bearer)', async () => {
    for (const authorization of ['Bearer not-a-jwt', 'Bearer a.b.c', `Basic ${tokens.admin}`, `Bearer ${tokens.admin} extra`, 'Bearer ', tokens.admin]) {
      const res = await call('GET', '/auth/me', { headers: { authorization } })
      expect(res.statusCode, authorization).toBe(401)
      expect(res.json(), authorization).toEqual(expected)
    }
  })

  it('expired token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = sign({ sub: String(users.admin._id), role: 'admin', iat: now - 3600, exp: now - 60 })
    const res = await call('GET', '/auth/me', { token })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual(expected)
    // sanity: the same claims with a future expiry are accepted, so the 401 above really is about `exp`
    expect((await call('GET', '/auth/me', { token: sign({ sub: String(users.admin._id), role: 'admin' }) })).statusCode).toBe(200)
  })

  it('wrong-signature token (other key, and a different algorithm with the right key)', async () => {
    const claims = { sub: String(users.admin._id), role: 'admin' }
    const otherKey = createSigner({ key: 'a-completely-different-secret-0123456789', algorithm: 'HS256', expiresIn: '15m' })(claims)
    const hs512 = createSigner({ key: SECRET, algorithm: 'HS512', expiresIn: '15m' })(claims)
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`
    for (const token of [otherKey, hs512, none]) {
      const res = await call('GET', '/auth/me', { token })
      expect(res.statusCode).toBe(401)
      expect(res.json()).toEqual(expected)
    }
  })
})

describe('requireRole: 401 for anon, 403 for the wrong role', () => {
  it('distinguishes "not signed in" from "signed in but not allowed"', async () => {
    const anon = await call('GET', '/_probe/admin')
    const candidate = await call('GET', '/_probe/admin', { token: tokens.candidate })
    expect(anon.statusCode).toBe(401)
    expect(anon.json().error.code).toBe('UNAUTHENTICATED')
    expect(candidate.statusCode).toBe(403)
    expect(candidate.json().error.code).toBe('FORBIDDEN')
  })

  it('refuses to be built with no roles or an unknown role (fail at startup, not at request time)', () => {
    expect(() => ctx.app.requireRole()).toThrow(/requireRole/)
    expect(() => ctx.app.requireRole('administrator')).toThrow(/requireRole/)
  })
})

describe('programScope', () => {
  it('admin → [] (all programs)', async () => {
    const res = await call('GET', '/_probe/scope', { token: tokens.admin })
    expect(res.json()).toEqual({ programCodes: [] })
  })

  it("reviewer → the reviewer's own programCodes", async () => {
    const res = await call('GET', '/_probe/scope', { token: tokens.reviewer })
    expect(res.json()).toEqual({ programCodes: ['CSE'] })
  })

  it('reviewer with no restriction → [] (all); scope is read from the database, not the token', async () => {
    const open = await createUser({ role: 'reviewer', reviewer: { programCodes: [] } })
    expect((await call('GET', '/_probe/scope', { token: signAccessToken(open, config) })).json()).toEqual({ programCodes: [] })
    // Re-scoped after the token was issued: the new scope applies immediately.
    await User.updateOne({ _id: users.reviewer._id }, { $set: { 'reviewer.programCodes': ['CSE', 'SWE'] } })
    try {
      expect((await call('GET', '/_probe/scope', { token: tokens.reviewer })).json()).toEqual({ programCodes: ['CSE', 'SWE'] })
    } finally {
      await User.updateOne({ _id: users.reviewer._id }, { $set: { 'reviewer.programCodes': ['CSE'] } })
    }
  })

  it('candidate → refused (403), never "all"', async () => {
    const res = await call('GET', '/_probe/scope', { token: tokens.candidate })
    expect(res.statusCode).toBe(403)
  })

  it('a token cannot widen its own scope: a `pc` claim for another program is ignored', async () => {
    const token = sign({ sub: String(users.reviewer._id), role: 'reviewer', pc: ['LAW', 'CSE'] })
    expect((await call('GET', '/_probe/scope', { token })).json()).toEqual({ programCodes: ['CSE'] })
  })
})

describe('authenticate: a valid signature is not enough', () => {
  it('rejects a token whose sub no longer exists', async () => {
    const gone = await createUser({ role: 'admin' })
    const token = signAccessToken(gone, config)
    expect((await call('GET', '/_probe/admin', { token })).statusCode).toBe(200)
    await User.deleteOne({ _id: gone._id })
    const res = await call('GET', '/_probe/admin', { token })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHENTICATED')
  })

  it('rejects a token for a sub that was never an id (well-formed JWT, not an ObjectId, and a random ObjectId)', async () => {
    for (const sub of ['nobody', '', '{"$ne":null}', String(new Types.ObjectId())]) {
      const res = await call('GET', '/auth/me', { token: sign({ sub, role: 'admin' }) })
      expect(res.statusCode, `sub=${sub}`).toBe(401)
    }
    expect((await call('GET', '/auth/me', { token: sign({ role: 'admin' }) })).statusCode).toBe(401) // no sub at all
  })

  it('rejects a token for a disabled user, on every guarded route, and accepts it again once re-enabled', async () => {
    const user = await createUser({ role: 'admin' })
    const token = signAccessToken(user, config)
    expect((await call('GET', '/_probe/admin', { token })).statusCode).toBe(200)
    await User.updateOne({ _id: user._id }, { $set: { status: 'disabled' } })
    for (const url of ['/_probe/admin', '/auth/me']) {
      const res = await call('GET', url, { token })
      expect(res.statusCode, url).toBe(401)
      expect(res.json().error.code, url).toBe('UNAUTHENTICATED')
    }
    await User.updateOne({ _id: user._id }, { $set: { status: 'active' } })
    expect((await call('GET', '/_probe/admin', { token })).statusCode).toBe(200)
  })

  it('takes the role from the database: a demoted admin token no longer opens admin routes', async () => {
    const user = await createUser({ role: 'admin' })
    const token = signAccessToken(user, config) // claims role: admin
    await User.updateOne({ _id: user._id }, { $set: { role: 'candidate' } })
    expect((await call('GET', '/_probe/admin', { token })).statusCode).toBe(403)
  })

  it('a token cannot claim a role it does not have', async () => {
    const token = sign({ sub: String(users.candidate._id), role: 'admin' })
    expect((await call('GET', '/_probe/admin', { token })).statusCode).toBe(403)
  })
})
