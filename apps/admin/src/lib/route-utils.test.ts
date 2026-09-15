import { afterEach, describe, expect, it } from 'vitest'

import { errorResponse, requireAdmin } from './route-utils'
import { assertSameOrigin } from './security'

afterEach(() => {
  delete process.env.ADMIN_ACCESS_MODE
  delete process.env.ADMIN_PUBLIC_ORIGIN
  delete process.env.ADMIN_TAILSCALE_ALLOWED_USERS
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

  it('returns the authenticated Tailscale identity in private deployment mode', async () => {
    process.env.ADMIN_ACCESS_MODE = 'tailscale'
    process.env.ADMIN_PUBLIC_ORIGIN = 'https://editor.example-tailnet.ts.net'
    process.env.ADMIN_TAILSCALE_ALLOWED_USERS = 'owner@example.com'

    const request = new Request('http://127.0.0.1:3000/api/articles', {
      headers: {
        host: 'editor.example-tailnet.ts.net',
        'x-forwarded-proto': 'https',
        'tailscale-user-login': 'owner@example.com'
      }
    })

    await expect(requireAdmin(request)).resolves.toEqual({
      login: 'owner@example.com',
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
