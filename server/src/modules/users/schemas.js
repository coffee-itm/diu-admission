import { z } from 'zod'
import { objectIdString } from '@diu/shared/schemas/common'
import { email, publicUser, registerPassword } from '../auth/schemas.js'

// Contracts for /admin/users (context/15 §5.5). Whether a program exists and is active, and whether a
// reviewer has a scope, are rules about data and live in service.js.

export const STAFF_ROLES = ['reviewer', 'admin']

const programCode = z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z]{2,10}$/, 'must be a program code such as CSE'))
// Trimmed, upper-cased, de-duplicated (first occurrence wins, so order is the caller's). An EMPTY list is valid
// *shape* here but never valid for a reviewer: service.js refuses it (14 §3.2: empty would mean "all programs").
const programCodes = z.array(programCode).max(50).transform((codes) => [...new Set(codes)])

export const createUserBody = z.object({
  role: z.enum(STAFF_ROLES),
  name: z.string().trim().min(3).max(100),
  email,
  password: registerPassword,
  programCodes: programCodes.optional(),
})

export const updateUserBody = z
  .object({
    status: z.enum(['active', 'disabled']),
    role: z.enum(STAFF_ROLES),
    programCodes,
  })
  .partial()
  .refine((body) => Object.values(body).some((v) => v !== undefined), { message: 'at least one of status, role, programCodes is required' })

export const userIdParams = z.object({ id: objectIdString })

export const listUsersQuery = z.object({
  role: z.enum(STAFF_ROLES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// `toPublicUser` output plus the one thing an admin needs that a user does not: the account status.
export const adminUser = publicUser.extend({ status: z.enum(['active', 'disabled']) })
export const adminUserList = z.object({
  items: z.array(adminUser),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
})
