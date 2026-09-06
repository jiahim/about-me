export type FieldConsumptionKind = 'runtime' | 'artifact' | 'gate'
export type FieldPreviewKind = 'live' | 'artifact' | 'reload'

export interface SiteConfigurationFieldConsumer {
  path: string
  kind: FieldConsumptionKind
  owner: string
  preview: FieldPreviewKind
}

const runtimeFields = [
  'appearance.accentColor',
  'appearance.codeTheme.dark',
  'appearance.codeTheme.light',
  'appearance.contentLayout',
  'appearance.defaultTheme',
  'appearance.outline.label',
  'appearance.outline.maxLevel',
  'appearance.outline.minLevel',
  'branding.appleTouchIcon.sizes',
  'branding.appleTouchIcon.src',
  'branding.favicon.sizes',
  'branding.favicon.src',
  'branding.favicon.type',
  'branding.logo.alt',
  'branding.logo.src',
  'footer.copyright.holder',
  'footer.copyright.startYear',
  'footer.links.*.href',
  'footer.links.*.label',
  'footer.links.*.newTab',
  'footer.notice',
  'footer.social.*.href',
  'footer.social.*.label',
  'footer.social.*.provider',
  'homepage.modules.*.actions.*.href',
  'homepage.modules.*.actions.*.label',
  'homepage.modules.*.actions.*.newTab',
  'homepage.modules.*.id',
  'homepage.modules.*.image.alt',
  'homepage.modules.*.image.src',
  'homepage.modules.*.items.*.details',
  'homepage.modules.*.items.*.href',
  'homepage.modules.*.items.*.icon',
  'homepage.modules.*.items.*.id',
  'homepage.modules.*.items.*.sectionId',
  'homepage.modules.*.items.*.title',
  'homepage.modules.*.name',
  'homepage.modules.*.order',
  'homepage.modules.*.tagline',
  'homepage.modules.*.text',
  'homepage.modules.*.type',
  'homepage.modules.*.visible',
  'integrations.analytics.enabled',
  'integrations.analytics.provider',
  'integrations.analytics.scriptSrc',
  'integrations.analytics.websiteId',
  'integrations.comments.category',
  'integrations.comments.categoryId',
  'integrations.comments.enabled',
  'integrations.comments.mapping',
  'integrations.comments.provider',
  'integrations.comments.repository',
  'integrations.comments.repositoryId',
  'locales.*.contentRoot',
  'locales.*.enabled',
  'locales.*.label',
  'locales.*.routePrefix',
  'locales.*.vitepressKey',
  'navigation.*.href',
  'navigation.*.id',
  'navigation.*.label',
  'navigation.*.locale',
  'navigation.*.newTab',
  'navigation.*.order',
  'navigation.*.sectionId',
  'navigation.*.type',
  'navigation.*.visible',
  'sections.*.description',
  'sections.*.directory',
  'sections.*.id',
  'sections.*.locale',
  'sections.*.name',
  'sections.*.navigation.collapsed',
  'sections.*.navigation.header',
  'sections.*.navigation.sidebar',
  'sections.*.order',
  'sections.*.parentId',
  'sections.*.route',
  'sections.*.status',
  'seo.titleTemplate',
  'site.description',
  'site.name'
] as const

const artifactFields = [
  'author.avatar.src',
  'author.bio',
  'author.id',
  'author.name',
  'author.sameAs.*',
  'branding.shareImage.alt',
  'branding.shareImage.src',
  'geo.crawlers.*.allow',
  'geo.llmsTxt.enabled',
  'seo.canonical.enabled',
  'seo.defaultDescription',
  'seo.feed.description',
  'seo.feed.enabled',
  'seo.feed.title',
  'seo.indexing.follow',
  'seo.indexing.index',
  'seo.openGraph.enabled',
  'seo.openGraph.siteName',
  'seo.sitemap.enabled',
  'seo.structuredData.blogPosting',
  'seo.structuredData.breadcrumbs',
  'seo.structuredData.person',
  'seo.structuredData.website',
  'site.canonicalUrl'
] as const

const gateFields = [
  'geo.contentSignals.requireAuthor',
  'geo.contentSignals.requireCanonical',
  'geo.contentSignals.requireCitations',
  'geo.contentSignals.requireImageAlt',
  'geo.contentSignals.requirePublishedAt',
  'geo.contentSignals.requireUpdatedAt',
  'integrations.analytics.requiredEnvironmentVariables.*',
  'integrations.comments.requiredEnvironmentVariables.*',
  'schemaVersion',
  'site.defaultLocale'
] as const

export const SITE_CONFIGURATION_FIELD_CONSUMERS: readonly SiteConfigurationFieldConsumer[] = [
  ...runtimeFields.map((path) => ({
    path,
    kind: 'runtime' as const,
    owner: 'docs/.vitepress/config/adapter.ts#createVitePressAdapter',
    preview: 'live' as const
  })),
  ...artifactFields.map((path) => ({
    path,
    kind: 'artifact' as const,
    owner: 'packages/site-schema/src/public-artifacts.ts',
    preview: 'artifact' as const
  })),
  ...gateFields.map((path) => ({
    path,
    kind: 'gate' as const,
    owner: path.startsWith('geo.contentSignals')
      ? 'packages/site-schema/src/content-signals.ts#auditArticleContentSignals'
      : path.includes('requiredEnvironmentVariables')
        ? 'packages/site-schema/src/readiness.ts#evaluateEnvironmentReadiness'
        : 'packages/site-schema/src/validation.ts#validateSiteConfiguration',
    preview: 'reload' as const
  }))
]

function normalizedPath(path: string): string {
  const parts = path.replaceAll('[', '.').replaceAll(']', '').split('.').filter(Boolean)
  return parts.map((part, index) => {
    if (/^\d+$/.test(part)) return '*'
    if (index === 1 && parts[0] === 'locales') return '*'
    if (index === 2 && parts[0] === 'geo' && parts[1] === 'crawlers') return '*'
    return part
  }).join('.')
}

export function findFieldConsumer(path: string): SiteConfigurationFieldConsumer | undefined {
  const normalized = normalizedPath(path)
  return SITE_CONFIGURATION_FIELD_CONSUMERS.find((consumer) => consumer.path === normalized)
}
