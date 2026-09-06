import { describe, expect, it } from 'vitest'

import { errorResponse, requireAdmin } from './route-utils'
import { assertSameOrigin } from './security'

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
