import { CURRENT_SCHEMA_VERSION } from './defaults.js'
import {
  siteConfigurationSchema,
  type SiteConfiguration,
  type SocialLink
} from './schema.js'

export interface MigrationWarning {
  code:
    | 'share-image-conflict'
    | 'featured-articles-removed'
    | 'unknown-social-provider'
  path: string
  message: string
}

export interface SiteConfigurationMigrationResult {
  config: SiteConfiguration
  sourceVersion: 1 | 2
  warnings: MigrationWarning[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recordAt(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = parent[key]
  if (!isRecord(value)) throw new Error(`站点配置字段 ${key} 无效`)
  return value
}

function arrayAt(parent: Record<string, unknown>, key: string): unknown[] {
  const value = parent[key]
  if (!Array.isArray(value)) throw new Error(`站点配置字段 ${key} 无效`)
  return value
}

function sameImage(left: unknown, right: unknown): boolean {
  if (!isRecord(left) || !isRecord(right)) return false
  return left.src === right.src && left.alt === right.alt
}

function socialProvider(label: string): SocialLink['provider'] {
  const normalized = label.normalize('NFKC').trim().toLocaleLowerCase()
  if (normalized === 'github') return 'github'
  if (normalized === 'x' || normalized === 'twitter') return 'x'
  if (normalized === 'linkedin') return 'linkedin'
  if (normalized === 'youtube') return 'youtube'
  if (normalized === 'rss') return 'rss'
  return 'generic'
}

function migrateVersionOne(input: Record<string, unknown>): SiteConfigurationMigrationResult {
  const output = structuredClone(input)
  const warnings: MigrationWarning[] = []
  output.schemaVersion = CURRENT_SCHEMA_VERSION

  const branding = recordAt(output, 'branding')
  const favicon = recordAt(branding, 'favicon')
  delete favicon.alt
  if (isRecord(branding.appleTouchIcon)) delete branding.appleTouchIcon.alt

  const author = recordAt(output, 'author')
  const avatar = recordAt(author, 'avatar')
  author.avatar = { src: avatar.src }
  author.sameAs = arrayAt(author, 'sameAs').map((item) =>
    isRecord(item) ? item.href : undefined
  )

  const seo = recordAt(output, 'seo')
  const openGraph = recordAt(seo, 'openGraph')
  const effectiveShareImage = openGraph.image
  if (!sameImage(branding.shareImage, effectiveShareImage)) {
    warnings.push({
      code: 'share-image-conflict',
      path: '$.branding.shareImage',
      message: '旧配置包含两个不同分享图，已保留此前公开站点实际使用的 SEO 分享图。'
    })
  }
  branding.shareImage = structuredClone(effectiveShareImage)
  delete openGraph.type
  delete openGraph.image

  const homepage = recordAt(output, 'homepage')
  const modules = arrayAt(homepage, 'modules')
  if (modules.some((module) => isRecord(module) && module.type === 'featuredArticles')) {
    warnings.push({
      code: 'featured-articles-removed',
      path: '$.homepage.modules',
      message: '已移除公开主题无法渲染的推荐文章模块。'
    })
  }
  homepage.modules = modules.filter(
    (module) => !isRecord(module) || module.type !== 'featuredArticles'
  )

  const geo = recordAt(output, 'geo')
  const crawlers = recordAt(geo, 'crawlers')
  for (const policy of Object.values(crawlers)) {
    if (isRecord(policy)) delete policy.purpose
  }

  const footer = recordAt(output, 'footer')
  footer.social = arrayAt(footer, 'social').map((item, index) => {
    if (!isRecord(item) || typeof item.label !== 'string') return item
    const provider = socialProvider(item.label)
    if (provider === 'generic') {
      warnings.push({
        code: 'unknown-social-provider',
        path: `$.footer.social[${index}]`,
        message: `无法识别社交平台“${item.label}”，已保留为通用链接。`
      })
    }
    return { provider, label: item.label, href: item.href }
  })

  return {
    config: siteConfigurationSchema.parse(output),
    sourceVersion: 1,
    warnings
  }
}

export function migrateSiteConfiguration(
  input: unknown
): SiteConfigurationMigrationResult {
  if (!isRecord(input) || !Number.isInteger(input.schemaVersion)) {
    throw new Error('站点配置缺少有效的 schemaVersion')
  }

  if (input.schemaVersion === 1) return migrateVersionOne(input)
  if (input.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`不支持站点配置版本 ${String(input.schemaVersion)}`)
  }

  return {
    config: siteConfigurationSchema.parse(structuredClone(input)),
    sourceVersion: CURRENT_SCHEMA_VERSION,
    warnings: []
  }
}
