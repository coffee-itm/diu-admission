import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Types } from 'mongoose'
import { startTestApp } from './helpers/app.js'
import { createUser } from './helpers/factories.js'
import { loadConfig } from '../src/config.js'
import { signAccessToken } from '../src/modules/auth/service.js'
import { User } from '../src/modules/users/model.js'
import { Program } from '../src/modules/programs/model.js'
import { RefreshToken } from '../src/modules/auth/refreshToken.model.js'
import { AuditLog } from '../src/modules/audit/model.js'
import { updateStaff } from '../src/modules/users/service.js'

const API = '/api/v1'
const config = loadConfig({
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://localhost:27017/unused',
  JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-0123456789',
})

let ctx
let ip = 0
const nextIp = () => `10.8.${Math.floor(++ip / 250)}.${(ip % 250) + 1}`
const call = (method, url, { as, body, query } = {}) =>
  ctx.app.inject({
    method,
    url: `${API}${url}`,
    payload: body,
    query,
    headers: as ? { authorization: `Bearer ${signAccessToken(as, config)}` } : {},
    remoteAddress: nextIp(),
  })

/** Wipe users + audit rows and return the requested starting population. Tests that count admins need an exact set. */
async function fresh({ admins = 1 } = {}) {
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({}), RefreshToken.deleteMany({})])
  const made = []
  for (let i = 0; i < admins; i += 1) made.push(await createUser({ role: 'admin', name: `Admin ${i}` }))
  return made
}

const activeAdmins = () => User.countDocuments({ role: 'admin', status: 'active' })
const auditRows = (filter = {}) => AuditLog.find(filter).lean()

const newStaff = (overrides = {}) => ({
  role: 'reviewer',
  name: 'Rina Reviewer',
  email: `rina-${Math.random().toString(36).slice(2)}@Example.com`,
  password: 'Passw0rd-ok',
  programCodes: ['CSE'],
  ...overrides,
})

beforeAll(async () => {
  ctx = await startTestApp()
  await Promise.all([User.init(), AuditLog.init(), Program.init()])
  await Program.create([
    { _id: 'CSE', name: 'B.Sc. in Computer Science & Engineering', faculty: 'Science & Technology' },
    { _id: 'SWE', name: 'B.Sc. in Software Engineering', faculty: 'Science & Technology' },
    { _id: 'LAW', name: 'LL.B. (Hons)', faculty: 'Arts & Humanities', active: false },
  ])
}, 120_000)
afterAll(() => ctx?.stop())

// ============================================================ criterion 2 — written first
describe('last remaining active admin cannot be demoted or disabled (AC 2)', () => {
  it('demote by role change → 409 LAST_ADMIN; still an active admin; nothing audited', async () => {
    const [only] = await fresh()
    const res = await call('PATCH', `/admin/users/${only.id}`, { as: only, body: { role: 'reviewer', programCodes: ['CSE'] } })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('LAST_ADMIN')
    expect(await activeAdmins()).toBe(1)
    expect((await User.findById(only.id)).role).toBe('admin')
    expect(await auditRows()).toHaveLength(0)
  })

  it('disable by status change → 409 LAST_ADMIN; still active; nothing audited', async () => {
    const [only] = await fresh()
    const res = await call('PATCH', `/admin/users/${only.id}`, { as: only, body: { status: 'disabled' } })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('LAST_ADMIN')
    expect((await User.findById(only.id)).status).toBe('active')
    expect(await auditRows()).toHaveLength(0)
  })

  it('both changes in one request are refused as well', async () => {
    const [only] = await fresh()
    const res = await call('PATCH', `/admin/users/${only.id}`, { as: only, body: { role: 'reviewer', programCodes: ['CSE'], status: 'disabled' } })
    expect(res.statusCode).toBe(409)
    expect(await activeAdmins()).toBe(1)
  })

  it('a second admin that is already DISABLED does not count: still the last active admin', async () => {
    const [a, b] = await fresh({ admins: 2 })
    await User.updateOne({ _id: b._id }, { $set: { status: 'disabled' } })
    for (const body of [{ role: 'reviewer', programCodes: ['CSE'] }, { status: 'disabled' }]) {
      const res = await call('PATCH', `/admin/users/${a.id}`, { as: a, body })
      expect(res.statusCode, JSON.stringify(body)).toBe(409)
      expect(res.json().error.code).toBe('LAST_ADMIN')
    }
    expect(await activeAdmins()).toBe(1)
    expect(await auditRows()).toHaveLength(0)
  })

  it('a demoted second admin does not count either', async () => {
    const [a, b] = await fresh({ admins: 2 })
    await User.updateOne({ _id: b._id }, { $set: { role: 'reviewer', 'reviewer.programCodes': ['CSE'] } })
    const res = await call('PATCH', `/admin/users/${a.id}`, { as: a, body: { status: 'disabled' } })
    expect(res.statusCode).toBe(409)
  })

  it('with a second ACTIVE admin the same changes succeed; the new last admin is then protected', async () => {
    const [a, b] = await fresh({ admins: 2 })
    const demote = await call('PATCH', `/admin/users/${a.id}`, { as: b, body: { role: 'reviewer', programCodes: ['CSE'] } })
    expect(demote.statusCode).toBe(200)
    expect(demote.json().role).toBe('reviewer')
    const self = await call('PATCH', `/admin/users/${b.id}`, { as: b, body: { status: 'disabled' } })
    expect(self.statusCode).toBe(409)
    expect(self.json().error.code).toBe('LAST_ADMIN')
    expect(await activeAdmins()).toBe(1)
  })

  it('changes that do not reduce the active admin count are not blocked (rename / re-enable of a disabled admin)', async () => {
    const [a, b] = await fresh({ admins: 2 })
    await User.updateOne({ _id: b._id }, { $set: { status: 'disabled' } })
    expect((await call('PATCH', `/admin/users/${b.id}`, { as: a, body: { role: 'reviewer', programCodes: ['SWE'] } })).statusCode).toBe(200)
    expect((await call('PATCH', `/admin/users/${b.id}`, { as: a, body: { status: 'active' } })).statusCode).toBe(200)
  })

  it('CONCURRENT: two admins each disable/demote the other at the same moment → exactly one wins, one admin remains', async () => {
    // Called at service level because over HTTP the loser's own token may already be dead; the race is in the service.
    // Without a serialisation point this is classic write skew: both transactions see "the other admin is active"
    // and both commit, leaving zero admins.
    for (let round = 0; round < 12; round += 1) {
      const [a, b] = await fresh({ admins: 2 })
      const settled = await Promise.allSettled([
        updateStaff({ actorId: String(a._id) }, String(b._id), { status: 'disabled' }),
        updateStaff({ actorId: String(b._id) }, String(a._id), { role: 'reviewer', programCodes: ['CSE'] }),
      ])
      const won = settled.filter((s) => s.status === 'fulfilled')
      const lost = settled.filter((s) => s.status === 'rejected')
      expect(won, `round ${round}`).toHaveLength(1)
      expect(lost, `round ${round}`).toHaveLength(1)
      expect(lost[0].reason.code).toBe('LAST_ADMIN')
      expect(await activeAdmins(), `round ${round}`).toBe(1)
      expect(await auditRows(), `round ${round}`).toHaveLength(1)
    }
  }, 60_000)
})

// ============================================================ AC 3 — every endpoint, both non-admin roles
describe('candidate and reviewer get 403 on every endpoint; anonymous gets 401 (AC 3)', () => {
  it.each([
    ['GET', '/admin/users', undefined],
    ['POST', '/admin/users', newStaff()],
    ['PATCH', '/admin/users/:id', { status: 'disabled' }],
    // an empty body would 422 for the admin: wrong-role callers must be stopped before validation
    ['POST', '/admin/users', {}],
    ['PATCH', '/admin/users/:id', {}],
  ])('%s %s', async (method, path, body) => {
    const [admin] = await fresh()
    const candidate = await createUser({ role: 'candidate' })
    const reviewer = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    const url = path.replace(':id', String(admin._id))
    for (const [who, user] of [['candidate', candidate], ['reviewer', reviewer]]) {
      const res = await call(method, url, { as: user, body })
      expect(res.statusCode, who).toBe(403)
      expect(res.json().error.code).toBe('FORBIDDEN')
    }
    const anon = await call(method, url, { body })
    expect(anon.statusCode).toBe(401)
    expect(await User.countDocuments()).toBe(3) // nothing was created or changed
    expect((await User.findById(admin._id)).status).toBe('active')
    expect(await auditRows()).toHaveLength(0)
  })
})

// ============================================================ create
describe('POST /admin/users', () => {
  let admin
  beforeEach(async () => {
    ;[admin] = await fresh()
  })

  it('creates a reviewer scoped to CSE; no secret fields in the response; hashed with argon2id (AC 1)', async () => {
    const body = newStaff({ email: 'Rina.Reviewer@Example.com' })
    const res = await call('POST', '/admin/users', { as: admin, body })
    expect(res.statusCode).toBe(201)
    const out = res.json()
    expect(Object.keys(out).sort()).toEqual(['emailVerified', 'email', 'id', 'name', 'preferences', 'programCodes', 'role', 'status'].sort())
    expect(out).toMatchObject({ role: 'reviewer', name: 'Rina Reviewer', email: 'rina.reviewer@example.com', programCodes: ['CSE'], status: 'active' })
    expect(res.body).not.toMatch(/passwordHash|argon2|failedLogins|Passw0rd/)

    const row = await User.findById(out.id).select('+passwordHash')
    expect(row.passwordHash).toMatch(/^\$argon2id\$/)
    expect(row.reviewer.programCodes).toEqual(['CSE'])
    // and the account really works: same hashPassword/verifyPassword pair as the login path
    const login = await call('POST', '/auth/login', { body: { email: 'rina.reviewer@example.com', password: 'Passw0rd-ok' } })
    expect(login.statusCode).toBe(200)
    expect(login.json().user.role).toBe('reviewer')
  })

  it('creates an admin (no programCodes)', async () => {
    const res = await call('POST', '/admin/users', { as: admin, body: newStaff({ role: 'admin', programCodes: undefined }) })
    expect(res.statusCode).toBe(201)
    expect(res.json().role).toBe('admin')
    expect(res.json().programCodes).toBeUndefined()
  })

  it('normalises and de-duplicates program codes', async () => {
    const res = await call('POST', '/admin/users', { as: admin, body: newStaff({ programCodes: ['cse', 'CSE', ' swe '] }) })
    expect(res.statusCode).toBe(201)
    expect(res.json().programCodes).toEqual(['CSE', 'SWE'])
  })

  it('a reviewer with no program scope is REJECTED, never silently "all programs" (14 §3.2 carry-over)', async () => {
    for (const programCodes of [undefined, [], null]) {
      const res = await call('POST', '/admin/users', { as: admin, body: newStaff({ programCodes }) })
      expect(res.statusCode, JSON.stringify(programCodes)).toBe(422)
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
    }
    expect(await User.countDocuments({ role: 'reviewer' })).toBe(0)
  })

  it('rejects unknown, inactive and malformed program codes', async () => {
    for (const programCodes of [['NOPE'], ['CSE', 'LAW'], ['C$E'], [''], ['CSE', 5]]) {
      const res = await call('POST', '/admin/users', { as: admin, body: newStaff({ programCodes }) })
      expect(res.statusCode, JSON.stringify(programCodes)).toBe(422)
    }
    expect(await User.countDocuments({ role: 'reviewer' })).toBe(0)
  })

  it('an admin takes no program scope (422 rather than silently dropping it)', async () => {
    const res = await call('POST', '/admin/users', { as: admin, body: newStaff({ role: 'admin', programCodes: ['CSE'] }) })
    expect(res.statusCode).toBe(422)
  })

  it('role must be reviewer or admin: candidates cannot be created here', async () => {
    for (const role of ['candidate', 'root', undefined]) {
      const res = await call('POST', '/admin/users', { as: admin, body: newStaff({ role }) })
      expect(res.statusCode, String(role)).toBe(422)
    }
  })

  it('validates name, email and password strength', async () => {
    for (const bad of [{ name: 'ab' }, { email: 'not-an-email' }, { password: 'short1' }, { password: 'nodigitsatall' }, { password: 'a'.repeat(200) + '1' }]) {
      const res = await call('POST', '/admin/users', { as: admin, body: newStaff(bad) })
      expect(res.statusCode, JSON.stringify(Object.keys(bad))).toBe(422)
    }
  })

  it('duplicate email → 409 EMAIL_TAKEN (case-insensitive); nothing audited for the failure', async () => {
    const body = newStaff({ email: 'dup@example.com' })
    expect((await call('POST', '/admin/users', { as: admin, body })).statusCode).toBe(201)
    const again = await call('POST', '/admin/users', { as: admin, body: { ...body, email: 'DUP@example.com' } })
    expect(again.statusCode).toBe(409)
    expect(again.json().error.code).toBe('EMAIL_TAKEN')
    expect(await auditRows({ action: 'user.create' })).toHaveLength(1)
  })

  it('ignores fields it does not own (status, passwordHash, id)', async () => {
    const res = await call('POST', '/admin/users', {
      as: admin,
      body: { ...newStaff(), status: 'disabled', passwordHash: 'x', id: String(new Types.ObjectId()), emailVerifiedAt: '2020-01-01' },
    })
    expect(res.statusCode).toBe(201)
    const row = await User.findById(res.json().id).select('+passwordHash')
    expect(row.status).toBe('active')
    expect(row.passwordHash).toMatch(/^\$argon2id\$/)
  })
})

// ============================================================ update
describe('PATCH /admin/users/:id', () => {
  let admin
  let reviewer
  beforeEach(async () => {
    ;[admin] = await fresh()
    reviewer = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
  })
  const patch = (target, body, as = admin) => call('PATCH', `/admin/users/${target.id}`, { as, body })

  it('changes a reviewer\'s programs', async () => {
    const res = await patch(reviewer, { programCodes: ['swe', 'CSE'] })
    expect(res.statusCode).toBe(200)
    expect(res.json().programCodes).toEqual(['SWE', 'CSE'])
    expect((await User.findById(reviewer.id)).reviewer.programCodes).toEqual(['SWE', 'CSE'])
  })

  it('an empty programCodes list is REJECTED and the old scope is kept (never widened to "all")', async () => {
    const res = await patch(reviewer, { programCodes: [] })
    expect(res.statusCode).toBe(422)
    expect((await User.findById(reviewer.id)).reviewer.programCodes).toEqual(['CSE'])
    expect(await auditRows()).toHaveLength(0)
  })

  it('unknown / inactive program → 422', async () => {
    expect((await patch(reviewer, { programCodes: ['NOPE'] })).statusCode).toBe(422)
    expect((await patch(reviewer, { programCodes: ['LAW'] })).statusCode).toBe(422)
  })

  it('promote reviewer → admin: scope is cleared, no programCodes needed', async () => {
    const res = await patch(reviewer, { role: 'admin' })
    expect(res.statusCode).toBe(200)
    expect(res.json().role).toBe('admin')
    expect(res.json().programCodes).toBeUndefined()
    expect((await User.findById(reviewer.id)).reviewer?.programCodes ?? []).toEqual([])
  })

  it('demote admin → reviewer needs explicit programCodes (422 without; 200 with)', async () => {
    const other = await createUser({ role: 'admin' })
    const without = await patch(other, { role: 'reviewer' })
    expect(without.statusCode).toBe(422)
    expect((await User.findById(other.id)).role).toBe('admin')
    const empty = await patch(other, { role: 'reviewer', programCodes: [] })
    expect(empty.statusCode).toBe(422)
    const ok = await patch(other, { role: 'reviewer', programCodes: ['SWE'] })
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).toMatchObject({ role: 'reviewer', programCodes: ['SWE'] })
  })

  it('programCodes on an admin → 422', async () => {
    const other = await createUser({ role: 'admin' })
    expect((await patch(other, { programCodes: ['CSE'] })).statusCode).toBe(422)
    expect((await patch(reviewer, { role: 'admin', programCodes: ['CSE'] })).statusCode).toBe(422)
  })

  it('disable → the account is locked out at once (access token and refresh tokens); enable restores it', async () => {
    await RefreshToken.create({ userId: reviewer._id, familyId: 'f1', tokenHash: 'h1', expiresAt: new Date(Date.now() + 1e6) })
    expect((await call('GET', '/auth/me', { as: reviewer })).statusCode).toBe(200)

    const off = await patch(reviewer, { status: 'disabled' })
    expect(off.statusCode).toBe(200)
    expect(off.json().status).toBe('disabled')
    expect((await call('GET', '/auth/me', { as: reviewer })).statusCode).toBe(401)
    expect(await RefreshToken.countDocuments({ userId: reviewer._id, revokedAt: null })).toBe(0)

    const on = await patch(reviewer, { status: 'active' })
    expect(on.json().status).toBe('active')
    expect((await call('GET', '/auth/me', { as: reviewer })).statusCode).toBe(200)
  })

  it('a legacy reviewer whose scope is [] (= all, set outside the API) can still be disabled / enabled', async () => {
    const legacy = await createUser({ role: 'reviewer', reviewer: { programCodes: [] } })
    expect((await patch(legacy, { status: 'disabled' })).statusCode).toBe(200)
    expect((await patch(legacy, { status: 'active' })).statusCode).toBe(200)
  })

  it('empty body, unknown status/role → 422', async () => {
    for (const body of [{}, { status: 'banned' }, { role: 'candidate' }, { role: 'root' }, { unknown: 1 }]) {
      expect((await patch(reviewer, body)).statusCode, JSON.stringify(body)).toBe(422)
    }
  })

  it('unknown id → 404; malformed id → 422; a candidate is not staff → 404 and untouched', async () => {
    const candidate = await createUser({ role: 'candidate' })
    const missing = await patch({ id: String(new Types.ObjectId()) }, { status: 'disabled' })
    expect(missing.statusCode).toBe(404)
    expect(missing.json().error.code).toBe('NOT_FOUND')
    expect((await patch({ id: 'nope' }, { status: 'disabled' })).statusCode).toBe(422)
    expect((await patch(candidate, { role: 'admin' })).statusCode).toBe(404)
    expect((await patch(candidate, { status: 'disabled' })).statusCode).toBe(404)
    expect((await User.findById(candidate.id)).role).toBe('candidate')
  })

  it('a no-op change succeeds but writes nothing and audits nothing', async () => {
    const res = await patch(reviewer, { status: 'active', programCodes: ['CSE'] })
    expect(res.statusCode).toBe(200)
    expect(await auditRows()).toHaveLength(0)
  })

  it('response carries no secrets', async () => {
    const res = await patch(reviewer, { status: 'disabled' })
    expect(res.body).not.toMatch(/passwordHash|argon2|failedLogins/)
    expect(Object.keys(res.json()).sort()).toEqual(['email', 'emailVerified', 'id', 'name', 'preferences', 'programCodes', 'role', 'status'])
  })
})

// ============================================================ AC 4 — audit
describe('audit log: exactly one row per successful write (AC 4)', () => {
  let admin
  beforeEach(async () => {
    ;[admin] = await fresh()
  })

  it('create → one row naming the actor, action and target; no secrets in it', async () => {
    const res = await call('POST', '/admin/users', { as: admin, body: newStaff() })
    const rows = await auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ actorId: admin._id, action: 'user.create', entity: 'User', entityId: res.json().id })
    expect(rows[0].diff.after).toMatchObject({ role: 'reviewer', programCodes: ['CSE'] })
    expect(JSON.stringify(rows[0])).not.toMatch(/passw|argon2|Passw0rd/i)
    expect(rows[0].ip).toEqual(expect.any(String))
    expect(rows[0].createdAt).toBeInstanceOf(Date)
  })

  it('update → one row with a shallow before/after of the changed fields only', async () => {
    const rev = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    await call('PATCH', `/admin/users/${rev.id}`, { as: admin, body: { programCodes: ['SWE'] } })
    const rows = await auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ actorId: admin._id, action: 'user.update', entity: 'User', entityId: String(rev._id) })
    expect(rows[0].diff).toEqual({ before: { programCodes: ['CSE'] }, after: { programCodes: ['SWE'] } })
  })

  it('disable / enable → one row each, named user.disable / user.enable', async () => {
    const rev = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    await call('PATCH', `/admin/users/${rev.id}`, { as: admin, body: { status: 'disabled' } })
    await call('PATCH', `/admin/users/${rev.id}`, { as: admin, body: { status: 'active' } })
    const rows = await AuditLog.find().sort({ createdAt: 1, _id: 1 }).lean()
    expect(rows.map((r) => r.action)).toEqual(['user.disable', 'user.enable'])
    expect(rows[0].diff).toEqual({ before: { status: 'active' }, after: { status: 'disabled' } })
  })

  it('a combined change is still ONE row', async () => {
    const rev = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    await call('PATCH', `/admin/users/${rev.id}`, { as: admin, body: { role: 'admin', status: 'disabled' } })
    expect(await auditRows()).toHaveLength(1)
  })

  it('failed writes (validation, 404, 409) leave no row', async () => {
    await call('POST', '/admin/users', { as: admin, body: newStaff({ programCodes: [] }) })
    await call('PATCH', `/admin/users/${new Types.ObjectId()}`, { as: admin, body: { status: 'disabled' } })
    await call('PATCH', `/admin/users/${admin.id}`, { as: admin, body: { status: 'disabled' } })
    expect(await auditRows()).toHaveLength(0)
  })

  it('the write and its audit row are one unit: if the audit insert fails, the user change is rolled back', async () => {
    vi.spyOn(AuditLog, 'create').mockRejectedValue(new Error('audit down'))
    const created = await call('POST', '/admin/users', { as: admin, body: newStaff({ email: 'rollback@example.com' }) })
    expect(created.statusCode).toBe(500)
    expect(await User.countDocuments({ email: 'rollback@example.com' })).toBe(0)

    const rev = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    const updated = await call('PATCH', `/admin/users/${rev.id}`, { as: admin, body: { status: 'disabled' } })
    expect(updated.statusCode).toBe(500)
    expect((await User.findById(rev.id)).status).toBe('active')
  })
})

// ============================================================ AC 5 — list
describe('GET /admin/users (AC 5)', () => {
  let admin
  beforeEach(async () => {
    ;[admin] = await fresh()
  })

  it('returns { items, page, limit, total }, staff only, never candidates, no secrets', async () => {
    await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    await createUser({ role: 'candidate' })
    const res = await call('GET', '/admin/users', { as: admin })
    expect(res.statusCode).toBe(200)
    const out = res.json()
    expect(out).toMatchObject({ page: 1, limit: 20, total: 2 })
    expect(out.items.map((u) => u.role).sort()).toEqual(['admin', 'reviewer'])
    expect(res.body).not.toMatch(/passwordHash|argon2|failedLogins/)
  })

  it('filters by role', async () => {
    await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    await createUser({ role: 'reviewer', reviewer: { programCodes: ['SWE'] } })
    const rev = (await call('GET', '/admin/users', { as: admin, query: { role: 'reviewer' } })).json()
    expect(rev.total).toBe(2)
    expect(rev.items.every((u) => u.role === 'reviewer')).toBe(true)
    const adm = (await call('GET', '/admin/users', { as: admin, query: { role: 'admin' } })).json()
    expect(adm.total).toBe(1)
  })

  it('role=candidate (or anything else) is a 422, not an empty list', async () => {
    for (const role of ['candidate', 'root']) {
      expect((await call('GET', '/admin/users', { as: admin, query: { role } })).statusCode, role).toBe(422)
    }
  })

  it('paginates with a stable sort: no repeats or gaps across pages, even when createdAt ties', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const docs = []
    for (let i = 0; i < 7; i += 1) docs.push(await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] }, createdAt }))
    await User.updateMany({ role: 'reviewer' }, { $set: { createdAt } }) // identical timestamps on purpose
    const seen = []
    for (let page = 1; page <= 4; page += 1) {
      const res = await call('GET', '/admin/users', { as: admin, query: { role: 'reviewer', page, limit: 3 } })
      const out = res.json()
      expect(out).toMatchObject({ page, limit: 3, total: 7 })
      seen.push(...out.items.map((u) => u.id))
    }
    expect(seen).toHaveLength(7)
    expect(new Set(seen).size).toBe(7)
    expect(new Set(seen)).toEqual(new Set(docs.map((d) => String(d._id))))
    // same request twice → same order
    const a = (await call('GET', '/admin/users', { as: admin, query: { role: 'reviewer', limit: 7 } })).json().items.map((u) => u.id)
    const b = (await call('GET', '/admin/users', { as: admin, query: { role: 'reviewer', limit: 7 } })).json().items.map((u) => u.id)
    expect(a).toEqual(b)
  })

  it('newest first', async () => {
    const old = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    // `createdAt` is schema-immutable (set by the timestamps plugin): a plain $set is silently dropped
    // by Mongoose on update, so backdating this fixture needs an explicit overwriteImmutable.
    await User.updateOne({ _id: old._id }, { $set: { createdAt: new Date('2020-01-01') } }, { overwriteImmutable: true })
    const items = (await call('GET', '/admin/users', { as: admin })).json().items
    expect(items.at(-1).id).toBe(String(old._id))
  })

  it('rejects bad paging (page 0, limit 0 / 101, non-numeric)', async () => {
    for (const query of [{ page: 0 }, { limit: 0 }, { limit: 101 }, { page: 'x' }]) {
      expect((await call('GET', '/admin/users', { as: admin, query })).statusCode, JSON.stringify(query)).toBe(422)
    }
  })

  it('a page past the end is an empty page, not an error', async () => {
    const out = (await call('GET', '/admin/users', { as: admin, query: { page: 9 } })).json()
    expect(out.items).toEqual([])
    expect(out.total).toBe(1)
  })
})
