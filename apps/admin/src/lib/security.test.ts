import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  authorizeAdminRequest,
  assertLoopbackRequest,
  assertSameOrigin
} from './security'

function request(
  url: string,
  headers: Record<string, string> = {}
): Request {
  return new Request(url, { headers })
}

afterEach(() => {
  delete process.env.ADMIN_ACCESS_MODE
  delete process.env.ADMIN_ALLOWED_ORIGIN
})

describe('assertLoopbackRequest', () => {
  it.each([
    ['http://127.0.0.1:3000/api/articles', '127.0.0.1:3000'],
    ['http://localhost:3000/api/articles', 'localhost:3000'],
    ['http://[::1]:3000/api/articles', '[::1]:3000'],
    ['http://127.0.0.1:80/api/articles', '127.0.0.1:80'],
    ['https://localhost:443/api/articles', 'localhost:443']
  ])('accepts a loopback URL and matching Host: %s', (url, host) => {
    expect(() => assertLoopbackRequest(request(url, { host }))).not.toThrow()
  })

  it('rejects a non-loopback request URL', () => {
    expect(() =>
      assertLoopbackRequest(
        request('https://admin.example.com/api/articles', {
          host: 'admin.example.com'
        })
      )
    ).toThrow('管理端仅允许本机访问')
  })

  it('rejects private LAN hosts even when a legacy environment variable is present', () => {
    process.env.ADMIN_LAN_HOST = '192.168.5.21'
    expect(() =>
      assertLoopbackRequest(
        request('http://192.168.5.21:3000/api/articles', {
          host: '192.168.5.21:3000'
        })
      )
    ).toThrow('管理端仅允许本机访问')
    expect(() =>
      assertSameOrigin(
        request('http://127.0.0.1:3001/api/article', {
          host: '192.168.5.21:3000',
          origin: 'http://192.168.5.21:3000'
        })
      )
    ).toThrow('请求主机校验失败')
    delete process.env.ADMIN_LAN_HOST
  })

  it('rejects a non-HTTP loopback URL', () => {
    expect(() =>
      assertLoopbackRequest(
        request('ftp://127.0.0.1:3000/api/articles', {
          host: '127.0.0.1:3000'
        })
      )
    ).toThrow('管理端仅允许 HTTP')
  })

  it('rejects a missing Host header', () => {
    expect(() =>
      assertLoopbackRequest(request('http://127.0.0.1:3000/api/articles'))
    ).toThrow('请求主机校验失败')
  })

  it.each([
    ['http://localhost:3000/api/articles', '127.0.0.1:3000'],
    ['http://127.0.0.1:3000/api/articles', 'localhost:3000'],
    ['http://[::1]:3000/api/articles', 'localhost:3000']
  ])('accepts an equivalent loopback Host: %s with %s', (url, host) => {
    expect(() =>
      assertLoopbackRequest(request(url, { host }))
    ).not.toThrow()
  })

  it('rejects an equivalent loopback Host on a different port', () => {
    expect(() =>
      assertLoopbackRequest(
        request('http://localhost:3000/api/articles', {
          host: '127.0.0.1:3001'
        })
      )
    ).toThrow('请求主机校验失败')
  })

  it('rejects a non-loopback Host for a loopback request URL', () => {
    expect(() =>
      assertLoopbackRequest(
        request('http://localhost:3000/api/articles', {
          host: 'admin.example.com'
        })
      )
    ).toThrow('请求主机校验失败')
  })

  it.each([
    '127.0.0.1:3000?ignored=true',
    '127.0.0.1:3000#ignored',
    '127.0.0.1:3000/',
    '127.0.0.1:3000/..',
    'attacker@127.0.0.1:3000',
    '127.0.0.1:3000\\ignored',
    'local\thost:3000',
    '2130706433:3000',
    '127.1:3000',
    '127.0.0.1:not-a-port',
    '127.0.0.1:65536'
  ])('rejects a Host header that is not a pure authority: %s', (host) => {
    expect(() =>
      assertLoopbackRequest(
        request('http://127.0.0.1:3000/api/articles', { host })
      )
    ).toThrow('请求主机校验失败')
  })
})

describe('assertSameOrigin', () => {
  it('accepts a matching loopback Origin', () => {
    expect(() =>
      assertSameOrigin(
        request('http://127.0.0.1:3000/api/article', {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000'
        })
      )
    ).not.toThrow()
  })

  it.each([
    [
      'http://localhost:3000/api/article',
      '127.0.0.1:3000',
      'http://127.0.0.1:3000'
    ],
    [
      'http://127.0.0.1:3000/api/article',
      'localhost:3000',
      'http://localhost:3000'
    ],
    [
      'http://[::1]:3000/api/article',
      'localhost:3000',
      'http://localhost:3000'
    ]
  ])(
    'accepts an equivalent loopback Origin: %s with %s and %s',
    (url, host, origin) => {
      expect(() =>
        assertSameOrigin(request(url, { host, origin }))
      ).not.toThrow()
    }
  )

  it('accepts an equivalent loopback Origin with an explicit default port', () => {
    expect(() =>
      assertSameOrigin(
        request('http://localhost/api/article', {
          host: '127.0.0.1:80',
          origin: 'http://127.0.0.1:80'
        })
      )
    ).not.toThrow()
  })

  it('rejects an equivalent loopback Origin on a different port', () => {
    expect(() =>
      assertSameOrigin(
        request('http://localhost:3000/api/article', {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3001'
        })
      )
    ).toThrow('请求来源校验失败')
  })

  it.each([
    [undefined, 'missing'],
    ['http://admin.example.com:3000', 'non-loopback'],
    ['not-an-origin', 'malformed'],
    ['http://127.0.0.1:3000/path', 'not a pure origin'],
    ['https://127.0.0.1:3000', 'a different protocol']
  ])('rejects %s Origin (%s)', (origin, _description) => {
    expect(() =>
      assertSameOrigin(
        request('http://localhost:3000/api/article', {
          host: '127.0.0.1:3000',
          ...(origin ? { origin } : {})
        })
      )
    ).toThrow('请求来源校验失败')
  })
})

describe('private network access', () => {
  beforeEach(() => {
    process.env.ADMIN_ACCESS_MODE = 'private'
    process.env.ADMIN_ALLOWED_ORIGIN = 'http://feiniunas:3000'
  })

  function privateRequest(
    headers: Record<string, string> = {}
  ): Request {
    return request('http://127.0.0.1:3000/api/articles', {
      host: 'feiniunas:3000',
      ...headers
    })
  }

  it('accepts a direct request to the configured private origin without identity headers', () => {
    expect(authorizeAdminRequest(privateRequest())).toEqual({
      login: '私有网络',
      local: false
    })
  })

  it('rejects requests sent to another Host', () => {
    expect(() => authorizeAdminRequest(privateRequest({ host: 'attacker.example.com' }))).toThrow('请求主机')
  })

  it('accepts writes only from the configured public origin', () => {
    expect(() =>
      assertSameOrigin(
        privateRequest({ origin: 'http://feiniunas:3000' })
      )
    ).not.toThrow()
  })

  it('rejects a write from another Tailnet origin', () => {
    expect(() =>
      assertSameOrigin(
        privateRequest({ origin: 'http://other-node:3000' })
      )
    ).toThrow('请求来源校验失败')
  })
})
