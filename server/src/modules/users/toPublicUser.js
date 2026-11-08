/**
 * The ONLY way a user leaves the API (context/15 §2: `user` = { id, role, name, email, phone,
 * emailVerified, programCode?, programCodes?, preferences }).
 *
 * It is an allow-list, not a "delete the secret fields" filter, so it holds for every shape a user
 * can arrive in: a Mongoose document (with or without `+passwordHash`), `.toObject()`, `.lean()`
 * and `aggregate()` output. `toJSON` on the schema only covers `JSON.stringify(doc)`; it does not
 * cover any of those. Anything not named here (passwordHash, failedLogins, __v, ...) cannot leak,
 * and a field added to the schema later stays private until it is added here on purpose.
 *
 * @param {object} user
 */
export function toPublicUser(user) {
  const u = typeof user.toObject === 'function' ? user.toObject() : user
  const out = {
    id: String(u.id ?? u._id),
    role: u.role,
    name: u.name,
    email: u.email,
    phone: u.phone,
    emailVerified: Boolean(u.emailVerifiedAt),
    preferences: { lang: u.preferences?.lang ?? 'en' },
  }
  if (u.role === 'candidate' && u.candidate?.programCode) out.programCode = u.candidate.programCode
  if (u.role === 'reviewer') out.programCodes = [...(u.reviewer?.programCodes ?? [])]
  return out
}
