import { Schema, model } from 'mongoose'

// Operational scaffolding, NOT domain data (so not in context/14). A single fixed-_id document that the
// login paths which must not touch a real account (unknown email, locked, disabled) write to, so that
// they cost the same as the wrong-password path's real failed-login write. See `dummyFailedLoginWrite`
// in service.js. It never holds anything but a timestamp and a counter and is never read.
const LoginDecoySchema = new Schema({
  _id: { type: String },
  at: { type: Date, required: true },
  count: { type: Number, default: 0 }, // wraps; only here so the write has the same shape as a failed-login update
}, { collection: 'loginTimingDecoy', versionKey: false })

export const LoginDecoy = model('LoginDecoy', LoginDecoySchema)
