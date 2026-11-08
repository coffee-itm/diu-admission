/**
 * Credentials and tokens (context/16-backend-architecture.md §5, ADR-016). No HTTP in here:
 * routes (T-046) call these with plain arguments. `config` is the object from `loadConfig()`.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import argon2 from 'argon2'
import { createSigner, createVerifier } from 'fast-jwt'
import { Types } from 'mongoose'
import { httpError } from '../../lib/httpError.js'
import { User } from '../users/model.js'
import { Program } from '../programs/model.js'
import { RefreshToken } from './refreshToken.model.js'
import { LoginDecoy } from './loginDecoy.model.js'

// §5. The ONLY definition of the password cost in the codebase (seed.js and tests go through hashPassword).
const ARGON2_OPTIONS = Object.freeze({ type: argon2.argon2id, memoryCost: 19456, timeCost: 2 })

const MAX_FAILED_LOGINS = 5
const LOCK_MS = 15 * 60_000
const DAY_MS = 86_400_000

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const unauthenticated = () => httpError(401, 'UNAUTHENTICATED', 'Invalid or expired token')

/** @param {string} plain */
export function hashPassword(plain) {
  return argon2.hash(plain, ARGON2_OPTIONS)
}

/**
 * Constant-cost check. A malformed or empty stored hash is a failed login, not a 500.
 * @param {string} hash
 * @param {string} plain
 */
export async function verifyPassword(hash, plain) {
  if (typeof hash !== 'string' || typeof plain !== 'string' || !hash) return false
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------- access token

/**
 * HS256 JWT `{ sub, role, pc? }`. Nothing else about the user goes in (no email, name, hash).
 * `pc` is a reviewer's program scope; absent means "all programs" (14 §3.2).
 * @param {{ id?: string, _id?: unknown, role: string, reviewer?: { programCodes?: string[] } }} user
 */
export function signAccessToken(user, config) {
  const payload = { sub: String(user.id ?? user._id), role: user.role }
  const pc = user.role === 'reviewer' ? user.reviewer?.programCodes : undefined
  if (pc?.length) payload.pc = [...pc]
  const sign = createSigner({ key: config.JWT_ACCESS_SECRET, algorithm: 'HS256', expiresIn: config.JWT_ACCESS_TTL })
  return sign(payload)
}

/**
 * Verify an access token (signature, HS256 only, expiry). Throws 401 UNAUTHENTICATED.
 * @returns {{ sub: string, role: string, pc?: string[], iat: number, exp: number }}
 */
export function verifyAccessToken(token, config) {
  try {
    const verify = createVerifier({ key: config.JWT_ACCESS_SECRET, algorithms: ['HS256'] })
    return verify(token)
  } catch {
    throw unauthenticated()
  }
}

// ---------------------------------------------------------------- refresh tokens

function newRawToken() {
  return randomBytes(32).toString('base64url')
}

const expiryFrom = (now, config) => new Date(now.getTime() + config.REFRESH_TTL_DAYS * DAY_MS)

/**
 * Start a new rotation family (a login).
 * @returns {Promise<{ token: string, familyId: string, expiresAt: Date }>} `token` is shown once; only its sha256 is stored.
 */
export async function issueRefreshToken(userId, userAgent, config) {
  const token = newRawToken()
  const familyId = randomUUID()
  const expiresAt = expiryFrom(new Date(), config)
  await RefreshToken.create({ userId, familyId, tokenHash: sha256(token), expiresAt, userAgent })
  return { token, familyId, expiresAt }
}

/** Revoke every still-live token of a family (theft response). Idempotent. */
function revokeFamily(familyId) {
  return RefreshToken.updateMany({ familyId, revokedAt: null }, { revokedAt: new Date() })
}

/**
 * Exchange a refresh token for a new one in the same family. Each token works once.
 *
 * Reuse detection: presenting a token that is already rotated (`replacedBy`) or revoked means two
 * parties hold it, so the WHOLE family is revoked and the call fails. Rotation is claimed with a
 * single conditional update, so of two concurrent requests with the same token exactly one wins and
 * the loser is treated as reuse.
 * @returns {Promise<{ token: string, familyId: string, expiresAt: Date, userId: string }>}
 */
export async function rotateRefreshToken(rawToken, userAgent, config) {
  if (typeof rawToken !== 'string' || !rawToken) throw unauthenticated()
  const row = await RefreshToken.findOne({ tokenHash: sha256(rawToken) })
  if (!row) throw unauthenticated()
  if (row.replacedBy || row.revokedAt) {
    await revokeFamily(row.familyId)
    throw unauthenticated()
  }
  if (row.expiresAt.getTime() <= Date.now()) throw unauthenticated()

  const user = await User.findById(row.userId).select('status')
  if (!user || user.status !== 'active') {
    await revokeFamily(row.familyId)
    throw unauthenticated()
  }

  const token = newRawToken()
  const next = new RefreshToken({
    userId: row.userId,
    familyId: row.familyId,
    tokenHash: sha256(token),
    expiresAt: expiryFrom(new Date(), config),
    userAgent,
  })
  // Insert the successor BEFORE claiming the old token. If a concurrent request loses the claim it
  // revokes the family, and that sweep must already see this row, or a live token would survive
  // in a family where reuse was just detected. (A losing request's own row is swept too.)
  await next.save()
  // Claim the old token: only succeeds while it is still unrotated and unrevoked.
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: row._id, replacedBy: null, revokedAt: null },
    { replacedBy: String(next._id) },
  )
  if (!claimed) {
    await revokeFamily(row.familyId)
    throw unauthenticated()
  }
  return { token, familyId: row.familyId, expiresAt: next.expiresAt, userId: String(row.userId) }
}

/**
 * Logout. Revokes the token's whole family (the login it belongs to), even when an older, already
 * rotated token is presented, so no live successor is left behind. Unknown tokens are a no-op.
 */
export async function revokeToken(rawToken) {
  if (typeof rawToken !== 'string' || !rawToken) return
  const row = await RefreshToken.findOne({ tokenHash: sha256(rawToken) }).select('familyId')
  if (row) await revokeFamily(row.familyId)
}

/** Revoke every live refresh token of a user (password change, account disabled, "log out everywhere"). */
export async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() })
}

// ---------------------------------------------------------------- login throttling

const userId = (user) => user._id ?? new Types.ObjectId(String(user.id))

/** True while `failedLogins.lockedUntil` is in the future. Routes check this before verifying a password. */
export function isLocked(user, now = new Date()) {
  const until = user.failedLogins?.lockedUntil
  return Boolean(until) && until.getTime() > now.getTime()
}

// A failure older than this no longer counts toward the lock (FR-AUTH-02: "5 failed attempts per email per 15 min").
const FAIL_WINDOW_MS = 15 * 60_000

/**
 * The one atomic pipeline update behind a real failed-login write.
 * The count restarts at 1 when the lock has expired OR (with no active lock) the previous failure is
 * older than FAIL_WINDOW_MS, or has no timestamp (data from before the window existed).
 */
function applyFailedLogin(id, now = new Date()) {
  const cutoff = new Date(now.getTime() - FAIL_WINDOW_MS)
  const lockedUntil = { $ifNull: ['$failedLogins.lockedUntil', null] }
  const lockExpired = { $and: [{ $ne: [lockedUntil, null] }, { $lte: [lockedUntil, now] }] }
  const lockActive = { $gt: [lockedUntil, now] }
  // $lte treats a missing lastFailedAt as older than any date.
  const windowExpired = { $and: [{ $not: [lockActive] }, { $lte: ['$failedLogins.lastFailedAt', cutoff] }] }
  const restart = { $or: [lockExpired, windowExpired] }
  return User.findByIdAndUpdate(
    id,
    [
      {
        $set: {
          'failedLogins.count': {
            $cond: [restart, 1, { $add: [{ $ifNull: ['$failedLogins.count', 0] }, 1] }],
          },
          'failedLogins.lockedUntil': { $cond: [lockExpired, '$$REMOVE', '$failedLogins.lockedUntil'] },
          'failedLogins.lastFailedAt': now,
        },
      },
      {
        $set: {
          'failedLogins.lockedUntil': {
            $cond: [
              { $gte: ['$failedLogins.count', MAX_FAILED_LOGINS] },
              { $ifNull: ['$failedLogins.lockedUntil', new Date(now.getTime() + LOCK_MS)] },
              '$failedLogins.lockedUntil',
            ],
          },
        },
      },
    ],
    { new: true, updatePipeline: true },
  )
}

/**
 * Count a failed login; the 5th failure within 15 minutes locks the account for 15 minutes.
 * One atomic pipeline update, so concurrent attempts cannot under-count. The count restarts when a lock
 * has expired or the previous failure is older than the 15-minute window; failures made while locked
 * do not extend the lock.
 * @returns {Promise<{ count: number, lockedUntil?: Date }>}
 */
export async function registerFailedLogin(user) {
  const updated = await applyFailedLogin(userId(user))
  if (!updated) throw unauthenticated()
  const { count, lockedUntil } = updated.failedLogins
  return lockedUntil ? { count, lockedUntil } : { count }
}

const DECOY_ID = 'login-timing'

/**
 * Timing equaliser for the login paths that must NOT touch a real account (unknown email, locked,
 * disabled). The wrong-password path awaits `registerFailedLogin`, a real replicated write (~7 ms with
 * majority write concern). If these paths skipped it, their response would be measurably faster and
 * "registered and unlocked" would be observable (T-046 review: ~10 ms gap, non-overlapping
 * distributions). An update that matches no document is NOT equivalent: it appends nothing to the
 * oplog and measured ~3 ms vs ~7.5 ms, leaving a ~6 ms gap. So these paths perform a genuine
 * findAndModify that changes a document: they bump the timestamp on one fixed decoy row, which
 * touches no user data.
 */
async function dummyFailedLoginWrite() {
  const now = new Date()
  await LoginDecoy.findByIdAndUpdate(
    DECOY_ID,
    [{ $set: { at: now, count: { $add: [{ $ifNull: ['$count', 0] }, 1] } } }, { $set: { count: { $mod: ['$count', 1_000_000] } } }],
    { upsert: true, new: true, updatePipeline: true },
  )
}

/** Successful login: reset the counter and any lock. */
export async function clearFailedLogins(user) {
  await User.updateOne(
    { _id: userId(user), $or: [{ 'failedLogins.count': { $gt: 0 } }, { 'failedLogins.lockedUntil': { $exists: true } }, { 'failedLogins.lastFailedAt': { $exists: true } }] },
    { $set: { 'failedLogins.count': 0 }, $unset: { 'failedLogins.lockedUntil': 1, 'failedLogins.lastFailedAt': 1 } },
  )
}

// ---------------------------------------------------------------- account flows (used by routes.js)

const invalidCredentials = () => httpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')

// Verified when the account is missing/locked so every failed login costs one argon2 verify.
let dummyHash
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')))

/** New access token + a new refresh family. `user` is a User document. */
async function startSession(user, userAgent, config) {
  const refresh = await issueRefreshToken(user._id, userAgent, config)
  return { user, accessToken: signAccessToken(user, config), refresh }
}

/**
 * Public registration (FR-AUTH-01/10). Always a candidate: `role` is not an input here.
 * @param {{ name: string, email: string, phone: string, password: string, programCode: string,
 *           sscGpa: number, hscGpa: number, hscGroup: string }} input already validated and normalised
 */
export async function registerCandidate(input, userAgent, config) {
  const program = await Program.findOne({ _id: input.programCode, active: true }).select('_id').lean()
  if (!program) {
    throw httpError(422, 'VALIDATION_ERROR', 'Request validation failed', [
      { path: 'programCode', message: 'is not an active program' },
    ])
  }
  const passwordHash = await hashPassword(input.password)
  let user
  try {
    user = await User.create({
      role: 'candidate',
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      candidate: { programCode: input.programCode, sscGpa: input.sscGpa, hscGpa: input.hscGpa, hscGroup: input.hscGroup },
    })
  } catch (err) {
    if (err?.code === 11000) {
      if (err.keyPattern?.phone) {
        throw httpError(422, 'VALIDATION_ERROR', 'Request validation failed', [
          { path: 'phone', message: 'is already registered' },
        ])
      }
      throw httpError(409, 'EMAIL_TAKEN', 'An account with this email already exists')
    }
    throw err
  }
  return startSession(user, userAgent, config)
}

/**
 * Email + password login (FR-AUTH-02).
 *
 * EVERY credential failure is the same generic 401, including the attempt that trips the lock and
 * every attempt made while locked (FR-AUTH-02, clarified 2026-11-08). Never answer 429 here: unknown
 * emails can't lock, so a 429 would reveal that an email is registered. 429 comes only from the
 * per-IP rate limiter. The lock is checked BEFORE the password is verified: while it is active a
 * correct password gets the same 401 and the failure counter/lock are left untouched, so a locked
 * account cannot be probed or have its lock extended.
 */
export async function loginWithPassword({ email, password }, userAgent, config) {
  const user = await User.findOne({ email }).select('+passwordHash')
  if (!user || user.status !== 'active' || isLocked(user)) {
    // Keep the cost of every failure uniform: one argon2 verify AND one awaited failed-login write.
    await verifyPassword(await getDummyHash(), password)
    await dummyFailedLoginWrite()
    throw invalidCredentials()
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    await registerFailedLogin(user) // the 5th failure sets the lock; the response is still the generic 401
    throw invalidCredentials()
  }
  await clearFailedLogins(user)
  user.lastLoginAt = new Date()
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: user.lastLoginAt } })
  return startSession(user, userAgent, config)
}

/** Rotate the refresh cookie and mint a new access token. Reuse of a rotated token revokes the family. */
export async function refreshSession(rawToken, userAgent, config) {
  const refresh = await rotateRefreshToken(rawToken, userAgent, config)
  const user = await User.findById(refresh.userId)
  if (!user || user.status !== 'active') throw unauthenticated()
  return { user, accessToken: signAccessToken(user, config), refresh }
}

/** The signed-in user for `/auth/me`; a deleted or disabled account is unauthenticated. */
export async function getActiveUser(userId) {
  const user = Types.ObjectId.isValid(userId) ? await User.findById(userId) : null
  if (!user || user.status !== 'active') throw unauthenticated()
  return user
}
