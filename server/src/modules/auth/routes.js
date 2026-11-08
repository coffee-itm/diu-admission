import { httpError } from '../../lib/httpError.js'
import { toPublicUser } from '../users/toPublicUser.js'
import { authResponse, loginBody, meResponse, registerBody } from './schemas.js'
import * as auth from './service.js'

const COOKIE_NAME = 'diu_rt'
const COOKIE_PATH = '/api/v1/auth' // the cookie is only ever sent to /auth/* (context/16 §5)

// 15 §1: "Auth: 10/min/IP". The per-email lock (5 failures / 15 min) lives in the service.
const authLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } }

const userAgent = (req) => String(req.headers['user-agent'] ?? '').slice(0, 256) || undefined

/**
 * Routes are thin: validate, call one service function, reply. Every user that leaves this module
 * goes through `toPublicUser`.
 */
export default async function authRoutes(app, { config }) {
  const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: config.COOKIE_SECURE,
    path: COOKIE_PATH,
  })
  const setRefreshCookie = (reply, refresh) =>
    reply.setCookie(COOKIE_NAME, refresh.token, { ...cookieOptions(), expires: refresh.expiresAt })
  const clearRefreshCookie = (reply) => reply.clearCookie(COOKIE_NAME, cookieOptions())

  // CSRF (16 §5): SameSite=Strict is the main defence; additionally refuse a cross-origin Origin on
  // the cookie-authenticated endpoints. Non-browser clients send no Origin and are allowed.
  const checkOrigin = async (req) => {
    const { origin } = req.headers
    if (origin !== undefined && !config.CORS_ORIGINS.includes(origin)) {
      throw httpError(403, 'FORBIDDEN', 'Origin not allowed')
    }
  }

  // Minimal bearer check for /me. T-047 replaces this with the shared `authenticate` decorator.
  const requireBearer = async (req) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')
    if (!match) throw httpError(401, 'UNAUTHENTICATED', 'Missing or invalid access token')
    req.user = auth.verifyAccessToken(match[1], config)
  }

  const sessionReply = (reply, { user, accessToken, refresh }, status) => {
    setRefreshCookie(reply, refresh)
    return reply.code(status).send({ user: toPublicUser(user), accessToken })
  }

  app.post('/auth/register', {
    config: authLimit,
    schema: { body: registerBody, response: { 201: authResponse } },
  }, async (req, reply) => sessionReply(reply, await auth.registerCandidate(req.body, userAgent(req), config), 201))

  app.post('/auth/login', {
    config: authLimit,
    schema: { body: loginBody, response: { 200: authResponse } },
  }, async (req, reply) => sessionReply(reply, await auth.loginWithPassword(req.body, userAgent(req), config), 200))

  app.post('/auth/refresh', {
    onRequest: checkOrigin,
    schema: { response: { 200: authResponse } },
  }, async (req, reply) => {
    try {
      return sessionReply(reply, await auth.refreshSession(req.cookies[COOKIE_NAME], userAgent(req), config), 200)
    } catch (err) {
      clearRefreshCookie(reply) // a rejected cookie is dead; do not keep sending it
      throw err
    }
  })

  app.post('/auth/logout', { onRequest: checkOrigin }, async (req, reply) => {
    await auth.revokeToken(req.cookies[COOKIE_NAME])
    clearRefreshCookie(reply)
    return reply.code(204).send()
  })

  app.get('/auth/me', {
    onRequest: requireBearer,
    schema: { response: { 200: meResponse } },
  }, async (req) => ({ user: toPublicUser(await auth.getActiveUser(req.user.sub)) }))
}
