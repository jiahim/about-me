import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsConflictError } from '@/lib/settings/repository'
import { HttpError } from '@/lib/route-utils'
import { createDefaultSiteConfiguration } from '@jiahim/site-schema'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  save: vi.fn(),
  validate: vi.fn(),
  diff: vi.fn(),
  sessionCreate: vi.fn(),
  sessionGet: vi.fn(),
  sessionMutate: vi.fn(),
  sessionRegister: vi.fn(),
  sessionVerifyForDiff: vi.fn()
}))

vi.mock('@/lib/settings/service', () => ({
  getSettingsRepository: () => ({
    read: mocks.read,
    save: mocks.save,
    validate: mocks.validate
  }),
  getSettingsSessionStore: () => ({ create: mocks.sessionCreate, get: mocks.sessionGet, mutate: mocks.sessionMutate, register: mocks.sessionRegister, verifyForDiff: mocks.sessionVerifyForDiff })
}))

vi.mock('@/lib/git/repository', () => ({
  getSettingsDiff: mocks.diff
}))

import { GET as getSettings, PUT as putSettings } from './route'
import { GET as getSettingsDiff } from './diff/route'
import { GET as getSettingsEnvironment } from './environment/route'
import { POST as validateSettings } from './validate/route'

function request(
  pathname: string,
  init: RequestInit = {}
): NextRequest {
  const headers = new Headers(init.headers)
  headers.set('host', '127.0.0.1:3000')
  if (!headers.has('x-settings-session')) headers.set('x-settings-session', '11111111-1111-4111-8111-111111111111')
  return new Request(`http://127.0.0.1:3000${pathname}`, {
    ...init,
    headers
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  const session = { id: '11111111-1111-4111-8111-111111111111', expiresAt: Date.now() + 1000, publishablePaths: [], rejectedPaths: [] }
  mocks.sessionCreate.mockResolvedValue(session)
  mocks.sessionGet.mockResolvedValue(session)
  mocks.sessionMutate.mockImplementation(async (_id, baseHash, operation) => {
    const value = await operation(baseHash ?? 'a'.repeat(64))
    return { result: value.result, session }
  })
  mocks.sessionRegister.mockResolvedValue(session)
  mocks.sessionVerifyForDiff.mockResolvedValue({ paths: ['config/site.config.json'] })
})

afterEach(() => vi.unstubAllEnvs())

describe('设置 API 路由', () => {
  it('GET 返回 no-store 快照', async () => {
    mocks.read.mockResolvedValue({ config: {}, baseHash: 'a'.repeat(64) })
    const response = await getSettings(request('/api/settings'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.read).toHaveBeenCalledOnce()
  })

  it('PUT 在读取正文和保存前拒绝缺失 Origin', async () => {
    const response = await putSettings(
      request('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ config: {}, baseHash: 'a'.repeat(64) })
      })
    )

    expect(response.status).toBe(403)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('PUT 把旧哈希映射为 409', async () => {
    mocks.save.mockRejectedValue(new SettingsConflictError('冲突'))
    const response = await putSettings(
      request('/api/settings', {
        method: 'PUT',
        headers: { origin: 'http://127.0.0.1:3000' },
        body: JSON.stringify({ config: {}, baseHash: 'a'.repeat(64) })
      })
    )

    expect(response.status).toBe(409)
  })

  it('PUT 在失效设置会话下不写入配置', async () => {
  mocks.save.mockResolvedValue({ baseHash: 'b'.repeat(64), changedPaths: ['config/site.config.json'] })
  mocks.sessionMutate.mockRejectedValue(new HttpError(409, '设置发布会话已失效'))
    const response = await putSettings(
      request('/api/settings', {
        method: 'PUT',
        headers: { origin: 'http://127.0.0.1:3000' },
        body: JSON.stringify({ config: {}, baseHash: 'a'.repeat(64) })
      })
    )

    expect(response.status).toBe(409)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('validate 返回结构化问题且不保存', async () => {
    mocks.validate.mockReturnValue({
      validation: {
        valid: false,
        issues: [{ path: '$.site.name', code: 'too_small', message: '不能为空' }]
      }
    })
    const response = await validateSettings(
      request('/api/settings/validate', {
        method: 'POST',
        headers: { origin: 'http://127.0.0.1:3000' },
        body: JSON.stringify({ config: { site: { name: '' } } })
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ validation: { valid: false } })
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('Diff 不接受客户端路径参数', async () => {
    const response = await getSettingsDiff(
      request('/api/settings/diff?path=../../package.json')
    )
    expect(response.status).toBe(400)
    expect(mocks.diff).not.toHaveBeenCalled()
  })

  it('Diff 只把服务端会话核验出的路径传给 Git 层', async () => {
    mocks.read.mockResolvedValue({ config: createDefaultSiteConfiguration(), baseHash: 'a'.repeat(64) })
    mocks.diff.mockResolvedValue({ text: 'settings diff', files: [] })
    const response = await getSettingsDiff(request('/api/settings/diff'))
    expect(response.status).toBe(200)
    expect(mocks.sessionVerifyForDiff).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.any(Set),
      'a'.repeat(64)
    )
    expect(mocks.diff).toHaveBeenCalledWith(['config/site.config.json'])
    expect(mocks.sessionGet).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111')
  })

  it('环境状态只返回变量名称和存在性，不返回值', async () => {
    vi.stubEnv('TEST_PUBLIC_INTEGRATION_ID', 'must-not-leak')
    mocks.read.mockResolvedValue({
      config: {
        integrations: {
          analytics: { enabled: true, requiredEnvironmentVariables: ['TEST_PUBLIC_INTEGRATION_ID'] },
          comments: { enabled: true, requiredEnvironmentVariables: [] }
        }
      }
    })

    const response = await getSettingsEnvironment(request('/api/settings/environment'))
    const body = await response.json()

    expect(body).toEqual({
      requirements: [{
        name: 'TEST_PUBLIC_INTEGRATION_ID',
        exists: true,
        requiredBy: ['analytics']
      }]
    })
    expect(JSON.stringify(body)).not.toContain('must-not-leak')
  })
})
