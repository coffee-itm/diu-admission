import { AuditLog } from './model.js'

/**
 * Write one audit row (14 §3.9). Every admin write calls this; pass the SAME `session` as the write
 * so the change and its audit row commit or roll back together (no unaudited change, no phantom row).
 *
 * `diff` must be shallow and free of secrets: pass the fields that changed, never a whole user document.
 *
 * @param {string | import('mongoose').Types.ObjectId} actorId the admin performing the action
 * @param {string} action e.g. 'user.create'
 * @param {{ entity: string, entityId: string | import('mongoose').Types.ObjectId }} target
 * @param {{ diff?: { before?: object, after?: object }, ip?: string }} [meta]
 * @param {{ session?: import('mongoose').ClientSession }} [opts]
 */
export async function record(actorId, action, target, meta = {}, { session } = {}) {
  await AuditLog.create(
    [{ actorId, action, entity: target.entity, entityId: String(target.entityId), diff: meta.diff, ip: meta.ip }],
    { session },
  )
}
