import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config.js'

// Match the production image (`mongo:7` in docker-compose.yml), not the library default (8.x).
// Override with MONGOMS_VERSION to try another server version locally.
const MONGO_VERSION = process.env.MONGOMS_VERSION ?? '7.0.14'

const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-0123456789',
  PEPPER: 'test-pepper-0123456789',
}

/**
 * Start an in-memory single-node Mongo replica set (so transactions work) and a Fastify app on it.
 * Built from an explicit env, never from `process.env`, so a developer's `.env` cannot leak in.
 *
 * Mongoose is a process-wide singleton: call this once at a time per test file (`beforeAll`),
 * and `stop()` before starting another. Vitest isolates files, so parallel files are fine.
 *
 * @param {{ env?: Record<string, string> }} [opts] `env` overrides individual TEST_ENV values (e.g. COOKIE_SECURE).
 * @returns {Promise<{ app: import('fastify').FastifyInstance, stop: () => Promise<void>, stopDb: () => Promise<void> }>}
 *   `stopDb` stops only the database (to test the DB-down path); `stop` closes the app, then the database. Both are idempotent.
 */
export async function startTestApp({ env = {} } = {}) {
  const replSet = await MongoMemoryReplSet.create({
    binary: { version: MONGO_VERSION },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  })
  let app
  try {
    const config = loadConfig({ ...TEST_ENV, ...env, MONGODB_URI: replSet.getUri('diu_test') })
    // Fail fast if the DB is stopped mid-test instead of waiting the 5 s default.
    app = await buildApp({ config, logger: false, mongoServerSelectionTimeoutMS: 2000 })
    await app.ready()
  } catch (err) {
    await app?.close().catch(() => {})
    await replSet.stop({ doCleanup: true, force: true }).catch(() => {})
    throw err
  }

  let dbStopped = false
  const stopDb = async () => {
    if (dbStopped) return
    dbStopped = true
    await replSet.stop({ doCleanup: true, force: true })
  }
  const stop = async () => {
    try {
      await app.close()
    } finally {
      await stopDb()
    }
  }
  return { app, stop, stopDb }
}
