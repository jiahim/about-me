export type ContentMode = 'local'

export function getContentMode(): ContentMode {
  return 'local'
}

export function getAdminHost(): '127.0.0.1' {
  return '127.0.0.1'
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
