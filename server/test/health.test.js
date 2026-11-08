import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestApp } from './helpers/app.js'

describe('GET /api/v1/health and /ready (database up)', () => {
  let ctx
  beforeAll(async () => {
    ctx = await startTestApp()
  })
  afterAll(async () => {
    await ctx?.stop()
  })

  it('liveness: /health is 200 { status: ok }', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('readiness: /ready is 200 with db ok', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/ready' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' })
  })

  it('echoes X-Request-Id and sets X-Server-Time', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health', headers: { 'x-request-id': 'abc-123' } })
    expect(res.headers['x-request-id']).toBe('abc-123')
    expect(Number.isNaN(Date.parse(res.headers['x-server-time']))).toBe(false)
  })
})

describe('GET /api/v1/health and /ready (database down)', () => {
  let ctx
  beforeAll(async () => {
    ctx = await startTestApp()
    await ctx.stopDb()
  })
  afterAll(async () => {
    await ctx?.stop()
  })

  it('liveness: /health stays 200 when the database is down', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
  })

  it('readiness: /ready is 503 once the replica set is stopped', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/ready' })
    expect(res.statusCode).toBe(503)
    const body = res.json()
    expect(body.status).toBe('unavailable')
    expect(['connecting', 'down']).toContain(body.db)
  })
})
