import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { middleware } from './middleware'

describe('admin access middleware', () => {
  beforeEach(() => {
    process.env.ADMIN_ACCESS_MODE = 'private'
    process.env.ADMIN_ALLOWED_ORIGIN = 'http://feiniunas:3000'
  })

  afterEach(() => {
    delete process.env.ADMIN_ACCESS_MODE
    delete process.env.ADMIN_ALLOWED_ORIGIN
  })

  function request(host = 'feiniunas:3000'): NextRequest {
    return new NextRequest('http://feiniunas:3000/', {
      headers: {
        host
      }
    })
  }

  it('allows a direct private-network page request to continue', () => {
    expect(middleware(request()).status).toBe(200)
  })

  it('returns 403 before rendering the page for a request using another Host', async () => {
    const response = middleware(request('attacker.example.com'))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: '请求主机校验失败，请使用配置的私有管理端地址'
    })
  })
})
