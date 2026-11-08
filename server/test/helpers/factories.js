// Test data factories. Question factories arrive with the question module (S4).
import { hashPassword } from '../../src/modules/auth/service.js'
import { User } from '../../src/modules/users/model.js'

export const TEST_PASSWORD = 'Test@1234-correct'

let counter = 0

/**
 * Build (not save) a User with a real argon2id hash, via the same `hashPassword` the app uses.
 * @param {Record<string, unknown>} [overrides]
 */
export async function buildUser(overrides = {}) {
  counter += 1
  return new User({
    role: 'candidate',
    name: 'Test User',
    email: `user-${counter}-${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: await hashPassword(TEST_PASSWORD),
    ...overrides,
  })
}

/** Build and save a User. */
export async function createUser(overrides = {}) {
  const user = await buildUser(overrides)
  return user.save()
}
