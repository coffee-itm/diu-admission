import fp from 'fastify-plugin'
import { ROLES } from '@diu/shared/constants'
import { httpError } from '../lib/httpError.js'
import { authenticateBearer } from '../modules/auth/service.js'

/**
 * Request guards (context/16 §4–§5). Both run in `onRequest`, in this order, so they answer BEFORE schema validation:
 *   app.addHook('onRequest', app.authenticate)            // 401 unless a valid bearer token of a live, active user
 *   app.addHook('onRequest', app.requireRole('admin'))    // 403 unless req.user.role is allowed
 * Never use `preHandler` for either: Fastify validates the body first, so a wrong-role caller would get a 422
 * that exposes the route's request schema instead of a 403.
 *
 * `req.user` is `{ sub, role, programCodes }`, read from the database by `authenticateBearer`, not copied
 * from the token. Token handling itself stays in `modules/auth/service.js`; this plugin never touches the secret.
 */
export default fp(async function authPlugin(app, { config }) {
  app.decorateRequest('user', null)

  app.decorate('authenticate', async (req) => {
    req.user = await authenticateBearer(req.headers.authorization, config)
  })

  app.decorate('requireRole', (...roles) => {
    // A typo here would silently lock everyone out (or, worse, match nothing): fail at startup.
    const unknown = roles.filter((role) => !ROLES.includes(role))
    if (roles.length === 0 || unknown.length) {
      throw new Error(`requireRole: expected one or more of ${ROLES.join(', ')}; got ${JSON.stringify(roles)}`)
    }
    return async (req) => {
      if (!req.user) throw httpError(401, 'UNAUTHENTICATED', 'Authentication required') // guard used without `authenticate`
      if (!roles.includes(req.user.role)) throw httpError(403, 'FORBIDDEN', 'You do not have access to this resource')
    }
  })

  // `[]` means "every program" (admin, or a reviewer with no restriction). Services merge a non-empty
  // result into their query as `programCode: { $in: [...] }`. A candidate has no staff scope: asking for
  // one is a bug, and answering "[] = all" would be the dangerous default, so it is refused.
  app.decorate('programScope', (req) => {
    const user = req.user
    if (!user) throw httpError(401, 'UNAUTHENTICATED', 'Authentication required')
    if (user.role === 'admin') return []
    if (user.role === 'reviewer') return [...user.programCodes]
    throw httpError(403, 'FORBIDDEN', 'You do not have access to this resource')
  })
}, { name: 'diu-auth' })
