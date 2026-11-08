import { Schema, model } from 'mongoose'

// context/14-database-schema.md §3.1. Seeded from PROGRAMS (src/lib/constants.js) by server/scripts/seed.js.
const ProgramSchema = new Schema({
  _id: { type: String, uppercase: true, match: /^[A-Z]{2,10}$/ }, // 'CSE'
  name: { type: String, required: true }, // 'B.Sc. in Computer Science & Engineering'
  nameBn: { type: String },
  faculty: {
    type: String,
    required: true,
    enum: ['Science & Technology', 'Business & Entrepreneurship', 'Arts & Humanities'],
  },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export const Program = model('Program', ProgramSchema)
