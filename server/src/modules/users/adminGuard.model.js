import { Schema, model } from 'mongoose'

// Operational scaffolding, NOT domain data (so not in context/14). One fixed-_id document that every
// transaction which could REDUCE the number of active admins writes to. It holds nothing but a counter.
// Writing the same document forces concurrent such transactions to conflict, so they run one after the
// other and each re-counts the admins that are left. See `assertNotLastAdmin` in service.js.
const AdminGuardSchema = new Schema({
  _id: { type: String },
  n: { type: Number, default: 0 },
}, { collection: 'adminGuard', versionKey: false })

export const AdminGuard = model('AdminGuard', AdminGuardSchema)
