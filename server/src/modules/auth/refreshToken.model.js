import { Schema, Types, model } from 'mongoose'

// context/14-database-schema.md §3.8. Only the sha256 of the opaque token is stored.
const RefreshTokenSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  familyId: { type: String, required: true, index: true }, // rotation chain
  tokenHash: { type: String, required: true, unique: true }, // sha256 of opaque token
  replacedBy: String,
  revokedAt: Date,
  expiresAt: { type: Date, required: true },
  userAgent: String,
}, { timestamps: true, collection: 'refreshTokens' })

// TTL: Mongo removes expired tokens.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RefreshToken = model('RefreshToken', RefreshTokenSchema)
