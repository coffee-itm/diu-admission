import { z } from 'zod'
import { checkDb } from './service.js'

const live = z.object({ status: z.literal('ok') })
const readyOk = z.object({ status: z.literal('ok'), db: z.literal('ok') })
const readyDown = z.object({ status: z.literal('unavailable'), db: z.enum(['connecting', 'down']) })

// Probes must not be rate-limited or they would fail under load.
const noLimit = { rateLimit: false }

export default async function healthRoutes(app) {
  app.get('/health', { config: noLimit, schema: { response: { 200: live } } }, async () => ({ status: 'ok' }))

  app.get('/ready', { config: noLimit, schema: { response: { 200: readyOk, 503: readyDown } } }, async (req, reply) => {
    const db = await checkDb(app.mongoose)
    if (db === 'ok') return { status: 'ok', db }
    req.log.warn({ db }, 'readiness check failed')
    return reply.code(503).send({ status: 'unavailable', db })
  })
}
