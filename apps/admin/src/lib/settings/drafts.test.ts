import { describe, expect, it } from 'vitest'

import { createDefaultSiteConfiguration } from '@jiahim/site-schema'

import {
  legacySettingsDraftKey,
  readSettingsDraft,
  settingsDraftKey,
  writeSettingsDraft
} from './drafts'

function storage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  }
}

describe('设置草稿', () => {
  it('只自动恢复 baseHash 匹配的 v2 版本化草稿', () => {
    const target = storage()
    const config = createDefaultSiteConfiguration()
    config.site.name = '草稿名称'
    writeSettingsDraft(target, { config, baseHash: 'a'.repeat(64), savedAt: 1 })

    expect(readSettingsDraft(target, 'a'.repeat(64))).toMatchObject({
      status: 'restored',
      draft: { config: { site: { name: '草稿名称' } } }
    })
    expect(target.getItem(settingsDraftKey)).toContain('"version":2')
  })

  it('旧基准草稿返回冲突而不是自动覆盖服务端配置', () => {
    const target = storage()
    writeSettingsDraft(target, {
      config: createDefaultSiteConfiguration(),
      baseHash: 'a'.repeat(64),
      savedAt: 1
    })

    expect(readSettingsDraft(target, 'b'.repeat(64))).toMatchObject({
      status: 'conflict'
    })
  })

  it('成功转换 v1 草稿后写入 v2 key 并删除旧 key', () => {
    const target = storage()
    const legacy = structuredClone(createDefaultSiteConfiguration()) as Record<string, any>
    legacy.schemaVersion = 1
    legacy.branding.favicon.alt = 'legacy'
    legacy.author.avatar.alt = 'legacy'
    legacy.author.sameAs = [{ label: 'GitHub', href: 'https://github.com/example', newTab: true }]
    legacy.seo.openGraph.type = 'website'
    legacy.seo.openGraph.image = { src: '/legacy.png', alt: 'Legacy' }
    for (const crawler of Object.values(legacy.geo.crawlers) as Record<string, any>[]) crawler.purpose = 'legacy'
    legacy.footer.social = [{ label: 'GitHub', href: 'https://github.com/example', newTab: true }]
    target.setItem(legacySettingsDraftKey, JSON.stringify({
      version: 1,
      config: legacy,
      baseHash: 'a'.repeat(64),
      savedAt: 1
    }))

    expect(readSettingsDraft(target, 'a'.repeat(64))).toMatchObject({
      status: 'restored',
      draft: {
        config: {
          schemaVersion: 2,
          author: { sameAs: ['https://github.com/example'] }
        }
      }
    })
    expect(target.getItem(settingsDraftKey)).toContain('"version":2')
    expect(target.getItem(legacySettingsDraftKey)).toBeNull()
  })

  it('保留无法转换的 v1 草稿供人工恢复', () => {
    const target = storage()
    target.setItem(legacySettingsDraftKey, JSON.stringify({
      version: 1,
      config: { schemaVersion: 1 },
      baseHash: 'a'.repeat(64),
      savedAt: 1
    }))

    expect(readSettingsDraft(target, 'a'.repeat(64))).toEqual({ status: 'none' })
    expect(target.getItem(legacySettingsDraftKey)).not.toBeNull()
    expect(target.getItem(settingsDraftKey)).toBeNull()
  })
})
