import { describe, expect, it } from 'vitest'

import { siteOriginFromUrl } from './origin'

describe('siteOriginFromUrl', () => {
  it('returns exact HTTPS origins without paths', () => {
    expect(siteOriginFromUrl('https://preview.example.com/zh/?x=1', 'production')).toBe('https://preview.example.com')
  })

  it('allows loopback and private-network HTTP only for development LAN preview', () => {
    expect(siteOriginFromUrl('http://127.0.0.1:5173/zh/', 'development')).toBe('http://127.0.0.1:5173')
    expect(siteOriginFromUrl('http://192.168.5.21:5173/zh/', 'development')).toBe('http://192.168.5.21:5173')
    expect(() => siteOriginFromUrl('http://192.168.5.21:5173', 'production')).toThrow(/HTTPS/)
  })

  it('rejects credentials, non-web protocols, and public HTTP origins', () => {
    expect(() => siteOriginFromUrl('https://user:pass@example.com', 'production')).toThrow(/凭据/)
    expect(() => siteOriginFromUrl('javascript:alert(1)', 'development')).toThrow(/HTTP/)
    expect(() => siteOriginFromUrl('http://example.com', 'development')).toThrow(/开发环境/)
  })
})
