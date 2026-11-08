import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../src/config.js'

const base = { MONGODB_URI: 'mongodb://localhost:27017/x' }

describe('JWT_ACCESS_TTL format', () => {
  it.each(['15m', '900s', '1h', '2d'])('accepts %s', (ttl) => {
    expect(loadConfig({ ...base, JWT_ACCESS_TTL: ttl }).JWT_ACCESS_TTL).toBe(ttl)
  })

  it('defaults to 15m', () => {
    expect(loadConfig(base).JWT_ACCESS_TTL).toBe('15m')
  })

  // fast-jwt reads a bare number as MILLISECONDS (900 -> a 0.9 s token), other libraries as seconds.
  // The unit is ambiguous, so it is rejected rather than guessed.
  it.each(['900', '0', '0s', '-5m', '15', '15 m', '1.5h', '15min', 'abc', ' 15m'])('rejects %j', (ttl) => {
    expect(() => loadConfig({ ...base, JWT_ACCESS_TTL: ttl })).toThrow(ConfigError)
    expect(() => loadConfig({ ...base, JWT_ACCESS_TTL: ttl })).toThrow(/JWT_ACCESS_TTL/)
  })
})
