type RuntimeEnvironment = 'development' | 'production'

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  )
}

function isDevelopmentHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase()
  return (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '::1' ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname.startsWith('127.') ||
    isPrivateIpv4(normalizedHostname)
  )
}

export function siteOriginFromUrl(
  value: string,
  environment: RuntimeEnvironment = process.env.NODE_ENV === 'production' ? 'production' : 'development'
): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('站点预览地址必须是有效的 HTTP 或 HTTPS URL。')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('站点预览地址必须使用 HTTP 或 HTTPS 协议。')
  }

  if (url.username || url.password) {
    throw new Error('站点预览地址不能包含用户名或密码凭据。')
  }

  if (url.protocol === 'http:') {
    if (environment !== 'development' || !isDevelopmentHost(url.hostname)) {
      const requirement = environment === 'production' ? '生产环境必须使用 HTTPS。' : '开发环境仅允许本机或局域网 HTTP 地址。'
      throw new Error(requirement)
    }
  }

  return url.origin
}
