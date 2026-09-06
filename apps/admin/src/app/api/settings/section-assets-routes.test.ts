import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/route-utils'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  archive: vi.fn(),
  previewArchive: vi.fn(),
  saveAsset: vi.fn(),
  sessionMutate: vi.fn(),
  sessionRegister: vi.fn(),
  sessionRegisterPaths: vi.fn()
}))

vi.mock('@/lib/settings/service', () => ({
  getSectionTransaction: () => ({ create: mocks.create, archive: mocks.archive, previewArchive: mocks.previewArchive }),
  getSettingsSessionStore: () => ({ mutate: mocks.sessionMutate, register: mocks.sessionRegister, registerPaths: mocks.sessionRegisterPaths })
}))
vi.mock('@/lib/settings/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/settings/assets')>()
  return { ...actual, saveBrandAsset: mocks.saveAsset }
})
vi.mock('@/lib/repository-root', () => ({ findRepositoryRoot: () => '/repo' }))

import { POST as createSection } from './sections/route'
import { POST as archiveSection } from './sections/[id]/archive/route'
import { GET as previewArchive } from './sections/[id]/route'
import { POST as uploadAsset } from './assets/route'

function request(pathname: string, init: RequestInit): NextRequest {
  const original = new Request(`http://127.0.0.1:3000${pathname}`, init)
  const headers = new Headers(original.headers)
  headers.set('host', '127.0.0.1:3000')
  headers.set('origin', 'http://127.0.0.1:3000')
  headers.set('x-settings-session', '11111111-1111-4111-8111-111111111111')
  return new Request(original, { headers }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  const session = { id: '11111111-1111-4111-8111-111111111111', expiresAt: Date.now() + 1000, publishablePaths: [], rejectedPaths: [] }
  mocks.sessionRegister.mockResolvedValue(session)
  mocks.sessionRegisterPaths.mockResolvedValue(session)
  mocks.sessionMutate.mockImplementation(async (_id, baseHash, operation) => {
    const value = await operation(baseHash ?? 'a'.repeat(64))
    return { result: value.result, session }
  })
})

describe('section and asset routes', () => {
  it('creates and archives sections through strict local POST routes', async () => {
    mocks.create.mockResolvedValue({ section: { id: 'new' }, baseHash: 'b'.repeat(64), changedPaths: ['config/site.config.json'] })
    mocks.archive.mockResolvedValue({ articleCount: 3, baseHash: 'c'.repeat(64), changedPaths: ['config/site.config.json'] })
    const createResponse = await createSection(request('/api/settings/sections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseHash: 'a'.repeat(64), name: 'New', slug: 'new', header: true, sidebar: true, collapsed: false })
    }))
    const archiveResponse = await archiveSection(request('/api/settings/sections/skill/archive', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseHash: 'a'.repeat(64) })
    }), { params: Promise.resolve({ id: 'skill' }) })

    expect(createResponse.status).toBe(201)
    expect(archiveResponse.status).toBe(200)
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(mocks.archive).toHaveBeenCalledWith('skill', 'a'.repeat(64))
  })

  it('previews the archive article count without mutating settings', async () => {
    mocks.previewArchive.mockResolvedValue({ articleCount: 7 })
    const response = await previewArchive(request('/api/settings/sections/skill', { method: 'GET' }), { params: Promise.resolve({ id: 'skill' }) })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ articleCount: 7 })
    expect(mocks.previewArchive).toHaveBeenCalledWith('skill')
    expect(mocks.archive).not.toHaveBeenCalled()
  })

  it('uploads a brand asset without returning an absolute path', async () => {
    mocks.saveAsset.mockResolvedValue({ path: 'docs/public/images/site/logo.png', publicUrl: '/images/site/logo.png', changedPaths: ['docs/public/images/site/logo.png'] })
    const assetRequest = request('/api/settings/assets', { method: 'POST' })
    vi.spyOn(assetRequest, 'formData').mockResolvedValue({
      get(name: string) {
        if (name === 'kind') return 'logo'
        if (name === 'file') return {
          name: 'logo.png',
          type: 'image/png',
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer
        }
        return null
      }
    } as FormData)
    const response = await uploadAsset(assetRequest)
    const body = await response.json()

    expect(response.status, JSON.stringify(body)).toBe(201)
    expect(body.publicUrl).toBe('/images/site/logo.png')
    expect(JSON.stringify(body)).not.toContain('/repo')
  })

  it('does not mutate sections or assets when the settings session is invalid', async () => {
    mocks.sessionMutate.mockRejectedValue(new HttpError(409, '设置发布会话已失效'))
    mocks.create.mockResolvedValue({ section: { id: 'new' }, baseHash: 'b'.repeat(64), changedPaths: ['config/site.config.json'] })
    mocks.archive.mockResolvedValue({ articleCount: 3, baseHash: 'c'.repeat(64), changedPaths: ['config/site.config.json'] })
    mocks.saveAsset.mockResolvedValue({ path: 'docs/public/images/site/logo.png', publicUrl: '/images/site/logo.png', changedPaths: ['docs/public/images/site/logo.png'] })

    const createResponse = await createSection(request('/api/settings/sections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseHash: 'a'.repeat(64), name: 'New', slug: 'new', header: true, sidebar: true, collapsed: false })
    }))
    const archiveResponse = await archiveSection(request('/api/settings/sections/skill/archive', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseHash: 'a'.repeat(64) })
    }), { params: Promise.resolve({ id: 'skill' }) })
    const assetRequest = request('/api/settings/assets', { method: 'POST' })
    vi.spyOn(assetRequest, 'formData').mockResolvedValue({
      get(name: string) {
        if (name === 'kind') return 'logo'
        if (name === 'file') return { name: 'logo.png', type: 'image/png', arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
        return null
      }
    } as FormData)
    const assetResponse = await uploadAsset(assetRequest)

    expect([createResponse.status, archiveResponse.status, assetResponse.status]).toEqual([409, 409, 409])
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.archive).not.toHaveBeenCalled()
    expect(mocks.saveAsset).not.toHaveBeenCalled()
  })
})
