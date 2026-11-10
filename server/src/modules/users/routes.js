import { adminUser, adminUserList, createUserBody, listUsersQuery, updateUserBody, userIdParams } from './schemas.js'
import * as users from './service.js'

/**
 * /admin/users (context/15 §5.5). Admin only. Both guards run in `onRequest`, BEFORE schema validation, so a
 * candidate or reviewer gets 403 and never sees these request schemas in a 422 (context/16 §4).
 * Routes are thin: validate, call one service function, reply. The service returns users already shaped by
 * `toPublicUser` (+ status); no raw document leaves this module.
 */
export default async function userRoutes(app) {
  app.addHook('onRequest', app.authenticate)
  app.addHook('onRequest', app.requireRole('admin'))

  const actorOf = (req) => ({ actorId: req.user.sub, ip: req.ip })

  app.get('/admin/users', {
    schema: { querystring: listUsersQuery, response: { 200: adminUserList } },
  }, async (req) => users.listStaff(req.query))

  app.post('/admin/users', {
    schema: { body: createUserBody, response: { 201: adminUser } },
  }, async (req, reply) => reply.code(201).send(await users.createStaff(actorOf(req), req.body)))

  app.patch('/admin/users/:id', {
    schema: { params: userIdParams, body: updateUserBody, response: { 200: adminUser } },
  }, async (req) => users.updateStaff(actorOf(req), req.params.id, req.body))
}
