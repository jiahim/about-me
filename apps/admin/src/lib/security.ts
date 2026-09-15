import {
  getAdminAccessMode,
  getAdminAllowedOrigin
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

function privateRequestIdentity(request: Request): AdminIdentity {
  const allowedOriginValue = getAdminAllowedOrigin()
  if (!allowedOriginValue) {
    throw new RequestSecurityError('私有网络管理端地址未配置')
  }

  const allowedOrigin = new URL(allowedOriginValue)
  const requestUrl = new URL(request.url)
  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    throw new RequestSecurityError('私有管理端仅允许 HTTP 或 HTTPS 请求')
  }

  const providedHost = request.headers.get('host')?.trim().toLowerCase()
  if (
    !providedHost ||
    providedHost !== allowedOrigin.host.toLowerCase()
  ) {
    throw new RequestSecurityError('请求主机校验失败，请使用配置的私有管理端地址')
  }

  return { login: '私有网络', local: false }
}

export function assertLoopbackRequest(request: Request): void {
  allowedRequestOrigin(request)
}

export function authorizeAdminRequest(request: Request): AdminIdentity {
  if (getAdminAccessMode() === 'private') {
    return privateRequestIdentity(request)
  }

  assertLoopbackRequest(request)
  return { login: '本地工作区', local: true }
}

export function assertSameOrigin(request: Request): void {
  const accessMode = getAdminAccessMode()
  authorizeAdminRequest(request)

  const expectedOrigin = accessMode === 'private'
    ? getAdminAllowedOrigin()
    : allowedRequestOrigin(request)
  const providedOrigin = request.headers.get('origin')
  let normalizedProvidedOrigin: string | null = null

  if (providedOrigin) {
    if (accessMode === 'private') {
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
