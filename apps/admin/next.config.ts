import type { NextConfig } from 'next'

const isDevelopment = process.env.NODE_ENV !== 'production'
const siteOrigin = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (isDevelopment ? 'http://127.0.0.1:5173' : 'https://www.jiahim.com')
).origin

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${siteOrigin}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  `frame-src ${siteOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }
        ]
      }
    ]
  }
}

export default nextConfig
