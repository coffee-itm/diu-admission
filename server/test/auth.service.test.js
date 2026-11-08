import { createHash } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createSigner } from 'fast-jwt'
import { startTestApp } from './helpers/app.js'
import { createUser, TEST_PASSWORD } from './helpers/factories.js'
import { loadConfig } from '../src/config.js'
import { User } from '../src/modules/users/model.js'
import { RefreshToken } from '../src/modules/auth/refreshToken.model.js'
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeAllForUser,
  registerFailedLogin,
  clearFailedLogins,
  isLocked,
} from '../src/modules/auth/service.js'

const config = loadConfig({
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://localhost:27017/unused',
  JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-0123456789',
  JWT_ACCESS_TTL: '15m',
  REFRESH_TTL_DAYS: '7',
})

const sha256 = (s) => createHash('sha256').update(s).digest('hex')
const decodePayload = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
const expectUnauthenticated = (p) =>
  expect(p).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })

describe('auth service (T-045)', () => {
  let ctx
  beforeAll(async () => {
    ctx = await startTestApp()
    await Promise.all([User.init(), RefreshToken.init()])
  })
  afterAll(async () => {
    await ctx?.stop()
  })
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})])
  })

  describe('refresh-token reuse detection (criterion 3)', () => {
    it('revokes every row in the family when an already-rotated token is presented', async () => {
      const user = await createUser()
      const first = await issueRefreshToken(user.id, 'ua', config)
      const second = await rotateRefreshToken(first.token, 'ua', config)
      const third = await rotateRefreshToken(second.token, 'ua', config)

      // Another login (different family) must be untouched.
      const other = await issueRefreshToken(user.id, 'other-device', config)

      const familyBefore = await RefreshToken.find({ familyId: first.familyId })
      expect(familyBefore).toHaveLength(3)
      // Rotation alone revokes nothing: only the two old rows are marked replaced.
      expect(familyBefore.filter((r) => r.revokedAt)).toHaveLength(0)

      // Theft: the ORIGINAL token is presented again.
      await expectUnauthenticated(rotateRefreshToken(first.token, 'attacker', config))

      const family = await RefreshToken.find({ familyId: first.familyId })
      expect(family).toHaveLength(3)
      for (const row of family) expect(row.revokedAt, `row ${row.id} revoked`).toBeInstanceOf(Date)

      // The legitimate holder of the newest token is cut off too.
      await expectUnauthenticated(rotateRefreshToken(third.token, 'ua', config))

      // A different family is unaffected.
      const otherRow = await RefreshToken.findOne({ tokenHash: sha256(other.token) })
      expect(otherRow.revokedAt).toBeUndefined()
      expect(otherRow.familyId).not.toBe(first.familyId)
    })

    it('revokes the family when a revoked (not rotated) token is presented', async () => {
      const user = await createUser()
      const first = await issueRefreshToken(user.id, 'ua', config)
      const second = await rotateRefreshToken(first.token, 'ua', config)
      await RefreshToken.updateOne({ tokenHash: sha256(second.token) }, { revokedAt: new Date() })
      await expectUnauthenticated(rotateRefreshToken(second.token, 'ua', config))
      const rows = await RefreshToken.find({ familyId: first.familyId })
      expect(rows.every((r) => r.revokedAt)).toBe(true)
    })

    it('lets exactly one of two concurrent rotations win, then no live token remains in the family', async () => {
      const user = await createUser()
      for (let attempt = 0; attempt < 10; attempt++) {
        const first = await issueRefreshToken(user.id, 'ua', config)
        const results = await Promise.allSettled([
          rotateRefreshToken(first.token, 'a', config),
          rotateRefreshToken(first.token, 'b', config),
        ])
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
        const rows = await RefreshToken.find({ familyId: first.familyId })
        for (const row of rows) expect(row.revokedAt, `attempt ${attempt} row ${row.id}`).toBeInstanceOf(Date)
        const winner = results.find((r) => r.status === 'fulfilled').value
        await expectUnauthenticated(rotateRefreshToken(winner.token, 'a', config))
      }
    })
  })

  describe('passwords (criterion 1, 1b)', () => {
    it('stores an argon2id hash that encodes m=19456,t=2 and never the plaintext', async () => {
      const user = await createUser()
      const raw = await User.collection.findOne({ _id: user._id })
      // Parameters, not just the prefix: m=1024,t=1 must fail this test.
      expect(raw.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=\d+\$/)
      expect(JSON.stringify(raw)).not.toContain(TEST_PASSWORD)
    })

    it('hashPassword salts (same input, different hash) and verifyPassword checks it', async () => {
      const a = await hashPassword('Another-Pass-1')
      const b = await hashPassword('Another-Pass-1')
      expect(a).not.toBe(b)
      expect(await verifyPassword(a, 'Another-Pass-1')).toBe(true)
      expect(await verifyPassword(a, 'another-pass-1')).toBe(false)
    })

    it('verifyPassword returns false (does not throw) for a malformed hash', async () => {
      expect(await verifyPassword('not-a-hash', 'x')).toBe(false)
      expect(await verifyPassword('', 'x')).toBe(false)
    })
  })

  describe('seed (criterion 1b)', () => {
    it('creates the admin through hashPassword with the same parameters', async () => {
      const { seedDatabase, ADMIN_EMAIL } = await import('../scripts/seed.js')
      await seedDatabase({ adminPassword: 'Seed-Admin-Pass-1' })
      const admin = await User.collection.findOne({ email: ADMIN_EMAIL })
      expect(admin.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=\d+\$/)
      expect(await verifyPassword(admin.passwordHash, 'Seed-Admin-Pass-1')).toBe(true)
    })
  })

  describe('rotation (criteria 2, 4)', () => {
    it('returns a different token each call and the old one stops working', async () => {
      const user = await createUser()
      const first = await issueRefreshToken(user.id, 'ua', config)
      const second = await rotateRefreshToken(first.token, 'ua', config)
      const third = await rotateRefreshToken(second.token, 'ua', config)
      expect(new Set([first.token, second.token, third.token]).size).toBe(3)
      expect(second.familyId).toBe(first.familyId)
      expect(third.familyId).toBe(first.familyId)
      await expectUnauthenticated(rotateRefreshToken(first.token, 'ua', config))
    })

    it('marks the old row replacedBy the new row and links the chain', async () => {
      const user = await createUser()
      const first = await issueRefreshToken(user.id, 'ua', config)
      const second = await rotateRefreshToken(first.token, 'ua', config)
      const oldRow = await RefreshToken.findOne({ tokenHash: sha256(first.token) })
      const newRow = await RefreshToken.findOne({ tokenHash: sha256(second.token) })
      expect(oldRow.replacedBy).toBe(String(newRow._id))
      expect(newRow.replacedBy).toBeUndefined()
      expect(String(newRow.userId)).toBe(user.id)
    })

    it('issues a 32-byte opaque token and expires it REFRESH_TTL_DAYS from now', async () => {
      const user = await createUser()
      const before = Date.now()
      const { token } = await issueRefreshToken(user.id, 'ua', config)
      expect(Buffer.from(token, 'base64url')).toHaveLength(32)
      const row = await RefreshToken.findOne({ tokenHash: sha256(token) })
      const ttl = row.expiresAt.getTime() - before
      expect(ttl).toBeGreaterThan(7 * 86_400_000 - 5_000)
      expect(ttl).toBeLessThan(7 * 86_400_000 + 5_000)
      expect(row.userAgent).toBe('ua')
    })

    it('stores only the sha256: the raw token is nowhere in the database', async () => {
      const user = await createUser()
      const { token } = await issueRefreshToken(user.id, 'ua', config)
      await rotateRefreshToken(token, 'ua', config)
      expect(await RefreshToken.findOne({ tokenHash: token })).toBeNull()
      const docs = await RefreshToken.collection.find({}).toArray()
      expect(docs).toHaveLength(2)
      expect(JSON.stringify(docs)).not.toContain(token)
      expect(docs.map((d) => d.tokenHash)).toContain(sha256(token))
    })

    it('rejects an unknown token, an expired token, and a disabled user', async () => {
      const user = await createUser()
      await expectUnauthenticated(rotateRefreshToken('x'.repeat(43), 'ua', config))
      await expectUnauthenticated(rotateRefreshToken('', 'ua', config))

      const expired = await issueRefreshToken(user.id, 'ua', config)
      await RefreshToken.updateOne({ tokenHash: sha256(expired.token) }, { expiresAt: new Date(Date.now() - 1000) })
      await expectUnauthenticated(rotateRefreshToken(expired.token, 'ua', config))

      const live = await issueRefreshToken(user.id, 'ua', config)
      await User.updateOne({ _id: user._id }, { status: 'disabled' })
      await expectUnauthenticated(rotateRefreshToken(live.token, 'ua', config))
      const row = await RefreshToken.findOne({ tokenHash: sha256(live.token) })
      expect(row.revokedAt).toBeInstanceOf(Date)
    })
  })

  describe('revocation', () => {
    it('revokeToken ends the whole family (even via an old token) and is idempotent', async () => {
      const user = await createUser()
      const first = await issueRefreshToken(user.id, 'ua', config)
      const second = await rotateRefreshToken(first.token, 'ua', config)
      await revokeToken(first.token)
      await revokeToken(first.token)
      await revokeToken('unknown-token')
      const rows = await RefreshToken.find({ familyId: first.familyId })
      expect(rows.every((r) => r.revokedAt)).toBe(true)
      await expectUnauthenticated(rotateRefreshToken(second.token, 'ua', config))
    })

    it('revokeAllForUser revokes every family of that user only', async () => {
      const a = await createUser()
      const b = await createUser()
      await issueRefreshToken(a.id, 'ua', config)
      await issueRefreshToken(a.id, 'ua2', config)
      const bToken = await issueRefreshToken(b.id, 'ua', config)
      await revokeAllForUser(a.id)
      expect(await RefreshToken.countDocuments({ userId: a._id, revokedAt: null })).toBe(0)
      const bRow = await RefreshToken.findOne({ tokenHash: sha256(bToken.token) })
      expect(bRow.revokedAt).toBeUndefined()
    })
  })

  describe('access token (criterion 5)', () => {
    it('carries only sub and role (plus iat/exp) — no email, name or password data', async () => {
      const user = await createUser({ name: 'Secret Name', email: 'secret.person@example.com' })
      const jwt = signAccessToken(user, config)
      const payload = decodePayload(jwt)
      expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'role', 'sub'])
      expect(payload.sub).toBe(user.id)
      expect(payload.role).toBe('candidate')
      const text = Buffer.from(jwt.split('.')[1], 'base64url').toString()
      for (const leak of ['secret.person', 'Secret Name', 'argon2', 'passwordHash']) {
        expect(text).not.toContain(leak)
      }
      expect(JSON.parse(Buffer.from(jwt.split('.')[0], 'base64url'))).toMatchObject({ alg: 'HS256' })
    })

    it('expires per JWT_ACCESS_TTL', async () => {
      const user = await createUser()
      const payload = decodePayload(signAccessToken(user, config))
      expect(payload.exp - payload.iat).toBe(15 * 60)
      const short = { ...config, JWT_ACCESS_TTL: '2h' }
      const p2 = decodePayload(signAccessToken(user, short))
      expect(p2.exp - p2.iat).toBe(2 * 3600)
    })

    it('adds pc for a reviewer with programs, omits it when empty (all programs)', async () => {
      const scoped = await createUser({ role: 'reviewer', reviewer: { programCodes: ['CSE', 'SWE'] } })
      const all = await createUser({ role: 'reviewer', reviewer: { programCodes: [] } })
      expect(decodePayload(signAccessToken(scoped, config)).pc).toEqual(['CSE', 'SWE'])
      expect(decodePayload(signAccessToken(all, config))).not.toHaveProperty('pc')
    })

    it('verifyAccessToken accepts its own token and rejects tampered, wrong-key, none and expired ones', async () => {
      const user = await createUser()
      const jwt = signAccessToken(user, config)
      expect(verifyAccessToken(jwt, config)).toMatchObject({ sub: user.id, role: 'candidate' })

      const [h, p, s] = jwt.split('.')
      const forgedPayload = Buffer.from(JSON.stringify({ ...decodePayload(jwt), role: 'admin' })).toString('base64url')
      expect(() => verifyAccessToken(`${h}.${forgedPayload}.${s}`, config)).toThrowError(/UNAUTHENTICATED|invalid|Unauth/i)
      const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
      expect(() => verifyAccessToken(`${noneHeader}.${p}.`, config)).toThrow()

      const wrongKey = createSigner({ key: 'a-completely-different-key-0123456789', algorithm: 'HS256', expiresIn: 60_000 })({ sub: user.id, role: 'admin' })
      expect(() => verifyAccessToken(wrongKey, config)).toThrow()

      const expired = createSigner({ key: config.JWT_ACCESS_SECRET, algorithm: 'HS256' })({ sub: user.id, role: 'candidate', exp: Math.floor(Date.now() / 1000) - 10 })
      expect(() => verifyAccessToken(expired, config)).toThrow()
    })

    it('verifyAccessToken throws a 401 UNAUTHENTICATED HttpError', async () => {
      expect.assertions(1)
      try {
        verifyAccessToken('garbage', config)
      } catch (err) {
        expect(err).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
      }
    })
  })

  describe('login throttling (criterion 6)', () => {
    it('locks for ~15 minutes on the 5th consecutive failure, not before', async () => {
      const user = await createUser()
      for (let i = 1; i <= 4; i++) {
        const r = await registerFailedLogin(user)
        expect(r.count).toBe(i)
        expect(r.lockedUntil).toBeUndefined()
      }
      const before = Date.now()
      const fifth = await registerFailedLogin(user)
      expect(fifth.count).toBe(5)
      const delta = fifth.lockedUntil.getTime() - before
      expect(delta).toBeGreaterThan(15 * 60_000 - 5_000)
      expect(delta).toBeLessThan(15 * 60_000 + 5_000)

      const stored = await User.findById(user._id)
      expect(stored.failedLogins.count).toBe(5)
      expect(stored.failedLogins.lockedUntil.getTime()).toBe(fifth.lockedUntil.getTime())
      expect(isLocked(stored)).toBe(true)
    })

    it('does not extend the lock on failures made while locked', async () => {
      const user = await createUser()
      let locked
      for (let i = 0; i < 5; i++) locked = await registerFailedLogin(user)
      const again = await registerFailedLogin(user)
      expect(again.lockedUntil.getTime()).toBe(locked.lockedUntil.getTime())
    })

    it('starts a fresh count once an expired lock is over', async () => {
      const user = await createUser({ failedLogins: { count: 5, lockedUntil: new Date(Date.now() - 1000) } })
      expect(isLocked(user)).toBe(false)
      const r = await registerFailedLogin(user)
      expect(r.count).toBe(1)
      expect(r.lockedUntil).toBeUndefined()
    })

    it('a success clears the counter and the lock', async () => {
      const user = await createUser()
      for (let i = 0; i < 3; i++) await registerFailedLogin(user)
      await clearFailedLogins(user)
      const cleared = await User.findById(user._id)
      expect(cleared.failedLogins.count).toBe(0)
      // 4 more failures after the reset must not lock (would be 7 without the reset).
      let r
      for (let i = 0; i < 4; i++) r = await registerFailedLogin(user)
      expect(r.count).toBe(4)
      expect(r.lockedUntil).toBeUndefined()

      for (let i = 0; i < 1; i++) await registerFailedLogin(user)
      await clearFailedLogins(user)
      const afterLock = await User.findById(user._id)
      expect(afterLock.failedLogins.count).toBe(0)
      expect(afterLock.failedLogins.lockedUntil).toBeUndefined()
    })

    it('counts concurrent failures atomically', async () => {
      const user = await createUser()
      await Promise.all(Array.from({ length: 5 }, () => registerFailedLogin(user)))
      const stored = await User.findById(user._id)
      expect(stored.failedLogins.count).toBe(5)
      expect(isLocked(stored)).toBe(true)
    })
  })
})
