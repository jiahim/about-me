import { HttpError } from '../route-utils'

export interface ValidateSettingsRequest {
  config: unknown
}

export interface SaveSettingsRequest extends ValidateSettingsRequest {
  baseHash: string
}

function strictRecord(
  input: unknown,
  expectedKeys: readonly string[]
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HttpError(400, '请求正文必须是 JSON 对象')
  }
  const record = input as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const expected = [...expectedKeys].sort()
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new HttpError(400, `请求字段必须且只能包含：${expected.join('、')}`)
  }
  return record
}

export function parseValidateSettingsRequest(input: unknown): ValidateSettingsRequest {
  const record = strictRecord(input, ['config'])
  return { config: record.config }
}

export function parseSaveSettingsRequest(input: unknown): SaveSettingsRequest {
  const record = strictRecord(input, ['config', 'baseHash'])
  if (typeof record.baseHash !== 'string' || !/^[0-9a-f]{64}$/.test(record.baseHash)) {
    throw new HttpError(400, 'baseHash 必须是小写 SHA-256 hex')
  }
  return { config: record.config, baseHash: record.baseHash }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, '请求正文不是合法 JSON')
  }
}

export function readSettingsSessionId(request: Request, required = true): string | null {
  const value = request.headers.get('x-settings-session')?.trim() ?? ''
  if (!value) {
    if (required) throw new HttpError(409, '设置发布会话缺失或已失效，请重新加载设置；浏览器草稿仍会保留')
    return null
  }
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new HttpError(409, '设置发布会话无效，请重新加载设置')
  return value
}
