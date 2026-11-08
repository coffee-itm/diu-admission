/**
 * Idempotent seed: the 13 programs (from PROGRAMS in src/lib/constants.js) and one admin account.
 *
 * Usage (from the repo root): `pnpm seed`. Needs MONGODB_URI and SEED_ADMIN_PASSWORD (min 12 chars).
 * Refuses NODE_ENV=production unless SEED_ALLOW_PROD=true. The admin password is never a literal.
 * Re-running is safe: programs are upserted; the admin is created only when missing (its password is not rotated).
 */
import { pathToFileURL } from 'node:url'
import argon2 from 'argon2'
import mongoose from 'mongoose'
import { loadConfig } from '../src/config.js'
import { Program } from '../src/modules/programs/model.js'
import { User } from '../src/modules/users/model.js'
import { PROGRAMS } from '../../src/lib/constants.js'

export const ADMIN_EMAIL = 'admin@diu.edu'
const MIN_PASSWORD_LENGTH = 12
// context/16-backend-architecture.md §5 (argon2id parameters).
const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 }

/**
 * Validate the seed environment. Throws with a readable message; never echoes the password.
 * @param {Record<string, string | undefined>} [env]
 */
export function loadSeedEnv(env = process.env) {
  const config = loadConfig(env)
  if (config.NODE_ENV === 'production' && env.SEED_ALLOW_PROD !== 'true') {
    throw new Error('refusing to seed with NODE_ENV=production; set SEED_ALLOW_PROD=true to override')
  }
  const adminPassword = env.SEED_ADMIN_PASSWORD
  if (!adminPassword || adminPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SEED_ADMIN_PASSWORD: required, at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  return { config, adminPassword }
}

/**
 * Upsert the programs and create the admin if missing. Uses the mongoose connection already open.
 * @param {{ adminPassword: string }} opts
 * @returns {Promise<{ programs: number, admins: number }>}
 */
export async function seedDatabase({ adminPassword }) {
  await Program.bulkWrite(
    PROGRAMS.map((p) => ({
      updateOne: {
        filter: { _id: p.id },
        update: {
          $set: { name: p.name, faculty: p.faculty },
          $setOnInsert: { active: true },
        },
        upsert: true,
      },
    })),
  )

  if (!(await User.exists({ email: ADMIN_EMAIL }))) {
    await User.create({
      role: 'admin',
      name: 'DIU Administrator',
      email: ADMIN_EMAIL,
      passwordHash: await argon2.hash(adminPassword, ARGON2_OPTIONS),
      emailVerifiedAt: new Date(),
      status: 'active',
    })
  }

  return {
    programs: await Program.countDocuments(),
    admins: await User.countDocuments({ role: 'admin' }),
  }
}

export async function main(env = process.env) {
  const { config, adminPassword } = loadSeedEnv(env)
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  try {
    const counts = await seedDatabase({ adminPassword })
    console.log(`seed ok: programs=${counts.programs} admins=${counts.admins}`)
  } finally {
    await mongoose.disconnect()
  }
}

// Run only when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`seed failed: ${err.message}`)
    process.exitCode = 1
  })
}
