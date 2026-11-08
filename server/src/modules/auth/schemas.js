import { z } from 'zod'

// FR-AUTH-01. Request/response contracts for /auth (context/15 §2).

const PHONE_BD = /^(\+?880)?1[3-9]\d{8}$/
const MAX_PASSWORD = 128 // argon2 cost grows with input size: an unbounded password is a DoS vector

const email = z.string().trim().toLowerCase().pipe(z.email().max(254))

const registerPassword = z
  .string()
  .min(8, 'must be at least 8 characters')
  .max(MAX_PASSWORD, `must be at most ${MAX_PASSWORD} characters`)
  .regex(/[A-Za-z]/, 'must contain a letter')
  .regex(/\d/, 'must contain a digit')

// Normalised to +8801XXXXXXXXX.
const phone = z
  .string()
  .trim()
  .regex(PHONE_BD, 'must be a Bangladeshi mobile number, e.g. +8801712345678')
  .transform((v) => `+880${v.replace(/^\+?880/, '')}`)

const gpa = z.number().min(0).max(5)

// Unknown keys (notably `role`) are stripped by Zod, never read (FR-AUTH-10).
export const registerBody = z.object({
  name: z.string().trim().min(3).max(100),
  email,
  phone,
  password: registerPassword,
  // Whether the program exists and is active is a DB check, made in the service.
  programCode: z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z]{2,10}$/, 'must be a program code such as CSE')),
  sscGpa: gpa,
  hscGpa: gpa,
  hscGroup: z.enum(['science', 'commerce', 'arts', 'other']),
})

// No complexity rules on login (those apply when a password is set), only presence and the length cap.
export const loginBody = z.object({
  email,
  password: z.string().min(1).max(MAX_PASSWORD),
})

export const publicUser = z.object({
  id: z.string(),
  role: z.enum(['candidate', 'reviewer', 'admin']),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  emailVerified: z.boolean(),
  programCode: z.string().optional(),
  programCodes: z.array(z.string()).optional(),
  preferences: z.object({ lang: z.enum(['en', 'bn']) }),
})

export const authResponse = z.object({ user: publicUser, accessToken: z.string() })
export const meResponse = z.object({ user: publicUser })
