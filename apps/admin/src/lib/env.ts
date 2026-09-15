export type ContentMode = 'local'
export type AdminAccessMode = 'local' | 'private'

export function getContentMode(): ContentMode {
  return 'local'
}

export function getAdminHost(): string {
  const configuredHost = process.env.ADMIN_HOST
  if (configuredHost === undefined) {
    return '127.0.0.1'
  }

  const host = configuredHost.trim()
  if (!host || !/^[A-Za-z0-9.:-]+$/.test(host)) {
    throw new Error('ADMIN_HOST 必须是纯主机名或 IP 地址')
  }

  return host
}

export function getAdminPort(): number {
  const value = process.env.PORT?.trim() || '3000'
  if (!/^\d+$/.test(value)) {
    throw new Error('PORT 必须是有效端口')
  }

  const port = Number(value)
  if (port < 1 || port > 65_535) {
    throw new Error('PORT 必须在 1 到 65535 之间')
  }

  return port
}

export function getAdminAccessMode(): AdminAccessMode {
  const mode = process.env.ADMIN_ACCESS_MODE?.trim() || 'local'

  if (mode !== 'local' && mode !== 'private') {
    throw new Error('ADMIN_ACCESS_MODE 只允许 local 或 private')
  }

  return mode
}

export function getAdminAllowedOrigin(): string | null {
  if (getAdminAccessMode() === 'local') {
    return null
  }

  const value = process.env.ADMIN_ALLOWED_ORIGIN?.trim()
  if (!value) {
    throw new Error('私有网络模式必须配置 ADMIN_ALLOWED_ORIGIN')
  }

  let origin: URL
  try {
    origin = new URL(value)
  } catch {
    throw new Error('ADMIN_ALLOWED_ORIGIN 必须是有效的 HTTP 或 HTTPS origin')
  }

  if (
    (origin.protocol !== 'http:' && origin.protocol !== 'https:') ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error('ADMIN_ALLOWED_ORIGIN 必须是无路径、查询、片段或凭据的 HTTP(S) origin')
  }

  return origin.origin
}

export function getAdminOrigin(requestOrigin: string): string {
  const origin = new URL(requestOrigin)
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])

  if (!loopbackHosts.has(origin.hostname)) {
    throw new Error('管理端仅允许本机访问')
  }

  return origin.origin
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:5173'
}
