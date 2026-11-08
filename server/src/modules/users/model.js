import { Schema, model } from 'mongoose'
import { ROLES } from '@diu/shared/constants'

// context/14-database-schema.md §3.2. Password hashing (argon2id) happens in the service layer, never here.
const UserSchema = new Schema({
  role: { type: String, enum: ROLES, required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true }, // normalized +8801XXXXXXXXX
  passwordHash: { type: String, required: true, select: false }, // argon2id
  emailVerifiedAt: { type: Date, default: null },
  phoneVerifiedAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  lastLoginAt: Date,
  failedLogins: { count: { type: Number, default: 0 }, lockedUntil: Date },

  // candidate-only
  candidate: {
    programCode: { type: String, ref: 'Program' },
    sscGpa: { type: Number, min: 0, max: 5 },
    hscGpa: { type: Number, min: 0, max: 5 },
    hscGroup: { type: String, enum: ['science', 'commerce', 'arts', 'other'] },
    board: String,
  },
  // reviewer-only
  reviewer: {
    programCodes: [{ type: String, ref: 'Program' }], // empty = all programs
  },
  preferences: { lang: { type: String, enum: ['en', 'bn'], default: 'en' } },
}, { timestamps: true })

UserSchema.index({ email: 1 }, { unique: true })
// Partial: users without a phone must not collide on a missing value.
UserSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } })
UserSchema.index({ role: 1, 'candidate.programCode': 1, createdAt: -1 })
UserSchema.index({ name: 'text', email: 'text', phone: 'text' }) // admin search

// Never leak credentials or internal fields; expose `id` instead of `_id`.
UserSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.passwordHash
    delete ret.failedLogins
    delete ret.__v
    return ret
  },
})

export const User = model('User', UserSchema)
