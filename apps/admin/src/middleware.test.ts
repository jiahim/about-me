import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { middleware } from './middleware'

describe('admin access middleware', () => {
  beforeEach(() => {
    process.env.ADMIN_ACCESS_MODE = 'tailscale'
    process.env.ADMIN_PUBLIC_ORIGIN = 'https://editor.example-tailnet.ts.net'
    process.env.ADMIN_TAILSCALE_ALLOWED_USERS = 'owner@example.com'
  })

  afterEach(() => {
    delete process.env.ADMIN_ACCESS_MODE
    delete process.env.ADMIN_PUBLIC_ORIGIN
    delete process.env.ADMIN_TAILSCALE_ALLOWED_USERS
  })

  function request(login?: string): NextRequest {
    return new NextRequest('http://127.0.0.1:3000/', {
      headers: {
        host: 'editor.example-tailnet.ts.net',
        'x-forwarded-proto': 'https',
        ...(login ? { 'tailscale-user-login': login } : {})
      }
    })
  }

  it('allows an authenticated page request to continue', () => {
    expect(middleware(request('owner@example.com')).status).toBe(200)
  })

  it('returns 403 before rendering the page for an unauthenticated request', async () => {
    const response = middleware(request())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: '请求缺少可信的 Tailscale 身份'
    })
  })
})
