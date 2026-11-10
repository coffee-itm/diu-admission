import { Schema, Types, model } from 'mongoose'

// context/14-database-schema.md §3.9. Append-only: nothing in the codebase updates or deletes these rows.
const AuditLogSchema = new Schema({
  actorId: { type: Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // 'user.create' | 'user.update' | 'user.disable' | 'question.create' | ...
  entity: { type: String, required: true }, // 'User' | 'Question' | 'ExamCycle' | ...
  entityId: { type: String, required: true },
  diff: Schema.Types.Mixed, // { before, after } (shallow, no secrets)
  ip: String,
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'auditLogs' })

AuditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 })
AuditLogSchema.index({ actorId: 1, createdAt: -1 })

export const AuditLog = model('AuditLog', AuditLogSchema)
