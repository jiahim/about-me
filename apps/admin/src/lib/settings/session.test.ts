import { describe, expect, it } from 'vitest'

import { SettingsSessionStore } from './session'

describe('SettingsSessionStore', () => {
  it('registers only files clean at creation and invalidates after completion', async () => {
    const snapshot = async () => ({ repositoryRoot: '/repo', branch: 'main', head: 'a'.repeat(40), dirtyPaths: new Set(['existing.md']) })
    const store = new SettingsSessionStore(snapshot)
    const session = await store.create('base-a')
    await store.register(session.id, { baseHashBefore: 'base-a', baseHashAfter: 'base-b', changedPaths: ['config/site.config.json', 'existing.md'] })
    const verified = await store.verifyForPublish(session.id, new Set(), 'base-b')
    expect(verified.paths).toEqual(['config/site.config.json'])
    expect((await store.get(session.id)).rejectedPaths).toHaveLength(1)
    await store.complete(session.id)
    await expect(store.get(session.id)).rejects.toThrow(/失效/)
  })

  it('expires idle sessions and excludes orphaned site assets', async () => {
    let time = 0
    const store = new SettingsSessionStore(async () => ({ repositoryRoot: '/repo', branch: 'main', head: 'a'.repeat(40), dirtyPaths: new Set() }), () => time)
    const first = await store.create('a')
    await store.register(first.id, { baseHashBefore: 'a', baseHashAfter: 'a', changedPaths: ['docs/public/images/site/logo.png'] })
    await expect(store.verifyForPublish(first.id, new Set(), 'a')).rejects.toThrow(/没有可发布/)
    const second = await store.create('a')
    time = 30 * 60 * 1000 + 1
    await expect(store.get(second.id)).rejects.toThrow(/过期/)
  })

  it('binds registration and verification to the current base hash', async () => {
    const store = new SettingsSessionStore(async () => ({ repositoryRoot: '/repo', branch: 'main', head: 'a'.repeat(40), dirtyPaths: new Set() }))
    const session = await store.create('base-a')
    await expect(store.register(session.id, {
      baseHashBefore: 'other-base',
      baseHashAfter: 'base-b',
      changedPaths: ['config/site.config.json']
    })).rejects.toThrow(/配置版本不一致/)
    await store.register(session.id, {
      baseHashBefore: 'base-a',
      baseHashAfter: 'base-b',
      changedPaths: ['config/site.config.json', 'config/site.config.json']
    })
    await expect(store.verifyForDiff(session.id, new Set(), 'outside-change')).rejects.toThrow(/会话之外/)
    await expect(store.verifyForPublish(session.id, new Set(), 'base-b')).resolves.toMatchObject({
      paths: ['config/site.config.json']
    })
  })

  it.each([
    ['repositoryRoot', '/other-repo', /仓库、分支或 HEAD/],
    ['branch', 'feature/other', /仓库、分支或 HEAD/],
    ['head', 'b'.repeat(40), /仓库、分支或 HEAD/]
  ] as const)('invalidates when %s changes', async (field, value, message) => {
    const snapshot = { repositoryRoot: '/repo', branch: 'main', head: 'a'.repeat(40), dirtyPaths: new Set<string>() }
    const store = new SettingsSessionStore(async () => snapshot)
    const session = await store.create('base-a')
    Object.assign(snapshot, { [field]: value })
    await expect(store.get(session.id)).rejects.toThrow(message)
  })

  it('includes a referenced uploaded asset and excludes it once orphaned', async () => {
    const store = new SettingsSessionStore(async () => ({ repositoryRoot: '/repo', branch: 'main', head: 'a'.repeat(40), dirtyPaths: new Set() }))
    const session = await store.create('base-a')
    const asset = 'docs/public/images/site/logo.png'
    await store.registerPaths(session.id, [asset, asset])
    await expect(store.verifyForDiff(session.id, new Set([asset]), 'base-a')).resolves.toMatchObject({ paths: [asset] })
    await expect(store.verifyForPublish(session.id, new Set(), 'base-a')).rejects.toThrow(/没有可发布/)
    await expect(store.get(session.id)).resolves.toMatchObject({
      publishablePaths: [],
      rejectedPaths: [{ path: asset, reason: expect.stringContaining('未被当前已保存配置引用') }]
    })
  })
})
