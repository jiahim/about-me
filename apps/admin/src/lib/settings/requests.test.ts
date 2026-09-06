import { describe, expect, it } from 'vitest'

import { HttpError } from '../route-utils'
import {
  parseSaveSettingsRequest,
  parseValidateSettingsRequest,
  readJsonBody
} from './requests'

describe('设置请求解析', () => {
  it('只接受 validate 的精确 config 字段', () => {
    expect(parseValidateSettingsRequest({ config: {} })).toEqual({ config: {} })
    for (const input of [null, [], {}, { config: {}, path: 'other' }]) {
      expect(() => parseValidateSettingsRequest(input)).toThrow(HttpError)
    }
  })

  it('只接受 save 的 config 和小写 SHA-256 baseHash', () => {
    const valid = { config: {}, baseHash: 'a'.repeat(64) }
    expect(parseSaveSettingsRequest(valid)).toEqual(valid)
    for (const input of [
      { config: {}, baseHash: 'A'.repeat(64) },
      { config: {}, baseHash: 'a'.repeat(63) },
      { ...valid, path: 'config/other.json' }
    ]) {
      expect(() => parseSaveSettingsRequest(input)).toThrow(HttpError)
    }
  })

  it('把非法 JSON 映射为 400', async () => {
    const request = new Request('http://127.0.0.1:3000/api/settings', {
      method: 'PUT',
      body: '{'
    })
    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 400 })
  })
})
