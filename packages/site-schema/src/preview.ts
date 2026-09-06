import { z } from 'zod'

import { createPersonJsonLd, createWebsiteJsonLd, generateAtomFeed, generateLlmsTxt, generateRobots, generateSitemap } from './public-artifacts.js'
import type { EnvironmentReadiness } from './readiness.js'
import type { SiteConfiguration } from './schema.js'

export const SETTINGS_PREVIEW_PROTOCOL_VERSION = 1 as const

export const settingsPreviewGroupSchema = z.enum([
  'basic',
  'branding',
  'author',
  'sections',
  'navigation',
  'homepage',
  'appearance',
  'seo-geo',
  'footer-social',
  'integrations',
  'advanced'
])

export type SettingsPreviewGroup = z.infer<typeof settingsPreviewGroupSchema>

const imageSchema = z.strictObject({ src: z.string(), alt: z.string() })
const publicLinkSchema = z.strictObject({ label: z.string(), href: z.string(), newTab: z.boolean() })
const socialLinkSchema = z.strictObject({ provider: z.enum(['github', 'x', 'linkedin', 'youtube', 'rss', 'generic']), label: z.string(), href: z.string() })

export const settingsPreviewModelSchema = z.strictObject({
  version: z.literal(SETTINGS_PREVIEW_PROTOCOL_VERSION),
  group: settingsPreviewGroupSchema,
  site: z.strictObject({ name: z.string(), description: z.string(), canonicalUrl: z.string(), defaultLocale: z.string() }),
  branding: z.strictObject({
    logo: imageSchema,
    favicon: z.strictObject({ src: z.string(), type: z.string(), sizes: z.string() }),
    appleTouchIcon: z.strictObject({ src: z.string(), sizes: z.string() }).optional(),
    shareImage: imageSchema
  }),
  author: z.strictObject({ id: z.string(), name: z.string(), bio: z.string(), avatar: z.strictObject({ src: z.string() }), sameAs: z.array(z.string()) }),
  sections: z.array(z.strictObject({ id: z.string(), locale: z.string(), name: z.string(), description: z.string().optional(), route: z.string(), parentId: z.string().optional(), order: z.number(), sidebar: z.boolean(), collapsed: z.boolean() })),
  navigation: z.array(z.strictObject({ id: z.string(), locale: z.string(), label: z.string(), href: z.string(), newTab: z.boolean() })),
  homepage: z.strictObject({ modules: z.array(z.union([
    z.strictObject({ id: z.string(), type: z.literal('hero'), visible: z.boolean(), order: z.number(), name: z.string(), text: z.string(), tagline: z.string(), image: imageSchema, actions: z.array(publicLinkSchema) }),
    z.strictObject({ id: z.string(), type: z.literal('features'), visible: z.boolean(), order: z.number(), items: z.array(z.strictObject({ id: z.string(), icon: z.string(), title: z.string(), details: z.string(), sectionId: z.string().optional(), href: z.string().optional() })) })
  ])) }),
  appearance: z.strictObject({
    defaultTheme: z.enum(['auto', 'light', 'dark']),
    accentColor: z.string(),
    contentLayout: z.enum(['doc', 'wide']),
    codeTheme: z.strictObject({ light: z.string(), dark: z.string() }),
    outline: z.strictObject({ minLevel: z.number(), maxLevel: z.number(), label: z.string() })
  }),
  footer: z.strictObject({ copyright: z.strictObject({ startYear: z.number(), holder: z.string() }), notice: z.string(), links: z.array(publicLinkSchema), social: z.array(socialLinkSchema) }),
  integrations: z.strictObject({ analytics: z.strictObject({ enabled: z.boolean(), provider: z.enum(['none', 'umami']) }), comments: z.strictObject({ enabled: z.boolean(), provider: z.enum(['none', 'giscus']) }) }),
  readiness: z.strictObject({ analytics: z.boolean(), comments: z.boolean() }),
  artifacts: z.strictObject({ robots: z.string(), sitemap: z.string(), feed: z.string(), llmsTxt: z.string().nullable(), websiteJsonLd: z.string(), personJsonLd: z.string() })
})

export type SettingsPreviewModel = z.infer<typeof settingsPreviewModelSchema>

function ownerReady(readiness: readonly EnvironmentReadiness[], owner: 'analytics' | 'comments'): boolean {
  return readiness.filter((item) => item.requiredBy.includes(owner)).every((item) => item.exists)
}

export function createSettingsPreviewModel(
  config: SiteConfiguration,
  group: SettingsPreviewGroup,
  readiness: readonly EnvironmentReadiness[]
): SettingsPreviewModel {
  const sectionsById = new Map(config.sections.map((section) => [section.id, section]))
  const model: SettingsPreviewModel = {
    version: SETTINGS_PREVIEW_PROTOCOL_VERSION,
    group,
    site: {
      name: config.site.name,
      description: config.site.description,
      canonicalUrl: config.site.canonicalUrl,
      defaultLocale: config.site.defaultLocale
    },
    branding: {
      logo: { src: config.branding.logo.src, alt: config.branding.logo.alt },
      favicon: { src: config.branding.favicon.src, type: config.branding.favicon.type, sizes: config.branding.favicon.sizes },
      ...(config.branding.appleTouchIcon ? { appleTouchIcon: { src: config.branding.appleTouchIcon.src, sizes: config.branding.appleTouchIcon.sizes } } : {}),
      shareImage: { src: config.branding.shareImage.src, alt: config.branding.shareImage.alt }
    },
    author: {
      id: config.author.id,
      name: config.author.name,
      bio: config.author.bio,
      avatar: { src: config.author.avatar.src },
      sameAs: [...config.author.sameAs]
    },
    sections: config.sections
      .filter((section) => section.status === 'active' && config.locales[section.locale]?.enabled)
      .map((section) => ({
        id: section.id,
        locale: section.locale,
        name: section.name,
        ...(section.description ? { description: section.description } : {}),
        route: section.route,
        ...(section.parentId ? { parentId: section.parentId } : {}),
        order: section.order,
        sidebar: section.navigation.sidebar,
        collapsed: section.navigation.collapsed
      })),
    navigation: config.navigation
      .filter((item) => item.visible && config.locales[item.locale]?.enabled)
      .map((item) => ({
        id: item.id,
        locale: item.locale,
        label: item.label,
        href: item.type === 'section' ? sectionsById.get(item.sectionId)?.route ?? '/' : item.href,
        newTab: item.newTab
      })),
    homepage: {
      modules: config.homepage.modules.map((module) => module.type === 'hero'
        ? {
            id: module.id,
            type: module.type,
            visible: module.visible,
            order: module.order,
            name: module.name,
            text: module.text,
            tagline: module.tagline,
            image: { src: module.image.src, alt: module.image.alt },
            actions: module.actions.map((action) => ({ label: action.label, href: action.href, newTab: action.newTab }))
          }
        : {
            id: module.id,
            type: module.type,
            visible: module.visible,
            order: module.order,
            items: module.items.map((item) => ({ id: item.id, icon: item.icon, title: item.title, details: item.details, ...(item.sectionId ? { sectionId: item.sectionId } : {}), ...(item.href ? { href: item.href } : {}) }))
          })
    },
    appearance: {
      defaultTheme: config.appearance.defaultTheme,
      accentColor: config.appearance.accentColor,
      contentLayout: config.appearance.contentLayout,
      codeTheme: { light: config.appearance.codeTheme.light, dark: config.appearance.codeTheme.dark },
      outline: { minLevel: config.appearance.outline.minLevel, maxLevel: config.appearance.outline.maxLevel, label: config.appearance.outline.label }
    },
    footer: {
      copyright: { startYear: config.footer.copyright.startYear, holder: config.footer.copyright.holder },
      notice: config.footer.notice,
      links: config.footer.links.map((link) => ({ label: link.label, href: link.href, newTab: link.newTab })),
      social: config.footer.social.map((link) => ({ provider: link.provider, label: link.label, href: link.href }))
    },
    integrations: {
      analytics: { enabled: config.integrations.analytics.enabled, provider: config.integrations.analytics.provider },
      comments: { enabled: config.integrations.comments.enabled, provider: config.integrations.comments.provider }
    },
    readiness: {
      analytics: ownerReady(readiness, 'analytics'),
      comments: ownerReady(readiness, 'comments')
    },
    artifacts: {
      robots: generateRobots(config),
      sitemap: generateSitemap(config, []),
      feed: generateAtomFeed(config, []),
      llmsTxt: generateLlmsTxt(config, []),
      websiteJsonLd: JSON.stringify(createWebsiteJsonLd(config), null, 2),
      personJsonLd: JSON.stringify(createPersonJsonLd(config), null, 2)
    }
  }

  return settingsPreviewModelSchema.parse(model)
}

const updateMessageSchema = z.strictObject({
  kind: z.literal('settings-preview:update'),
  version: z.literal(SETTINGS_PREVIEW_PROTOCOL_VERSION),
  sessionId: z.string().min(1),
  model: settingsPreviewModelSchema
})
const readyMessageSchema = z.strictObject({
  kind: z.literal('settings-preview:ready'),
  version: z.literal(SETTINGS_PREVIEW_PROTOCOL_VERSION),
  sessionId: z.string().min(1)
})
const navigationMessageSchema = z.strictObject({
  kind: z.literal('settings-preview:navigate'),
  version: z.literal(SETTINGS_PREVIEW_PROTOCOL_VERSION),
  sessionId: z.string().min(1),
  href: z.string().min(1)
})

export const settingsPreviewMessageSchema = z.discriminatedUnion('kind', [updateMessageSchema, readyMessageSchema, navigationMessageSchema])
export type SettingsPreviewMessage = z.infer<typeof updateMessageSchema>
export type SettingsPreviewReadyMessage = z.infer<typeof readyMessageSchema>
export type SettingsPreviewNavigateMessage = z.infer<typeof navigationMessageSchema>
export type SettingsPreviewProtocolMessage = z.infer<typeof settingsPreviewMessageSchema>

export function parseSettingsPreviewMessage(input: unknown): SettingsPreviewProtocolMessage {
  return settingsPreviewMessageSchema.parse(input)
}
