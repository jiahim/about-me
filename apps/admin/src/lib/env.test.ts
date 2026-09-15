import { afterEach, describe, expect, it } from 'vitest'

import {
  getAdminAccessMode,
  getAdminHost,
  getAdminOrigin,
  getAdminAllowedOrigin,
  getAdminPort
} from './env'

afterEach(() => {
  delete process.env.ADMIN_ACCESS_MODE
  delete process.env.ADMIN_ALLOWED_ORIGIN
  delete process.env.ADMIN_HOST
  delete process.env.PORT
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

describe('private network access configuration', () => {
  it('defaults to local access', () => {
    expect(getAdminAccessMode()).toBe('local')
    expect(getAdminAllowedOrigin()).toBeNull()
    expect(getAdminHost()).toBe('127.0.0.1')
    expect(getAdminPort()).toBe(3000)
  })

  it('parses a direct private-network origin and bind address', () => {
    process.env.ADMIN_ACCESS_MODE = 'private'
    process.env.ADMIN_ALLOWED_ORIGIN = 'http://feiniunas:3000'
    process.env.ADMIN_HOST = '0.0.0.0'
    process.env.PORT = '3000'

    expect(getAdminAccessMode()).toBe('private')
    expect(getAdminAllowedOrigin()).toBe('http://feiniunas:3000')
    expect(getAdminHost()).toBe('0.0.0.0')
    expect(getAdminPort()).toBe(3000)
  })

  it.each([
    'ftp://feiniunas:3000',
    'http://user:secret@feiniunas:3000',
    'http://feiniunas:3000/path',
    'http://feiniunas:3000?query=1',
    'not-a-url'
  ])('rejects an unsafe private-network origin: %s', (origin) => {
    process.env.ADMIN_ACCESS_MODE = 'private'
    process.env.ADMIN_ALLOWED_ORIGIN = origin

    expect(() => getAdminAllowedOrigin()).toThrow()
  })

  it('fails closed when the private-network origin is missing', () => {
    process.env.ADMIN_ACCESS_MODE = 'private'

    expect(() => getAdminAllowedOrigin()).toThrow('ADMIN_ALLOWED_ORIGIN')
  })

  it('rejects an unknown access mode', () => {
    process.env.ADMIN_ACCESS_MODE = 'tailscale'
    expect(() => getAdminAccessMode()).toThrow('ADMIN_ACCESS_MODE')
  })

  it.each(['http://0.0.0.0', 'host/name', 'bad host', ''])('rejects an invalid bind host: %s', (host) => {
    process.env.ADMIN_HOST = host
    expect(() => getAdminHost()).toThrow('ADMIN_HOST')
  })

  it.each(['0', '65536', 'not-a-port'])('rejects an invalid port: %s', (port) => {
    process.env.PORT = port
    expect(() => getAdminPort()).toThrow('PORT')
  })
})
