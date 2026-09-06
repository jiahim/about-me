import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  CURRENT_SCHEMA_VERSION,
  createDefaultSiteConfiguration,
  migrateSiteConfiguration,
  parseSiteConfigurationWithReport
} from './index.js'

function createV1Fixture(): Record<string, any> {
  const input = JSON.parse(
    readFileSync(new URL('./fixtures/v1-default.json', import.meta.url), 'utf8')
  ) as Record<string, any>
  input.author.sameAs = [
    { label: 'GitHub', href: 'https://github.com/example', newTab: true }
  ]
  input.seo.openGraph.image = { src: '/effective-share.png', alt: 'Effective share' }
  input.footer.social = [
    { label: 'Mastodon', href: 'https://social.example/@me', newTab: true }
  ]
  return input
}

describe('站点配置迁移', () => {
  it('保持当前版本不变且不复用可变输入', () => {
    const input = createDefaultSiteConfiguration()
    const migrated = migrateSiteConfiguration(input)

    expect(migrated).toMatchObject({
      config: input,
      sourceVersion: CURRENT_SCHEMA_VERSION,
      warnings: []
    })
    expect(migrated.config).not.toBe(input)
  })

  it('把 v1 的重复和无效字段确定性迁移到 v2', () => {
    const input = createV1Fixture()
    input.branding.shareImage = { src: '/legacy-share.png', alt: 'Legacy share' }
    input.homepage.modules.push({
      id: 'home-featured',
      type: 'featuredArticles',
      visible: false,
      order: 2,
      title: '推荐文章',
      articleIds: ['example']
    })

    const migrated = migrateSiteConfiguration(input)

    expect(migrated.config).toMatchObject({
      schemaVersion: 2,
      branding: {
        shareImage: { src: '/effective-share.png', alt: 'Effective share' },
        favicon: { src: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
        appleTouchIcon: { src: '/apple-touch-icon.png', sizes: '180x180' }
      },
      author: {
        avatar: { src: '/images/me.jpg' },
        sameAs: ['https://github.com/example']
      },
      footer: {
        social: [
          { provider: 'generic', label: 'Mastodon', href: 'https://social.example/@me' }
        ]
      }
    })
    expect(migrated.config.seo.openGraph).not.toHaveProperty('type')
    expect(migrated.config.seo.openGraph).not.toHaveProperty('image')
    expect(migrated.config.geo.crawlers.Googlebot).toEqual({ allow: true })
    expect(migrated.config.homepage.modules).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'featuredArticles' })])
    )
    expect(migrated.warnings.map((warning) => warning.code)).toEqual([
      'share-image-conflict',
      'featured-articles-removed',
      'unknown-social-provider'
    ])
  })

  it('带报告解析 v1 并返回深冻结的 v2 配置', () => {
    const input = createV1Fixture()
    input.branding.shareImage = { src: '/effective-share.png', alt: 'Effective share' }
    input.footer.social = [
      { label: 'GitHub', href: 'https://github.com/example', newTab: true }
    ]
    const result = parseSiteConfigurationWithReport(input)

    expect(result.sourceVersion).toBe(1)
    expect(result.config.schemaVersion).toBe(2)
    expect(Object.isFrozen(result.config)).toBe(true)
    expect(result.warnings).toEqual([])
  })

  it('拒绝未来版本、缺失版本和非整数版本', () => {
    expect(() => migrateSiteConfiguration({ schemaVersion: 3 })).toThrow(
      /不支持/
    )
    expect(() => migrateSiteConfiguration({})).toThrow(/schemaVersion/)
    expect(() => migrateSiteConfiguration({ schemaVersion: 1.5 })).toThrow(
      /schemaVersion/
    )
    expect(() => migrateSiteConfiguration({ schemaVersion: 0 })).toThrow(/不支持/)
    expect(() => migrateSiteConfiguration({ schemaVersion: -1 })).toThrow(/不支持/)
    expect(() => migrateSiteConfiguration({ schemaVersion: '1' })).toThrow(
      /schemaVersion/
    )
    expect(() => migrateSiteConfiguration(null)).toThrow(/schemaVersion/)
    expect(() => migrateSiteConfiguration([])).toThrow(/schemaVersion/)
  })
})
