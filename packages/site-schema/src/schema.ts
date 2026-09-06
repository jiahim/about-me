import { z } from 'zod'

const stableIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, '必须是稳定的小写 ID')
function isNormalizedPublicPath(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//')) return false
  if (value.includes('\\') || value.includes('\0')) return false
  const segments = value.slice(1).split('/')
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

function isNormalizedRepositoryPath(value: string): boolean {
  if (!value || value.startsWith('/') || /^[A-Za-z]:/.test(value)) return false
  if (value.includes('\\') || value.includes('\0')) return false
  return value
    .split('/')
    .every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

function isSafePublicAssetSource(value: string): boolean {
  if (value.trim() !== value) return false
  if (isNormalizedPublicPath(value)) return true

  try {
    const url = new URL(value)
    if (url.username || url.password) return false
    if (url.protocol === 'https:') return true

    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
  } catch {
    return false
  }
}

export const publicAssetSourceSchema = z
  .string()
  .refine(
    isSafePublicAssetSource,
    '公开图片地址必须是规范站内路径、HTTPS 地址或本机 HTTP 预览地址'
  )
const repositoryPathSchema = z
  .string()
  .refine(isNormalizedRepositoryPath, '仓库路径必须是规范的相对 POSIX 路径')
const routeSchema = z
  .string()
  .regex(/^\/(?:[a-z0-9][a-z0-9-]*\/)*$/, '公开路由必须是规范的目录路由')

export const publicImageSchema = z.strictObject({
  src: publicAssetSourceSchema,
  alt: z.string()
})

const publicAssetSchema = z.strictObject({
  src: publicAssetSourceSchema
})

export const publicLinkSchema = z.strictObject({
  label: z.string().min(1),
  href: z.string().min(1),
  newTab: z.boolean()
})

const sectionSchema = z.strictObject({
  id: stableIdSchema,
  locale: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  directory: repositoryPathSchema,
  route: routeSchema,
  parentId: stableIdSchema.optional(),
  order: z.number().int().nonnegative(),
  navigation: z.strictObject({
    header: z.boolean(),
    sidebar: z.boolean(),
    collapsed: z.boolean()
  }),
  status: z.enum(['active', 'hidden', 'archived'])
})

const navigationItemSchema = z.discriminatedUnion('type', [
  z.strictObject({
    id: stableIdSchema,
    type: z.literal('section'),
    locale: z.string().min(1),
    label: z.string().min(1),
    sectionId: stableIdSchema,
    order: z.number().int().nonnegative(),
    newTab: z.literal(false),
    visible: z.boolean()
  }),
  z.strictObject({
    id: stableIdSchema,
    type: z.literal('link'),
    locale: z.string().min(1),
    label: z.string().min(1),
    href: z.string().min(1),
    order: z.number().int().nonnegative(),
    newTab: z.boolean(),
    visible: z.boolean()
  })
])

const homepageModuleBase = {
  id: stableIdSchema,
  visible: z.boolean(),
  order: z.number().int().nonnegative()
}

const homepageModuleSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...homepageModuleBase,
    type: z.literal('hero'),
    name: z.string().min(1),
    text: z.string().min(1),
    tagline: z.string().min(1),
    image: publicImageSchema,
    actions: z.array(publicLinkSchema)
  }),
  z.strictObject({
    ...homepageModuleBase,
    type: z.literal('features'),
    items: z.array(
      z.strictObject({
        id: stableIdSchema,
        icon: z.string().min(1),
        title: z.string().min(1),
        details: z.string().min(1),
        sectionId: stableIdSchema.optional(),
        href: z.string().min(1).optional()
      })
    )
  })
])

const crawlerPolicySchema = z.strictObject({
  allow: z.boolean()
})

export const socialProviderSchema = z.enum([
  'github',
  'x',
  'linkedin',
  'youtube',
  'rss',
  'generic'
])

export const socialLinkSchema = z.strictObject({
  provider: socialProviderSchema,
  label: z.string().min(1),
  href: z.string().min(1)
})

export const siteConfigurationSchema = z.strictObject({
  schemaVersion: z.literal(2),
  site: z.strictObject({
    name: z.string().min(1),
    description: z.string().min(1),
    canonicalUrl: z.string().min(1),
    defaultLocale: z.string().min(1)
  }),
  branding: z.strictObject({
    logo: publicImageSchema,
    favicon: z.strictObject({
      src: publicAssetSourceSchema,
      type: z.string().min(1),
      sizes: z.string().min(1)
    }),
    appleTouchIcon: z
      .strictObject({
        src: publicAssetSourceSchema,
        sizes: z.string().min(1)
      })
      .optional(),
    shareImage: publicImageSchema
  }),
  author: z.strictObject({
    id: stableIdSchema,
    name: z.string().min(1),
    bio: z.string(),
    avatar: publicAssetSchema,
    sameAs: z.array(z.string().min(1))
  }),
  locales: z.record(
    z.string().min(1),
    z.strictObject({
      label: z.string().min(1),
      contentRoot: repositoryPathSchema,
      routePrefix: routeSchema,
      vitepressKey: z.string().min(1),
      enabled: z.boolean()
    })
  ),
  sections: z.array(sectionSchema),
  navigation: z.array(navigationItemSchema),
  homepage: z.strictObject({
    modules: z.array(homepageModuleSchema)
  }),
  appearance: z.strictObject({
    defaultTheme: z.enum(['auto', 'light', 'dark']),
    accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    contentLayout: z.enum(['doc', 'wide']),
    codeTheme: z.strictObject({
      light: z.enum(['github-light', 'vitesse-light', 'min-light']),
      dark: z.enum([
        'github-dark',
        'vitesse-dark',
        'min-dark',
        'nord',
        'one-dark-pro'
      ])
    }),
    outline: z.strictObject({
      minLevel: z.number().int().min(1).max(6),
      maxLevel: z.number().int().min(1).max(6),
      label: z.string().min(1)
    })
  }),
  seo: z.strictObject({
    titleTemplate: z.string().min(1),
    defaultDescription: z.string().min(1),
    canonical: z.strictObject({ enabled: z.boolean() }),
    indexing: z.strictObject({
      index: z.boolean(),
      follow: z.boolean()
    }),
    openGraph: z.strictObject({
      enabled: z.boolean(),
      siteName: z.string().min(1)
    }),
    sitemap: z.strictObject({ enabled: z.boolean() }),
    feed: z.strictObject({
      enabled: z.boolean(),
      title: z.string().min(1),
      description: z.string().min(1)
    }),
    structuredData: z.strictObject({
      website: z.boolean(),
      person: z.boolean(),
      blogPosting: z.boolean(),
      breadcrumbs: z.boolean()
    })
  }),
  geo: z.strictObject({
    crawlers: z.strictObject({
      Googlebot: crawlerPolicySchema,
      Google_Extended: crawlerPolicySchema,
      OAI_SearchBot: crawlerPolicySchema,
      GPTBot: crawlerPolicySchema
    }),
    llmsTxt: z.strictObject({ enabled: z.boolean() }),
    contentSignals: z.strictObject({
      requireAuthor: z.boolean(),
      requirePublishedAt: z.boolean(),
      requireUpdatedAt: z.boolean(),
      requireCanonical: z.boolean(),
      requireImageAlt: z.boolean(),
      requireCitations: z.boolean()
    })
  }),
  footer: z.strictObject({
    copyright: z.strictObject({
      startYear: z.number().int().min(1970),
      holder: z.string().min(1)
    }),
    notice: z.string(),
    links: z.array(publicLinkSchema),
    social: z.array(socialLinkSchema)
  }),
  integrations: z.strictObject({
    analytics: z.strictObject({
      enabled: z.boolean(),
      provider: z.enum(['none', 'umami']),
      scriptSrc: z.string().min(1),
      websiteId: z.string(),
      requiredEnvironmentVariables: z.array(z.string())
    }),
    comments: z.strictObject({
      enabled: z.boolean(),
      provider: z.enum(['none', 'giscus']),
      repository: z.string(),
      repositoryId: z.string(),
      category: z.string(),
      categoryId: z.string(),
      mapping: z.enum(['pathname', 'url', 'title', 'og:title']),
      requiredEnvironmentVariables: z.array(z.string())
    })
  })
})

export type SiteConfiguration = z.infer<typeof siteConfigurationSchema>
export type SectionConfiguration = SiteConfiguration['sections'][number]
export type PublicImage = z.infer<typeof publicImageSchema>
export type PublicLink = z.infer<typeof publicLinkSchema>
export type SocialLink = z.infer<typeof socialLinkSchema>

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T

export type NormalizedSiteConfiguration = DeepReadonly<SiteConfiguration>
