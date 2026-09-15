import { afterEach, describe, expect, it } from 'vitest'

import { errorResponse, requireAdmin } from './route-utils'
import { assertSameOrigin } from './security'

afterEach(() => {
  delete process.env.ADMIN_ACCESS_MODE
  delete process.env.ADMIN_ALLOWED_ORIGIN
})

describe('requireAdmin', () => {
  it('rejects a non-loopback request before granting the local identity', async () => {
    const request = new Request('https://admin.example.com/api/articles', {
      headers: { host: 'admin.example.com' }
    })

    await expect(requireAdmin(request)).rejects.toMatchObject({ status: 403 })
  })

  it('returns the local identity for a valid loopback request', async () => {
    const request = new Request('http://127.0.0.1:3000/api/articles', {
      headers: { host: '127.0.0.1:3000' }
    })

    await expect(requireAdmin(request)).resolves.toMatchObject({
      login: '本地工作区',
      local: true
    })
  })

  it('returns the private-network identity in direct deployment mode', async () => {
    process.env.ADMIN_ACCESS_MODE = 'private'
    process.env.ADMIN_ALLOWED_ORIGIN = 'http://feiniunas:3000'

    const request = new Request('http://feiniunas:3000/api/articles', {
      headers: {
        host: 'feiniunas:3000'
      }
    })

    await expect(requireAdmin(request)).resolves.toEqual({
      login: '私有网络',
      local: false
    })
  })

  it('maps a rejected write Origin to HTTP 403', async () => {
    let thrown: unknown

    try {
      assertSameOrigin(
        new Request('http://127.0.0.1:3000/api/article', {
          headers: {
            host: '127.0.0.1:3000',
            origin: 'https://attacker.example'
          }
        })
      )
    } catch (error) {
      thrown = error
    }

    expect(errorResponse(thrown).status).toBe(403)
  })
})
