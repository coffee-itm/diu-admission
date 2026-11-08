import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { startTestApp } from './helpers/app.js'
import { createUser, TEST_PASSWORD } from './helpers/factories.js'
import { loadConfig } from '../src/config.js'
import { User } from '../src/modules/users/model.js'
import { Program } from '../src/modules/programs/model.js'
import { RefreshToken } from '../src/modules/auth/refreshToken.model.js'
import { verifyAccessToken } from '../src/modules/auth/service.js'
import { toPublicUser } from '../src/modules/users/toPublicUser.js'

const config = loadConfig({
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://localhost:27017/unused',
  JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-0123456789',
})

const COOKIE = 'diu_rt'
const API = '/api/v1'

let ctx
let ipCounter = 0
let phoneCounter = 0

// Every request gets its own client IP unless told otherwise: the login/register per-IP limit (10/min)
// must not couple unrelated tests together.
const freshIp = () => `10.1.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`

function call(method, path, { body, cookie, headers, ip } = {}) {
  return ctx.app.inject({
    method,
    url: `${API}${path}`,
    payload: body,
    headers,
    cookies: cookie ? { [COOKIE]: cookie } : undefined,
    remoteAddress: ip ?? freshIp(),
  })
}

const cookieOf = (res) => res.cookies.find((c) => c.name === COOKIE)

function registration(overrides = {}) {
  phoneCounter += 1
  return {
    name: 'Rahim Uddin',
    email: `rahim-${phoneCounter}-${Math.random().toString(36).slice(2)}@Example.com`,
    phone: `+88017${String(10_000_000 + phoneCounter)}`,
    password: 'Passw0rd-ok',
    programCode: 'CSE',
    sscGpa: 4.5,
    hscGpa: 4.75,
    hscGroup: 'science',
    ...overrides,
  }
}

/** Register through HTTP and return the pieces later steps need. */
async function registerViaHttp(overrides) {
  const body = registration(overrides)
  const res = await call('POST', '/auth/register', { body })
  expect(res.statusCode).toBe(201)
  return { body, res, cookie: cookieOf(res).value, accessToken: res.json().accessToken }
}

beforeAll(async () => {
  ctx = await startTestApp()
  await Promise.all([User.init(), RefreshToken.init(), Program.init()])
  await Program.create([
    { _id: 'CSE', name: 'B.Sc. in Computer Science & Engineering', faculty: 'Science & Technology' },
    { _id: 'LAW', name: 'LL.B. (Hons.) in Law', faculty: 'Arts & Humanities', active: false },
  ])
})
afterAll(async () => {
  await ctx?.stop()
})
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})])
})

// ------------------------------------------------------------------ highest-value tests first

describe('no user enumeration (criterion 4)', () => {
  it('a wrong password and an unknown email produce identical 401 responses', async () => {
    const user = await createUser({ email: 'known@example.com' })

    const wrongPassword = await call('POST', '/auth/login', { body: { email: user.email, password: 'Wrong-password-1' } })
    const unknownEmail = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'Wrong-password-1' } })

    expect(wrongPassword.statusCode).toBe(401)
    expect(unknownEmail.statusCode).toBe(wrongPassword.statusCode)
    // Byte-identical bodies, not just matching fields.
    expect(unknownEmail.body).toBe(wrongPassword.body)
    expect(wrongPassword.json()).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    })
    // Neither sets a session cookie.
    expect(cookieOf(wrongPassword)).toBeUndefined()
    expect(cookieOf(unknownEmail)).toBeUndefined()
  })

  it('a disabled account with the correct password is indistinguishable too', async () => {
    const user = await createUser({ status: 'disabled' })
    const disabled = await call('POST', '/auth/login', { body: { email: user.email, password: TEST_PASSWORD } })
    const unknown = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: TEST_PASSWORD } })
    expect(disabled.statusCode).toBe(401)
    expect(disabled.body).toBe(unknown.body)
  })
})

describe('refresh-token reuse over HTTP (criterion 6)', () => {
  it('replaying a rotated cookie → 401 AND the whole family is revoked in the DB', async () => {
    const { cookie: first } = await registerViaHttp()

    const rotated = await call('POST', '/auth/refresh', { cookie: first })
    expect(rotated.statusCode).toBe(200)
    const second = cookieOf(rotated).value
    expect(second).not.toBe(first)

    // A third generation, so the "live successor" is really live before the replay.
    const rotatedAgain = await call('POST', '/auth/refresh', { cookie: second })
    expect(rotatedAgain.statusCode).toBe(200)
    const third = cookieOf(rotatedAgain).value
    expect(await RefreshToken.countDocuments({ revokedAt: null, replacedBy: null })).toBe(1) // only `third` is live

    // Attacker replays the first (already rotated) cookie.
    const replay = await call('POST', '/auth/refresh', { cookie: first })
    expect(replay.statusCode).toBe(401)
    expect(replay.json().error.code).toBe('UNAUTHENTICATED')

    const rows = await RefreshToken.find({})
    expect(rows).toHaveLength(3)
    expect(rows.filter((r) => !r.revokedAt && !r.replacedBy)).toHaveLength(0) // no live token left
    expect(rows.every((r) => r.revokedAt || r.replacedBy)).toBe(true)
    expect(new Set(rows.map((r) => r.familyId)).size).toBe(1)

    // The legitimate holder's newest cookie no longer works either.
    const legit = await call('POST', '/auth/refresh', { cookie: third })
    expect(legit.statusCode).toBe(401)
  })
})

// ------------------------------------------------------------------ register

describe('POST /auth/register', () => {
  it('201 { user, accessToken }, sets diu_rt, and the body has no passwordHash (criteria 1, 5)', async () => {
    const body = registration()
    const res = await call('POST', '/auth/register', { body })

    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(Object.keys(json).sort()).toEqual(['accessToken', 'user'])
    expect(res.body).not.toMatch(/passwordHash|argon2|failedLogins/)
    expect(json.user).toMatchObject({
      role: 'candidate',
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      emailVerified: false,
      programCode: 'CSE',
      preferences: { lang: 'en' },
    })
    expect(verifyAccessToken(json.accessToken, config)).toMatchObject({ sub: json.user.id, role: 'candidate' })

    const cookie = cookieOf(res)
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/v1/auth' })
    expect(cookie.secure).toBeFalsy() // COOKIE_SECURE=false in the test env
    expect(cookie.value.length).toBeGreaterThanOrEqual(43)

    const stored = await User.findById(json.user.id).select('+passwordHash')
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/)
    expect(stored.candidate).toMatchObject({ programCode: 'CSE', sscGpa: 4.5, hscGpa: 4.75, hscGroup: 'science' })
  })

  // FR-AUTH-01 (widened 2026-11-08): ^(?:\+?880|0)?1[3-9]\d{8}$, stored as +8801XXXXXXXXX.
  it.each([
    ['national with leading 0', '01712345678'],
    ['bare subscriber number', '1712345678'],
    ['country code without +', '8801712345678'],
    ['E.164', '+8801712345678'],
    ['E.164 with surrounding whitespace', '  +8801712345678  '],
  ])('accepts the %s form (%s) and stores +8801712345678', async (_label, input) => {
    const res = await call('POST', '/auth/register', { body: registration({ phone: input }) })
    expect(res.statusCode).toBe(201)
    expect(res.json().user.phone).toBe('+8801712345678')
    const stored = await User.findById(res.json().user.id)
    expect(stored.phone).toBe('+8801712345678')
  })

  it.each([
    ['01312345678', '+8801312345678'],
    ['01912345678', '+8801912345678'],
    ['8801812345678', '+8801812345678'],
    ['1512345678', '+8801512345678'],
  ])('every valid operator digit (1[3-9]) normalises: %s → %s', async (input, expected) => {
    const res = await call('POST', '/auth/register', { body: registration({ phone: input }) })
    expect(res.statusCode).toBe(201)
    expect(res.json().user.phone).toBe(expected)
  })

  it('the four input forms collide on the same stored value: a second one is rejected as a duplicate phone', async () => {
    expect((await call('POST', '/auth/register', { body: registration({ phone: '01712345678' }) })).statusCode).toBe(201)
    for (const form of ['1712345678', '8801712345678', '+8801712345678']) {
      const res = await call('POST', '/auth/register', { body: registration({ phone: form }) })
      expect(res.statusCode).toBe(422)
      expect(res.json().error.details.map((d) => d.path)).toContain('phone')
    }
  })

  it.each([
    ['operator digit 2 (not 3-9)', '01212345678'],
    ['operator digit 0', '01012345678'],
    ['operator digit 2 with +880', '+8801212345678'],
    ['too short (9 digits after 0)', '0171234567'],
    ['too short, bare', '171234567'],
    ['too long (national)', '017123456789'],
    ['too long (E.164)', '+88017123456789'],
    ['letters', '0171234567a'],
    ['all letters', 'abcdefghijk'],
    ['wrong country code', '+9101712345678'],
    ['double zero prefix', '001712345678'],
    ['inner spaces', '0171 234 5678'],
    ['empty', ''],
  ])('rejects %s (%s) with 422 on phone', async (_label, input) => {
    const res = await call('POST', '/auth/register', { body: registration({ phone: input }) })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
    expect(res.json().error.details.map((d) => d.path)).toContain('phone')
    expect(await User.countDocuments()).toBe(0)
  })

  it('ignores a role in the body: the user is always a candidate (criterion 2, FR-AUTH-10)', async () => {
    for (const role of ['admin', 'reviewer']) {
      const res = await call('POST', '/auth/register', { body: { ...registration(), role } })
      expect(res.statusCode).toBe(201)
      expect(res.json().user.role).toBe('candidate')
      expect(verifyAccessToken(res.json().accessToken, config).role).toBe('candidate')
      const stored = await User.findById(res.json().user.id)
      expect(stored.role).toBe('candidate')
    }
  })

  it('invalid input → 422 VALIDATION_ERROR with per-field details (criterion 3)', async () => {
    const res = await call('POST', '/auth/register', {
      body: { name: 'ab', email: 'not-an-email', phone: '12345', password: 'short', programCode: 'cse1', sscGpa: 5.5, hscGpa: -1, hscGroup: 'music' },
    })
    expect(res.statusCode).toBe(422)
    const { error } = res.json()
    expect(error.code).toBe('VALIDATION_ERROR')
    const paths = error.details.map((d) => d.path)
    for (const field of ['name', 'email', 'phone', 'password', 'sscGpa', 'hscGpa', 'hscGroup']) {
      expect(paths).toContain(field)
    }
    expect(res.body).not.toContain('short') // never echo the password back
  })

  it('rejects missing fields', async () => {
    const res = await call('POST', '/auth/register', { body: {} })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.details.length).toBeGreaterThanOrEqual(8)
  })

  it.each([
    ['no digit', 'OnlyLetters'],
    ['no letter', '12345678'],
    ['too short', 'Ab1'],
    ['over the 128-char cap (argon2 DoS)', `Aa1${'x'.repeat(126)}`],
  ])('password: %s → 422 on `password`', async (_label, password) => {
    const res = await call('POST', '/auth/register', { body: registration({ password }) })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.details.map((d) => d.path)).toContain('password')
  })

  it('accepts a 128-char password', async () => {
    const res = await call('POST', '/auth/register', { body: registration({ password: `Aa1${'x'.repeat(125)}` }) })
    expect(res.statusCode).toBe(201)
  })

  it('name is 3–100 chars; GPA bounds are inclusive 0–5', async () => {
    expect((await call('POST', '/auth/register', { body: registration({ name: 'x'.repeat(101) }) })).statusCode).toBe(422)
    expect((await call('POST', '/auth/register', { body: registration({ name: 'x'.repeat(100), sscGpa: 0, hscGpa: 5 }) })).statusCode).toBe(201)
  })

  it('an unknown or inactive program → 422 on `programCode`', async () => {
    for (const programCode of ['NOPE', 'LAW']) {
      const res = await call('POST', '/auth/register', { body: registration({ programCode }) })
      expect(res.statusCode).toBe(422)
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
      expect(res.json().error.details.map((d) => d.path)).toContain('programCode')
    }
    expect(await User.countDocuments()).toBe(0)
  })

  it('duplicate email (case-insensitive) → 409 EMAIL_TAKEN', async () => {
    const body = registration({ email: 'Dup@Example.com' })
    expect((await call('POST', '/auth/register', { body })).statusCode).toBe(201)
    const again = await call('POST', '/auth/register', { body: { ...registration(), email: 'dup@example.COM' } })
    expect(again.statusCode).toBe(409)
    expect(again.json().error.code).toBe('EMAIL_TAKEN')
    expect(cookieOf(again)).toBeUndefined()
    expect(await User.countDocuments()).toBe(1)
  })

  it('duplicate phone → 422 on `phone` (no documented 409 code for it)', async () => {
    const first = registration()
    expect((await call('POST', '/auth/register', { body: first })).statusCode).toBe(201)
    const res = await call('POST', '/auth/register', { body: registration({ phone: first.phone }) })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.details.map((d) => d.path)).toContain('phone')
  })
})

// ------------------------------------------------------------------ response mapper

describe('toPublicUser (criterion 1b)', () => {
  const FORBIDDEN = /passwordHash|\$argon2|failedLogins|lockedUntil|__v|_id/
  const PUBLIC_KEYS = ['email', 'emailVerified', 'id', 'name', 'phone', 'preferences', 'programCode', 'role']

  it('strips the hash from every shape that bypasses toJSON', async () => {
    const created = await createUser({
      phone: '+8801711111111',
      candidate: { programCode: 'CSE', sscGpa: 4, hscGpa: 4, hscGroup: 'science' },
      failedLogins: { count: 3 },
    })

    const withHash = await User.findById(created.id).select('+passwordHash')
    const lean = await User.findById(created.id).select('+passwordHash').lean()
    const [aggregated] = await User.aggregate([{ $match: { _id: created._id } }])
    const shapes = {
      'document with +passwordHash': withHash,
      '.toObject()': withHash.toObject(),
      '.lean() with +passwordHash': lean,
      'aggregate()': aggregated,
      'unsaved document': created,
    }

    // Prove the premise: the raw shapes really do carry the hash.
    expect(JSON.stringify(withHash.toObject())).toMatch(/\$argon2id/)
    expect(JSON.stringify(lean)).toMatch(/\$argon2id/)
    expect(JSON.stringify(aggregated)).toMatch(/\$argon2id/)

    for (const [label, source] of Object.entries(shapes)) {
      const out = toPublicUser(source)
      expect(JSON.stringify(out), label).not.toMatch(FORBIDDEN)
      expect(Object.keys(out).sort(), label).toEqual(PUBLIC_KEYS)
      expect(out.id, label).toBe(created.id)
    }
  })

  it('maps reviewers to programCodes (no programCode) and never leaks candidate-only data', async () => {
    const reviewer = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    const out = toPublicUser(await User.findById(reviewer.id).select('+passwordHash').lean())
    expect(out.programCodes).toEqual(['CSE'])
    expect(out).not.toHaveProperty('programCode')
    expect(JSON.stringify(out)).not.toMatch(FORBIDDEN)
  })

  it('emailVerified is derived from emailVerifiedAt', async () => {
    const user = await createUser({ emailVerifiedAt: new Date() })
    expect(toPublicUser(user).emailVerified).toBe(true)
    expect(toPublicUser(await createUser()).emailVerified).toBe(false)
  })
})

// ------------------------------------------------------------------ login

describe('POST /auth/login', () => {
  it('200 { user, accessToken } + cookie; resets the failure counter and stamps lastLoginAt', async () => {
    const user = await createUser({ failedLogins: { count: 2 } })
    const res = await call('POST', '/auth/login', { body: { email: user.email.toUpperCase(), password: TEST_PASSWORD } })

    expect(res.statusCode).toBe(200)
    expect(Object.keys(res.json()).sort()).toEqual(['accessToken', 'user'])
    expect(res.body).not.toMatch(/passwordHash|argon2|failedLogins/)
    expect(res.json().user.id).toBe(user.id)
    expect(verifyAccessToken(res.json().accessToken, config).sub).toBe(user.id)
    expect(cookieOf(res)).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/v1/auth' })

    const stored = await User.findById(user.id)
    expect(stored.failedLogins.count).toBe(0)
    expect(stored.lastLoginAt).toBeInstanceOf(Date)
    expect(await RefreshToken.countDocuments({ userId: user.id })).toBe(1)
  })

  it('validates the body (422), incl. the password length cap', async () => {
    const empty = await call('POST', '/auth/login', { body: {} })
    expect(empty.statusCode).toBe(422)
    const huge = await call('POST', '/auth/login', { body: { email: 'a@b.co', password: 'x'.repeat(129) } })
    expect(huge.statusCode).toBe(422)
    expect(huge.json().error.details.map((d) => d.path)).toContain('password')
  })

  it('5 failed logins lock the account, yet every response is the identical generic 401 (criterion 7, FR-AUTH-02)', async () => {
    const user = await createUser()
    const unknown = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'Wrong-password-1' } })
    expect(unknown.statusCode).toBe(401)

    // Attempts 1-4, the locking attempt 5, and attempts 6-8 made while locked.
    const responses = []
    for (let i = 0; i < 8; i += 1) {
      responses.push(await call('POST', '/auth/login', { body: { email: user.email, password: 'Wrong-password-1' } }))
      if (i === 3) expect((await User.findById(user.id)).failedLogins.lockedUntil).toBeUndefined() // not locked yet
      if (i === 4) expect((await User.findById(user.id)).failedLogins.lockedUntil).toBeInstanceOf(Date) // locked by attempt 5
    }

    for (const [i, res] of responses.entries()) {
      expect(res.statusCode, `attempt ${i + 1}`).toBe(401)
      expect(res.statusCode, `attempt ${i + 1}`).not.toBe(429)
      // Byte-identical to the unknown-email response: same status, same body, no extra headers of note.
      expect(res.body, `attempt ${i + 1}`).toBe(unknown.body)
      expect(res.headers['content-type'], `attempt ${i + 1}`).toBe(unknown.headers['content-type'])
      expect(res.headers['retry-after'], `attempt ${i + 1}`).toBeUndefined()
      expect(cookieOf(res)).toBeUndefined()
    }

    // The account is genuinely locked in the DB; the lock is not extended by attempts 6-8.
    const stored = await User.findById(user.id)
    expect(stored.failedLogins.count).toBe(5)
    expect(stored.failedLogins.lockedUntil.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000)
    expect(stored.failedLogins.lockedUntil.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000)
  })

  it('the lock blocks login: after it trips, the correct password is the same generic 401 and issues nothing', async () => {
    const user = await createUser()
    for (let i = 0; i < 5; i += 1) await call('POST', '/auth/login', { body: { email: user.email, password: 'Wrong-password-1' } })
    const unknown = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: TEST_PASSWORD } })

    const res = await call('POST', '/auth/login', { body: { email: user.email, password: TEST_PASSWORD } })
    expect(res.statusCode).toBe(401)
    expect(res.body).toBe(unknown.body)
    expect(await RefreshToken.countDocuments()).toBe(0)
  })

  it('a CORRECT password during an active lock still returns 401 and issues nothing', async () => {
    const user = await createUser({ failedLogins: { count: 5, lockedUntil: new Date(Date.now() + 10 * 60_000) } })
    const res = await call('POST', '/auth/login', { body: { email: user.email, password: TEST_PASSWORD } })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
    // Same body as any other failed login: a locked account cannot be told apart by a correct guess.
    const wrong = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: TEST_PASSWORD } })
    expect(res.body).toBe(wrong.body)
    expect(cookieOf(res)).toBeUndefined()
    expect(res.json().accessToken).toBeUndefined()
    expect(await RefreshToken.countDocuments()).toBe(0)
    const stored = await User.findById(user.id)
    expect(stored.failedLogins.lockedUntil.getTime()).toBeGreaterThan(Date.now()) // lock untouched, not extended
    expect(stored.failedLogins.count).toBe(5)
  })

  it('a locked account stays locked for the full window, then works again once it expires', async () => {
    const user = await createUser({ failedLogins: { count: 5, lockedUntil: new Date(Date.now() + 60_000) } })
    const body = { email: user.email, password: TEST_PASSWORD }
    expect((await call('POST', '/auth/login', { body })).statusCode).toBe(401)

    await User.updateOne({ _id: user._id }, { $set: { 'failedLogins.lockedUntil': new Date(Date.now() - 1000) } })
    const ok = await call('POST', '/auth/login', { body })
    expect(ok.statusCode).toBe(200)
    const stored = await User.findById(user.id)
    expect(stored.failedLogins.count).toBe(0)
    expect(stored.failedLogins.lockedUntil).toBeUndefined()
  })

  it('per-IP limit: the 11th login attempt within a minute from one IP → 429', async () => {
    const ip = '192.0.2.77'
    const statuses = []
    for (let i = 0; i < 11; i += 1) {
      const res = await call('POST', '/auth/login', { ip, body: { email: `nobody-${i}@example.com`, password: 'Wrong-password-1' } })
      statuses.push(res.statusCode)
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true)
    expect(statuses[10]).toBe(429)
  })
})

// ------------------------------------------------------------------ refresh

describe('POST /auth/refresh', () => {
  it('rotates the cookie and returns { accessToken, user } (criterion 6)', async () => {
    const { cookie, res: registered } = await registerViaHttp()
    const res = await call('POST', '/auth/refresh', { cookie })

    expect(res.statusCode).toBe(200)
    expect(Object.keys(res.json()).sort()).toEqual(['accessToken', 'user'])
    expect(res.body).not.toMatch(/passwordHash|argon2/)
    expect(res.json().user.id).toBe(registered.json().user.id)
    expect(verifyAccessToken(res.json().accessToken, config).sub).toBe(registered.json().user.id)
    expect(cookieOf(res)).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/v1/auth' })
    expect(cookieOf(res).value).not.toBe(cookie)
    expect(await RefreshToken.countDocuments({ replacedBy: null, revokedAt: null })).toBe(1)
  })

  it('no cookie, or a garbage cookie → 401 UNAUTHENTICATED', async () => {
    for (const cookie of [undefined, 'garbage', 'x'.repeat(500)]) {
      const res = await call('POST', '/auth/refresh', { cookie })
      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('UNAUTHENTICATED')
    }
  })

  it('a failed refresh clears the stale cookie', async () => {
    const res = await call('POST', '/auth/refresh', { cookie: 'garbage' })
    const cleared = cookieOf(res)
    expect(cleared).toBeDefined()
    expect(cleared.value).toBe('')
    expect(cleared.path).toBe('/api/v1/auth')
  })

  it('a disabled account cannot refresh', async () => {
    const { cookie, res } = await registerViaHttp()
    await User.updateOne({ _id: res.json().user.id }, { status: 'disabled' })
    expect((await call('POST', '/auth/refresh', { cookie })).statusCode).toBe(401)
  })

  it('CSRF: a request from a foreign Origin → 403, with the token left intact', async () => {
    const { cookie } = await registerViaHttp()
    const evil = await call('POST', '/auth/refresh', { cookie, headers: { origin: 'https://evil.example' } })
    expect(evil.statusCode).toBe(403)
    expect(evil.json().error.code).toBe('FORBIDDEN')
    expect(cookieOf(evil)).toBeUndefined()
    // Still usable from the real origin (and with no Origin header, e.g. non-browser clients).
    expect((await call('POST', '/auth/refresh', { cookie, headers: { origin: 'http://localhost:5173' } })).statusCode).toBe(200)
  })
})

// ------------------------------------------------------------------ logout

describe('POST /auth/logout', () => {
  it('204, clears the cookie, and the refresh token no longer works (criterion 8)', async () => {
    const { cookie } = await registerViaHttp()
    const res = await call('POST', '/auth/logout', { cookie })

    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
    const cleared = cookieOf(res)
    expect(cleared.value).toBe('')
    expect(cleared.path).toBe('/api/v1/auth')
    expect(cleared.httpOnly).toBe(true)
    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(0)

    const refresh = await call('POST', '/auth/refresh', { cookie })
    expect(refresh.statusCode).toBe(401)
  })

  it('logging out with an older, already-rotated cookie still kills the live successor', async () => {
    const { cookie: first } = await registerViaHttp()
    const rotated = await call('POST', '/auth/refresh', { cookie: first })
    const second = cookieOf(rotated).value
    expect((await call('POST', '/auth/logout', { cookie: first })).statusCode).toBe(204)
    expect((await call('POST', '/auth/refresh', { cookie: second })).statusCode).toBe(401)
  })

  it('is idempotent: no cookie → 204', async () => {
    expect((await call('POST', '/auth/logout')).statusCode).toBe(204)
  })

  it('a foreign Origin → 403', async () => {
    const { cookie } = await registerViaHttp()
    const res = await call('POST', '/auth/logout', { cookie, headers: { origin: 'https://evil.example' } })
    expect(res.statusCode).toBe(403)
    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(1)
  })
})

// ------------------------------------------------------------------ me

describe('GET /auth/me', () => {
  const bearer = (token) => ({ authorization: `Bearer ${token}` })

  it('returns exactly the 15 §2 field list for a candidate (criterion 9)', async () => {
    const { accessToken, body } = await registerViaHttp()
    const res = await call('GET', '/auth/me', { headers: bearer(accessToken) })

    expect(res.statusCode).toBe(200)
    expect(Object.keys(res.json())).toEqual(['user'])
    expect(Object.keys(res.json().user).sort()).toEqual(
      ['email', 'emailVerified', 'id', 'name', 'phone', 'preferences', 'programCode', 'role'],
    )
    expect(res.json().user).toMatchObject({ email: body.email.toLowerCase(), programCode: 'CSE', role: 'candidate' })
    expect(res.body).not.toMatch(/passwordHash|argon2|failedLogins/)
  })

  it('a reviewer gets programCodes instead of programCode', async () => {
    const reviewer = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE'] } })
    const login = await call('POST', '/auth/login', { body: { email: reviewer.email, password: TEST_PASSWORD } })
    const res = await call('GET', '/auth/me', { headers: bearer(login.json().accessToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().user).toMatchObject({ role: 'reviewer', programCodes: ['CSE'] })
    expect(res.json().user).not.toHaveProperty('programCode')
  })

  it('401 UNAUTHENTICATED without a token, with a malformed header, or with a bad token', async () => {
    for (const headers of [undefined, { authorization: 'Bearer' }, { authorization: 'Basic abc' }, bearer('not.a.jwt')]) {
      const res = await call('GET', '/auth/me', { headers })
      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('UNAUTHENTICATED')
    }
  })

  it('401 once the account is disabled or deleted', async () => {
    const { accessToken, res } = await registerViaHttp()
    await User.updateOne({ _id: res.json().user.id }, { status: 'disabled' })
    expect((await call('GET', '/auth/me', { headers: bearer(accessToken) })).statusCode).toBe(401)
    await User.deleteMany({})
    expect((await call('GET', '/auth/me', { headers: bearer(accessToken) })).statusCode).toBe(401)
  })
})
