import { expect, it } from 'vitest'

import { getAdminHost, getAdminOrigin } from './env'

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
