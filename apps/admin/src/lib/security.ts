import {
  getAdminAccessMode,
  getAdminPublicOrigin,
  getAllowedTailscaleUsers
} from './env'
import type { AdminIdentity } from './types'

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])

export class RequestSecurityError extends Error {
  readonly status = 403
}

function normalizeHost(protocol: string, host: string): string | null {
  const match = host.match(/^([A-Za-z0-9.-]+|\[::1\])(?::(\d{1,5}))?$/i)

  if (!match) {
    return null
  }

  const hostname = match[1].toLowerCase()
  const hostKey = loopbackHosts.has(hostname) ? 'loopback' : null
  if (!hostKey) return null

  const port = match[2] ? Number(match[2]) : undefined

  if (port !== undefined && (port < 1 || port > 65_535)) {
    return null
  }

  const defaultPort = protocol === 'http:' ? 80 : protocol === 'https:' ? 443 : undefined

  if (port === undefined || port === defaultPort) {
    return hostKey
  }

  return `${hostKey}:${port}`
}

function normalizeAllowedOrigin(origin: string): string | null {
  const match = origin.match(/^(https?):\/\/(.+)$/i)

  if (!match) {
    return null
  }

  const protocol = `${match[1].toLowerCase()}:`
  const host = normalizeHost(protocol, match[2])

  return host ? `${protocol}//${host}` : null
}

function allowedRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url)

  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    throw new RequestSecurityError('管理端仅允许 HTTP 或 HTTPS 本机请求')
  }

  const requestHost = normalizeHost(requestUrl.protocol, requestUrl.host)
  if (!requestHost) {
    throw new RequestSecurityError('管理端仅允许本机访问')
  }

  const providedHost = request.headers.get('host')?.trim()
  const normalizedHost = providedHost
    ? normalizeHost(requestUrl.protocol, providedHost)
    : null
  if (!normalizedHost || normalizedHost !== requestHost) {
    throw new RequestSecurityError('请求主机校验失败，请使用本机管理端地址')
  }

  return `${requestUrl.protocol}//${normalizedHost}`
}

function tailscaleRequestIdentity(request: Request): AdminIdentity {
  const publicOriginValue = getAdminPublicOrigin()
  if (!publicOriginValue) {
    throw new RequestSecurityError('Tailscale 管理端地址未配置')
  }

  const publicOrigin = new URL(publicOriginValue)
  const providedHost = request.headers.get('host')?.trim().toLowerCase()
  if (!providedHost || providedHost !== publicOrigin.host.toLowerCase()) {
    throw new RequestSecurityError('请求主机校验失败，请使用配置的 Tailscale 管理端地址')
  }

  const forwardedProtocols = (request.headers.get('x-forwarded-proto') || '')
    .split(',')
    .map((protocol) => protocol.trim().toLowerCase())
    .filter(Boolean)
  if (forwardedProtocols.length !== 1 || forwardedProtocols[0] !== 'https') {
    throw new RequestSecurityError('Tailscale 管理端仅允许经过 HTTPS 代理访问')
  }

  const login = request.headers.get('tailscale-user-login')?.trim().toLowerCase()
  if (!login) {
    throw new RequestSecurityError('请求缺少可信的 Tailscale 身份')
  }

  if (!getAllowedTailscaleUsers().has(login)) {
    throw new RequestSecurityError('当前 Tailscale 用户未获授权')
  }

  return { login, local: false }
}

export function assertLoopbackRequest(request: Request): void {
  allowedRequestOrigin(request)
}

export function authenticateAdminRequest(request: Request): AdminIdentity {
  if (getAdminAccessMode() === 'tailscale') {
    return tailscaleRequestIdentity(request)
  }

  assertLoopbackRequest(request)
  return { login: '本地工作区', local: true }
}

export function assertSameOrigin(request: Request): void {
  const accessMode = getAdminAccessMode()
  authenticateAdminRequest(request)

  const expectedOrigin = accessMode === 'tailscale'
    ? getAdminPublicOrigin()
    : allowedRequestOrigin(request)
  const providedOrigin = request.headers.get('origin')
  let normalizedProvidedOrigin: string | null = null

  if (providedOrigin) {
    if (accessMode === 'tailscale') {
      try {
        const parsedOrigin = new URL(providedOrigin)
        normalizedProvidedOrigin =
          parsedOrigin.origin === providedOrigin &&
          parsedOrigin.pathname === '/' &&
          !parsedOrigin.search &&
          !parsedOrigin.hash
            ? parsedOrigin.origin
            : null
      } catch {
        normalizedProvidedOrigin = null
      }
    } else {
      normalizedProvidedOrigin = normalizeAllowedOrigin(providedOrigin)
    }
  }

  if (!normalizedProvidedOrigin || normalizedProvidedOrigin !== expectedOrigin) {
    throw new RequestSecurityError('请求来源校验失败，请刷新页面后重试')
  }
}
