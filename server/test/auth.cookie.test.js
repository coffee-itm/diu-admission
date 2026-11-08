import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestApp } from './helpers/app.js'
import { Program } from '../src/modules/programs/model.js'
import { User } from '../src/modules/users/model.js'

// COOKIE_SECURE=true needs its own app (config is read once at boot), hence its own file.
describe('diu_rt cookie with COOKIE_SECURE=true (criterion 5)', () => {
  let ctx
  beforeAll(async () => {
    ctx = await startTestApp({ env: { COOKIE_SECURE: 'true' } })
    await Promise.all([User.init(), Program.init()])
    await Program.create({ _id: 'CSE', name: 'CSE', faculty: 'Science & Technology' })
  })
  afterAll(async () => {
    await ctx?.stop()
  })

  const body = {
    name: 'Secure User', email: 'secure@example.com', phone: '+8801712345678', password: 'Passw0rd-ok',
    programCode: 'CSE', sscGpa: 4, hscGpa: 4, hscGroup: 'science',
  }

  it('sets Secure on register, refresh and the clearing cookie', async () => {
    const reg = await ctx.app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: body })
    expect(reg.statusCode).toBe(201)
    const issued = reg.cookies.find((c) => c.name === 'diu_rt')
    expect(issued).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict', path: '/api/v1/auth' })

    const refreshed = await ctx.app.inject({
      method: 'POST', url: '/api/v1/auth/refresh', cookies: { diu_rt: issued.value },
    })
    expect(refreshed.cookies.find((c) => c.name === 'diu_rt')).toMatchObject({ secure: true, httpOnly: true })

    const out = await ctx.app.inject({
      method: 'POST', url: '/api/v1/auth/logout', cookies: { diu_rt: refreshed.cookies.find((c) => c.name === 'diu_rt').value },
    })
    expect(out.cookies.find((c) => c.name === 'diu_rt')).toMatchObject({ value: '', secure: true, path: '/api/v1/auth' })
  })
})
