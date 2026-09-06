import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  read: vi.fn(),
  verify: vi.fn(),
  complete: vi.fn()
}))

vi.mock('@/lib/git/workflow', () => ({ publishChanges: mocks.publish }))
vi.mock('@/lib/settings/service', () => ({
  getSettingsRepository: () => ({ read: mocks.read }),
  getSettingsSessionStore: () => ({ verifyForPublish: mocks.verify, complete: mocks.complete })
}))

import { POST } from './route'

function request(body: unknown): NextRequest {
  return new Request('http://127.0.0.1:3000/api/git/publish', {
    method: 'POST',
    headers: {
      host: '127.0.0.1:3000',
      origin: 'http://127.0.0.1:3000',
      'content-type': 'application/json',
      'x-settings-session': '11111111-1111-4111-8111-111111111111'
    },
    body: JSON.stringify(body)
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.read.mockResolvedValue({ config: createDefaultSiteConfiguration(), baseHash: 'a'.repeat(64) })
  mocks.verify.mockResolvedValue({ sessionId: 'server-session', paths: ['config/site.config.json'] })
  mocks.publish.mockResolvedValue({ url: 'https://example.test/pr/1', number: 1, state: 'OPEN' })
})

describe('设置发布路由', () => {
  it('只从服务端会话解析发布范围并在成功后失效会话', async () => {
    const response = await POST(request({ scope: 'settings', message: '[Human] config: update', date: '2026-09-05' }))
    expect(response.status).toBe(200)
    expect(mocks.verify).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', expect.any(Set), 'a'.repeat(64))
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'settings',
      verified: expect.objectContaining({ sessionId: 'server-session', paths: ['config/site.config.json'] })
    }))
    expect(mocks.complete).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111')
  })

  it('拒绝浏览器注入额外设置路径', async () => {
    const response = await POST(request({
      scope: 'settings',
      message: '[Human] config: update',
      date: '2026-09-05',
      paths: ['package.json']
    }))
    expect(response.status).toBe(400)
    expect(mocks.verify).not.toHaveBeenCalled()
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('发布失败时保留会话供用户处理后重试', async () => {
    mocks.publish.mockRejectedValue(new Error('当前分支不是默认分支'))
    const response = await POST(request({ scope: 'settings', message: '[Human] config: update', date: '2026-09-05' }))
    expect(response.status).toBe(500)
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it('服务端在任何 Git 写操作前阻止缺失的公开集成环境变量', async () => {
    const config = createDefaultSiteConfiguration()
    config.integrations.analytics.enabled = true
    config.integrations.analytics.requiredEnvironmentVariables = ['MISSING_UAT_ANALYTICS_ID']
    mocks.read.mockResolvedValue({ config, baseHash: 'a'.repeat(64) })
    const response = await POST(request({ scope: 'settings', message: '[Human] config: update', date: '2026-09-05' }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('MISSING_UAT_ANALYTICS_ID') })
    expect(mocks.verify).not.toHaveBeenCalled()
    expect(mocks.publish).not.toHaveBeenCalled()
  })
})
