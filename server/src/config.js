import { z } from 'zod'

const bool = z.enum(['true', 'false']).transform((v) => v === 'true')
const int = (def) => z.coerce.number().int().positive().default(def)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  MONGODB_URI: z
    .string({ error: 'is required' })
    .min(1, 'is required')
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  JWT_ACCESS_SECRET: z.string().min(1).default('change-me-at-least-32-bytes-long-random'),
  // A unit is mandatory. fast-jwt reads a bare number as MILLISECONDS (900 -> a 0.9 s token) while most
  // JWT tooling reads it as seconds, so a bare number is rejected rather than guessed.
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^[1-9]\d*[smhd]$/, 'must be a positive integer with a unit s, m, h or d (e.g. 15m or 900s); a bare number is ambiguous')
    .default('15m'),
  REFRESH_TTL_DAYS: int(7),
  COOKIE_SECURE: bool.default(false),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  PEPPER: z.string().min(1).default('change-me-random'),
  MAIL_DRIVER: z.enum(['smtp', 'console']).default('console'),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('DIU Admission <no-reply@diu.edu.bd>'),
  SMS_DRIVER: z.string().min(1).default('console'),
  SESSION_GRACE_SECONDS: z.coerce.number().int().min(0).default(30),
  EXPIRE_JOB_INTERVAL_SECONDS: int(60),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

const DEFAULT_MARKERS = ['change-me', 'changeme', 'secret', 'example']
const looksDefault = (v) => DEFAULT_MARKERS.some((m) => v.toLowerCase().includes(m))

/** Production-only rules: refuse default, short or insecure values. */
function productionProblems(c) {
  const problems = []
  if (c.JWT_ACCESS_SECRET.length < 32 || looksDefault(c.JWT_ACCESS_SECRET)) {
    problems.push('JWT_ACCESS_SECRET: must be a random value of at least 32 characters (not a default)')
  }
  if (c.PEPPER.length < 16 || looksDefault(c.PEPPER)) {
    problems.push('PEPPER: must be a random value of at least 16 characters (not a default)')
  }
  if (!c.COOKIE_SECURE) problems.push('COOKIE_SECURE: must be true in production')
  if (c.MAIL_DRIVER === 'smtp' && !c.SMTP_URL) problems.push('SMTP_URL: required when MAIL_DRIVER=smtp')
  return problems
}

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
    this.name = 'ConfigError'
    this.problems = problems
  }
}

/**
 * Parse and validate the environment. Throws ConfigError with a readable message.
 * Values are never echoed back, so a bad secret is not written to the logs.
 * @param {Record<string, string | undefined>} [env]
 */
export function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`))
  }
  const config = parsed.data
  if (config.NODE_ENV === 'production') {
    const problems = productionProblems(config)
    if (problems.length) throw new ConfigError(problems)
  }
  return Object.freeze({
    ...config,
    CORS_ORIGINS: config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  })
}
