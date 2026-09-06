export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>
  ) {
    super(typeof body.error === 'string' ? body.error : '请求失败，请稍后重试')
  }
}

export const SETTINGS_SESSION_STORAGE_KEY = 'jiahim:settings-session:v1'

export function readStoredSettingsSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SETTINGS_SESSION_STORAGE_KEY)
}

export function storeSettingsSessionId(id: string): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SETTINGS_SESSION_STORAGE_KEY, id)
  }
}

export function clearStoredSettingsSessionId(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(SETTINGS_SESSION_STORAGE_KEY)
  }
}

export async function requestSettingsJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch
): Promise<T> {
  const headers = new Headers(init.headers)
  const sessionId = readStoredSettingsSessionId()
  if (sessionId && !headers.has('x-settings-session')) {
    headers.set('x-settings-session', sessionId)
  }
  const response = await fetcher(input, { ...init, headers, cache: 'no-store' })
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    if (
      response.status === 409 &&
      typeof body.error === 'string' &&
      /会话|配置已被|站点配置/.test(body.error)
    ) {
      clearStoredSettingsSessionId()
    }
    throw new ApiError(response.status, body)
  }
  const session = body.session
  if (
    session &&
    typeof session === 'object' &&
    typeof (session as Record<string, unknown>).id === 'string'
  ) {
    storeSettingsSessionId((session as Record<string, unknown>).id as string)
  }
  return body as T
}
