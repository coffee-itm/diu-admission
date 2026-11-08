import fp from 'fastify-plugin'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { HttpError, httpError } from '../lib/httpError.js'

// Codes for errors raised by Fastify/plugins (statusCode set, not an HttpError).
const CODE_BY_STATUS = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  429: 'RATE_LIMITED',
}

const envelope = (code, message, details) => ({
  error: { code, message, ...(details ? { details } : {}) },
})

const toDetails = (validation) =>
  validation.map((v) => ({
    path: (v.instancePath ?? '').replace(/^\//, '').replaceAll('/', '.'),
    message: v.message ?? 'Invalid value',
  }))

/**
 * Map any thrown value to `{ status, body }`. The body never contains a stack or the
 * original message of an unexpected error.
 */
export function toErrorResponse(err) {
  if (err instanceof HttpError && err.status < 500) {
    return { status: err.status, body: envelope(err.code, err.message, err.details) }
  }
  if (hasZodFastifySchemaValidationErrors(err) || Array.isArray(err?.validation)) {
    return {
      status: 422,
      body: envelope('VALIDATION_ERROR', 'Request validation failed', toDetails(err.validation)),
    }
  }
  const status = err?.statusCode
  if (!(err instanceof HttpError) && Number.isInteger(status) && status >= 400 && status < 500) {
    // Client errors raised by Fastify itself (malformed JSON, payload too large, 429 ...).
    return { status, body: envelope(CODE_BY_STATUS[status] ?? 'BAD_REQUEST', err.message) }
  }
  // Everything else, including HttpError >= 500 and response-serialization failures.
  return { status: 500, body: envelope('INTERNAL', 'Internal server error') }
}

export default fp(async function errorsPlugin(app) {
  app.setErrorHandler((err, req, reply) => {
    const { status, body } = toErrorResponse(err)
    if (status >= 500) req.log.error({ err }, 'unhandled error') // stack goes to the log only
    return reply.code(status).send(body)
  })

  app.setNotFoundHandler((req, reply) => {
    const { status, body } = toErrorResponse(httpError(404, 'NOT_FOUND', `Route ${req.method} ${req.url.split('?')[0]} not found`))
    return reply.code(status).send(body)
  })
}, { name: 'diu-errors' })
