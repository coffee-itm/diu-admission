import argon2 from 'argon2'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { startTestApp } from './helpers/app.js'
import { Program } from '../src/modules/programs/model.js'
import { User } from '../src/modules/users/model.js'
import { RefreshToken } from '../src/modules/auth/refreshToken.model.js'
import { PROGRAMS } from '@diu/shared/constants'
import { seedDatabase, loadSeedEnv } from '../scripts/seed.js'

const ARGON2_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 }

async function makeUser(overrides = {}) {
  return new User({
    role: 'candidate',
    name: 'Test User',
    email: `user-${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: await argon2.hash('Test@1234', ARGON2_OPTS),
    ...overrides,
  })
}

describe('models (T-044)', () => {
  let ctx
  beforeAll(async () => {
    ctx = await startTestApp()
    // Build indexes before asserting on unique/partial behaviour.
    await Promise.all([User.init(), Program.init(), RefreshToken.init()])
  })
  afterAll(async () => {
    await ctx?.stop()
  })
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Program.deleteMany({}), RefreshToken.deleteMany({})])
  })

  describe('User', () => {
    it('persists an argon2id passwordHash', async () => {
      const user = await makeUser({ email: 'hash@example.com' })
      await user.save()
      const raw = await User.collection.findOne({ _id: user._id })
      expect(raw.passwordHash).toMatch(/^\$argon2id\$/)
      expect(await argon2.verify(raw.passwordHash, 'Test@1234')).toBe(true)
    })

    it('toJSON drops passwordHash, failedLogins and __v, and renames _id to id', async () => {
      const user = await makeUser({ email: 'json@example.com' })
      await user.save()
      const json = JSON.stringify(user)
      const parsed = JSON.parse(json)
      expect(json).not.toContain('passwordHash')
      expect(json).not.toContain('failedLogins')
      expect(json).not.toContain('__v')
      expect(parsed).not.toHaveProperty('_id')
      expect(parsed.id).toBe(String(user._id))
      expect(parsed.email).toBe('json@example.com')
    })

    it('rejects a duplicate email (unique index, case-insensitive via lowercase)', async () => {
      await (await makeUser({ email: 'dup@example.com' })).save()
      const dup = await makeUser({ email: 'DUP@example.com' })
      await expect(dup.save()).rejects.toMatchObject({ code: 11000 })
    })

    it('allows two users with no phone (partial unique index)', async () => {
      await (await makeUser({ email: 'nophone1@example.com' })).save()
      await (await makeUser({ email: 'nophone2@example.com' })).save()
      expect(await User.countDocuments({ phone: { $exists: false } })).toBe(2)
    })

    it('rejects a duplicate phone once set', async () => {
      await (await makeUser({ email: 'ph1@example.com', phone: '+8801700000001' })).save()
      const dup = await makeUser({ email: 'ph2@example.com', phone: '+8801700000001' })
      await expect(dup.save()).rejects.toMatchObject({ code: 11000 })
    })
  })

  describe('Program', () => {
    it('rejects an unknown faculty', async () => {
      const p = new Program({ _id: 'XYZ', name: 'X', faculty: 'Nowhere' })
      await expect(p.save()).rejects.toThrow(/faculty/)
    })
  })

  describe('RefreshToken', () => {
    it('has a TTL index on expiresAt', async () => {
      const idx = (await RefreshToken.collection.indexes()).find((i) => i.key.expiresAt === 1)
      expect(idx).toBeDefined()
      expect(idx.expireAfterSeconds).toBe(0)
    })
  })

  describe('seed', () => {
    const SEED_PW = 'Admin@seed-1234'

    it('is idempotent: two runs leave 13 programs and 1 admin', async () => {
      await seedDatabase({ adminPassword: SEED_PW })
      const second = await seedDatabase({ adminPassword: SEED_PW })
      expect(second).toEqual({ programs: 13, admins: 1 })
      expect(await Program.countDocuments()).toBe(13)
      expect(await User.countDocuments({ role: 'admin' })).toBe(1)
    })

    it('seeds exactly the PROGRAMS from @diu/shared/constants (ids, names, faculties)', async () => {
      await seedDatabase({ adminPassword: SEED_PW })
      const docs = await Program.find().lean()
      const byId = Object.fromEntries(docs.map((d) => [d._id, d]))
      expect(docs).toHaveLength(PROGRAMS.length)
      for (const p of PROGRAMS) {
        expect(byId[p.id]).toMatchObject({ _id: p.id, name: p.name, faculty: p.faculty })
      }
    })

    it('stores the admin password as argon2id, never the literal', async () => {
      await seedDatabase({ adminPassword: SEED_PW })
      const admin = await User.collection.findOne({ email: 'admin@diu.edu' })
      expect(admin.passwordHash).toMatch(/^\$argon2id\$/)
      expect(admin.passwordHash).not.toContain(SEED_PW)
      expect(await argon2.verify(admin.passwordHash, SEED_PW)).toBe(true)
    })

    it('loadSeedEnv refuses NODE_ENV=production without SEED_ALLOW_PROD=true', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/x',
        JWT_ACCESS_SECRET: 'Zq8rT2vLx9pWn4Kd7Hs1Gb6Ym3Jc5Ea0Uf',
        PEPPER: 'Qw7Rt5Yu3Io9Pa1S',
        COOKIE_SECURE: 'true',
        SEED_ADMIN_PASSWORD: 'a-long-enough-password',
      }
      expect(() => loadSeedEnv(env)).toThrow(/SEED_ALLOW_PROD/)
      expect(() => loadSeedEnv({ ...env, SEED_ALLOW_PROD: 'true' })).not.toThrow()
    })

    it('loadSeedEnv requires SEED_ADMIN_PASSWORD (min 12 chars)', () => {
      const base = { MONGODB_URI: 'mongodb://localhost:27017/x' }
      expect(() => loadSeedEnv(base)).toThrow(/SEED_ADMIN_PASSWORD/)
      expect(() => loadSeedEnv({ ...base, SEED_ADMIN_PASSWORD: 'short' })).toThrow(/SEED_ADMIN_PASSWORD/)
      expect(() => loadSeedEnv({ ...base, SEED_ADMIN_PASSWORD: 'long-enough-pw' })).not.toThrow()
    })
  })
})
