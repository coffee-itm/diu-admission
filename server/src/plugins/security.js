import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { httpError } from '../lib/httpError.js'

export default fp(async function securityPlugin(app, { config }) {
  await app.register(helmet)
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['X-Server-Time', 'X-Request-Id'],
  })
  // Global 300 req/min/IP (context/15 §1). Per-route limits are set in later cards.
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) =>
      Object.assign(httpError(429, 'RATE_LIMITED', 'Too many requests'), {
        statusCode: 429,
        retryAfterMs: context.ttl,
      }),
  })
}, { name: 'diu-security' })
