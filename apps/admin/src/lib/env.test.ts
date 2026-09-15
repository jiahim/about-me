import { afterEach, describe, expect, it } from 'vitest'

import {
  getAdminAccessMode,
  getAdminHost,
  getAdminOrigin,
  getAdminPublicOrigin,
  getAllowedTailscaleUsers
} from './env'

afterEach(() => {
  delete process.env.ADMIN_ACCESS_MODE
  delete process.env.ADMIN_PUBLIC_ORIGIN
  delete process.env.ADMIN_TAILSCALE_ALLOWED_USERS
})

it('binds the workbench to the IPv4 loopback host', () => {
  expect(getAdminHost()).toBe('127.0.0.1')
})

it('accepts loopback origins used by the local workbench', () => {
  expect(getAdminOrigin('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000')
  expect(getAdminOrigin('http://localhost:3000')).toBe('http://localhost:3000')
})

it('rejects non-loopback origins', () => {
  expect(() => getAdminOrigin('https://cms.example.com')).toThrow('仅允许本机访问')
})

describe('Tailscale access configuration', () => {
  it('defaults to local access', () => {
    expect(getAdminAccessMode()).toBe('local')
    expect(getAdminPublicOrigin()).toBeNull()
    expect(getAllowedTailscaleUsers()).toEqual(new Set())
  })

  it('parses an HTTPS public origin and normalized user allowlist', () => {
    process.env.ADMIN_ACCESS_MODE = 'tailscale'
    process.env.ADMIN_PUBLIC_ORIGIN = 'https://editor.example-tailnet.ts.net'
    process.env.ADMIN_TAILSCALE_ALLOWED_USERS = ' Owner@Example.com,editor@example.com '

    expect(getAdminAccessMode()).toBe('tailscale')
    expect(getAdminPublicOrigin()).toBe('https://editor.example-tailnet.ts.net')
    expect(getAllowedTailscaleUsers()).toEqual(
      new Set(['owner@example.com', 'editor@example.com'])
    )
  })

  it.each([
    'http://editor.example-tailnet.ts.net',
    'https://user:secret@editor.example-tailnet.ts.net',
    'https://editor.example-tailnet.ts.net/path',
    'https://editor.example-tailnet.ts.net?query=1',
    'not-a-url'
  ])('rejects an unsafe Tailscale public origin: %s', (origin) => {
    process.env.ADMIN_ACCESS_MODE = 'tailscale'
    process.env.ADMIN_PUBLIC_ORIGIN = origin
    process.env.ADMIN_TAILSCALE_ALLOWED_USERS = 'owner@example.com'

    expect(() => getAdminPublicOrigin()).toThrow()
  })

  it('fails closed when the Tailscale user allowlist is empty', () => {
    process.env.ADMIN_ACCESS_MODE = 'tailscale'
    process.env.ADMIN_PUBLIC_ORIGIN = 'https://editor.example-tailnet.ts.net'

    expect(() => getAllowedTailscaleUsers()).toThrow('白名单')
  })

  it('rejects an unknown access mode', () => {
    process.env.ADMIN_ACCESS_MODE = 'public'
    expect(() => getAdminAccessMode()).toThrow('ADMIN_ACCESS_MODE')
  })
})
