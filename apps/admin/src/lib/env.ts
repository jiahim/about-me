export type ContentMode = 'local'
export type AdminAccessMode = 'local' | 'tailscale'

export function getContentMode(): ContentMode {
  return 'local'
}

export function getAdminHost(): '127.0.0.1' {
  return '127.0.0.1'
}

export function getAdminAccessMode(): AdminAccessMode {
  const mode = process.env.ADMIN_ACCESS_MODE?.trim() || 'local'

  if (mode !== 'local' && mode !== 'tailscale') {
    throw new Error('ADMIN_ACCESS_MODE 只允许 local 或 tailscale')
  }

  return mode
}

export function getAdminPublicOrigin(): string | null {
  if (getAdminAccessMode() === 'local') {
    return null
  }

  const value = process.env.ADMIN_PUBLIC_ORIGIN?.trim()
  if (!value) {
    throw new Error('Tailscale 模式必须配置 ADMIN_PUBLIC_ORIGIN')
  }

  let origin: URL
  try {
    origin = new URL(value)
  } catch {
    throw new Error('ADMIN_PUBLIC_ORIGIN 必须是有效的 HTTPS origin')
  }

  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error('ADMIN_PUBLIC_ORIGIN 必须是无路径、查询、片段或凭据的 HTTPS origin')
  }

  return origin.origin
}

export function getAllowedTailscaleUsers(): ReadonlySet<string> {
  if (getAdminAccessMode() === 'local') {
    return new Set()
  }

  const users = new Set(
    (process.env.ADMIN_TAILSCALE_ALLOWED_USERS || '')
      .split(',')
      .map((user) => user.trim().toLowerCase())
      .filter(Boolean)
  )

  if (users.size === 0) {
    throw new Error('Tailscale 模式必须配置非空用户白名单 ADMIN_TAILSCALE_ALLOWED_USERS')
  }

  return users
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
