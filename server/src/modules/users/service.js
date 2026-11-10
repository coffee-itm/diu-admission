import mongoose from 'mongoose'
import { httpError } from '../../lib/httpError.js'
import { record } from '../audit/service.js'
import { hashPassword, revokeAllForUser } from '../auth/service.js'
import { Program } from '../programs/model.js'
import { AdminGuard } from './adminGuard.model.js'
import { User } from './model.js'
import { toPublicUser } from './toPublicUser.js'
import { STAFF_ROLES } from './schemas.js'

// Admin management of staff accounts (FR-AUTH-10, P2-04). Plain arguments in, public shapes out.

const notFound = () => httpError(404, 'NOT_FOUND', 'User not found')
const invalid = (path, message) => httpError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ path, message }])
const lastAdmin = () => httpError(409, 'LAST_ADMIN', 'You cannot demote or disable the last remaining active admin')

/** `toPublicUser` + the account status, the only extra an admin needs. */
const toAdminUser = (user) => ({ ...toPublicUser(user), status: user.status })

/**
 * Every code must name an ACTIVE program, and a reviewer must have at least one.
 *
 * DECISION (T-048): an empty `reviewer.programCodes` is REJECTED on create and update; there is no
 * "all programs" flag. In the database an empty list means ALL programs (14 §3.2, `programScope` returns
 * `[]`), so accepting `[]` from a request, whether sent on purpose or produced by a client bug, an
 * omitted field, or a cleared multi-select, would silently grant a reviewer every program's candidates
 * and results. Refusing is the safer reading: it fails loudly at write time, and an unrestricted
 * reviewer is not a role anyone needs (that is what `admin` is, and it is audited and last-admin-guarded).
 * An explicit flag would need a contract change (15 §5.5) and is not required by FR-AUTH-10.
 */
async function assertProgramCodes(codes) {
  if (!codes?.length) throw invalid('programCodes', 'a reviewer needs at least one program')
  const found = await Program.find({ _id: { $in: codes }, active: true }).select('_id').lean()
  const known = new Set(found.map((p) => p._id))
  const unknown = codes.filter((code) => !known.has(code))
  if (unknown.length) throw invalid('programCodes', `not an active program: ${unknown.join(', ')}`)
}

/**
 * AC 2: the set of ACTIVE admins must never become empty.
 *
 * Transactions read from a snapshot, so a plain "count, then write" is classic write skew: two
 * concurrent transactions can each demote/disable the other admin, both seeing the other still
 * active, and both commit to zero admins. Writing to ONE fixed-`_id` document inside the
 * transaction serialises them: every reducing write conflicts on that shared document, the
 * blocked one resumes only after the first has committed or aborted, and the driver's
 * TransientTransactionError retry (built into `mongoose.transaction`) re-runs the whole
 * callback — which re-reads state — before it can commit. On that fresh read the remaining
 * active-admin count is 0 and the change is refused with 409 LAST_ADMIN, nothing written.
 *
 * Only a change that could reduce the count locks: enabling/disabling a non-admin or
 * re-activating a disabled admin can only RAISE it and needs no serialisation.
 * @param {{ _id: string, role: 'reviewer' | 'admin', status: 'active' | 'disabled' }} target the loaded staff user
 * @param {{ role: 'reviewer' | 'admin', status: 'active' | 'disabled' }} next the role/status AFTER the patch
 * @param {import('mongoose').ClientSession} session the caller's transaction session
 * @returns {Promise<void>} resolves to continue, throws 409 LAST_ADMIN to abort everything
 */
async function assertNotLastAdmin(target, next, session) {
  if (target.role !== 'admin' || target.status !== 'active') return
  if (next.role === 'admin' && next.status !== 'disabled') return

  await AdminGuard.findOneAndUpdate({ _id: 'adminGuard' }, { $inc: { n: 1 } }, { upsert: true, session })
  const others = await User.countDocuments(
    { _id: { $ne: target._id }, role: 'admin', status: 'active' },
    { session },
  )
  if (others === 0) throw lastAdmin()
}

/**
 * @param {{ role?: 'reviewer' | 'admin', page: number, limit: number }} query
 */
export async function listStaff({ role, page, limit }) {
  const filter = { role: role ?? { $in: STAFF_ROLES } } // candidates are never listed here
  const [rows, total] = await Promise.all([
    // `_id` is the tie-break: createdAt alone is not unique, and an unstable order repeats/skips rows across pages.
    User.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ])
  return { items: rows.map(toAdminUser), page, limit, total }
}

/**
 * @param {{ actorId: string, ip?: string }} actor
 * @param {{ role: 'reviewer' | 'admin', name: string, email: string, password: string, programCodes?: string[] }} input already validated and normalised
 */
export async function createStaff(actor, input) {
  if (input.role === 'reviewer') await assertProgramCodes(input.programCodes)
  else if (input.programCodes !== undefined) throw invalid('programCodes', 'only a reviewer has programs')

  const passwordHash = await hashPassword(input.password)
  const doc = { role: input.role, name: input.name, email: input.email, passwordHash }
  if (input.role === 'reviewer') doc.reviewer = { programCodes: input.programCodes }

  try {
    return await mongoose.connection.transaction(async (session) => {
      const [user] = await User.create([doc], { session })
      await record(
        actor.actorId,
        'user.create',
        { entity: 'User', entityId: user._id },
        { ip: actor.ip, diff: { after: { role: user.role, name: user.name, email: user.email, status: user.status, programCodes: input.programCodes } } },
        { session },
      )
      return toAdminUser(user)
    })
  } catch (err) {
    if (err?.code === 11000) throw httpError(409, 'EMAIL_TAKEN', 'An account with this email already exists')
    throw err
  }
}

/**
 * Change role / status / reviewer scope of a staff account. One transaction: the change and its audit row.
 * @param {{ actorId: string, ip?: string }} actor
 * @param {string} id
 * @param {{ role?: 'reviewer' | 'admin', status?: 'active' | 'disabled', programCodes?: string[] }} patch
 */
export async function updateStaff(actor, id, patch) {
  const result = await mongoose.connection.transaction(async (session) => {
    // Staff accounts only: a candidate id is "not found" here, so this endpoint can never promote a candidate.
    const target = await User.findOne({ _id: id, role: { $in: STAFF_ROLES } }).session(session)
    if (!target) throw notFound()

    const role = patch.role ?? target.role
    const status = patch.status ?? target.status
    const before = { role: target.role, status: target.status, programCodes: target.role === 'reviewer' ? [...(target.reviewer?.programCodes ?? [])] : undefined }
    const after = { role, status, programCodes: before.programCodes }

    if (role === 'admin') {
      if (patch.programCodes !== undefined) throw invalid('programCodes', 'only a reviewer has programs')
      after.programCodes = undefined
    } else if (patch.programCodes !== undefined || target.role !== 'reviewer') {
      // Scope is being written, or this account is becoming a reviewer (and has no scope yet): it must be explicit.
      // Merely disabling/enabling a reviewer does not re-validate (a legacy "all programs" reviewer stays usable).
      await assertProgramCodes(patch.programCodes)
      after.programCodes = patch.programCodes
    }

    const changed = ['role', 'status', 'programCodes'].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    if (changed.length === 0) return { user: target, status: before.status, changed }

    await assertNotLastAdmin(target, { role, status }, session)

    const set = { role, status }
    const unset = {}
    if (role === 'reviewer') set['reviewer.programCodes'] = after.programCodes
    else unset.reviewer = ''
    const user = await User.findByIdAndUpdate(target._id, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, session })

    const pick = (state) => Object.fromEntries(changed.map((key) => [key, state[key]]))
    const onlyStatus = changed.length === 1 && changed[0] === 'status'
    await record(
      actor.actorId,
      onlyStatus ? (status === 'disabled' ? 'user.disable' : 'user.enable') : 'user.update',
      { entity: 'User', entityId: target._id },
      { ip: actor.ip, diff: { before: pick(before), after: pick(after) } },
      { session },
    )
    return { user, status, changed }
  })

  // After commit: a disabled account must not be able to mint new access tokens from a refresh cookie.
  if (result.changed.includes('status') && result.status === 'disabled') await revokeAllForUser(result.user._id)
  return toAdminUser(result.user)
}
