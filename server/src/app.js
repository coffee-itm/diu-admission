import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { loadConfig } from './config.js'
import zodPlugin from './plugins/zod.js'
import securityPlugin from './plugins/security.js'
import errorsPlugin from './plugins/errors.js'
import mongoosePlugin from './plugins/mongoose.js'
import healthRoutes from './modules/health/routes.js'
import authPlugin from './plugins/auth.js'
import authRoutes from './modules/auth/routes.js'

export const API_PREFIX = '/api/v1'

// Never log credentials. `*.code` covers OTP codes (also hides err.code in error logs).
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.code',
]

const REQUEST_ID = /^[\w.:-]{1,128}$/

export function genReqId(req) {
  const header = req.headers['x-request-id']
  // Only accept a sane value: the id is echoed in a header and written to logs.
  return typeof header === 'string' && REQUEST_ID.test(header) ? header : randomUUID()
}

function loggerOptions(config) {
  const opts = { level: config.LOG_LEVEL, redact: { paths: REDACT_PATHS, censor: '[Redacted]' } }
  if (config.NODE_ENV === 'development') {
    opts.transport = { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
  }
  return opts
}

/**
 * Build the Fastify app (does not listen). Used by server.js and by tests.
 * @param {{ config?: ReturnType<typeof loadConfig>, logger?: import('fastify').FastifyServerOptions['logger'],
 *           mongoServerSelectionTimeoutMS?: number,
 *           extraRoutes?: import('fastify').FastifyPluginAsync[] }} [opts] `extraRoutes` are registered under the API
 *           prefix after the real modules; tests use it for guard probes, production never passes it.
 */
export async function buildApp(opts = {}) {
  const config = opts.config ?? loadConfig()
  const app = Fastify({
    logger: opts.logger ?? loggerOptions(config),
    genReqId,
  })

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Request-Id', req.id)
    reply.header('X-Server-Time', new Date().toISOString())
  })

  await app.register(zodPlugin)
  await app.register(errorsPlugin)
  await app.register(securityPlugin, { config })
  await app.register(mongoosePlugin, { config, serverSelectionTimeoutMS: opts.mongoServerSelectionTimeoutMS })

  await app.register(cookie)

  await app.register(authPlugin, { config })

  await app.register(healthRoutes, { prefix: API_PREFIX })
  await app.register(authRoutes, { prefix: API_PREFIX, config })

  for (const plugin of opts.extraRoutes ?? []) await app.register(plugin, { prefix: API_PREFIX })

  return app
}
