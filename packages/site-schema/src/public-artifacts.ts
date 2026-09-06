import type { NormalizedSiteConfiguration } from './schema.js'

export interface PublicArticleRecord {
  relativePath: string
  route: string
  title: string
  description: string
  body: string
  publishedAt: string
  updatedAt?: string
  author: string
  sectionName: string
}

export type JsonLd = Record<string, unknown>

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function absoluteUrl(origin: string, pathname: string): string {
  return new URL(pathname.replace(/^\//, ''), `${origin.replace(/\/$/, '')}/`).toString()
}

function isPublicSection(config: NormalizedSiteConfiguration, sectionId: string): boolean {
  let current = config.sections.find((section) => section.id === sectionId)
  while (current) {
    if (current.status !== 'active' || !config.locales[current.locale]?.enabled) return false
    current = current.parentId
      ? config.sections.find((candidate) => candidate.id === current?.parentId)
      : undefined
  }
  return true
}

function publicSections(config: NormalizedSiteConfiguration) {
  return config.sections.filter((section) => isPublicSection(config, section.id))
}

const crawlerNames: Record<string, string> = {
  Googlebot: 'Googlebot',
  Google_Extended: 'Google-Extended',
  OAI_SearchBot: 'OAI-SearchBot',
  GPTBot: 'GPTBot'
}

export function generateRobots(config: NormalizedSiteConfiguration): string {
  const blocks = Object.entries(config.geo.crawlers).map(([id, policy]) =>
    `User-agent: ${crawlerNames[id] || id}\n${policy.allow ? 'Allow' : 'Disallow'}: /`
  )
  blocks.push(`Sitemap: ${new URL('sitemap.xml', `${config.site.canonicalUrl.replace(/\/$/, '')}/`)}`)
  return `${blocks.join('\n\n')}\n`
}

export function generateSitemap(config: NormalizedSiteConfiguration, articles: readonly PublicArticleRecord[]): string {
  const routes = new Set<string>(['/'])
  Object.values(config.locales).filter((locale) => locale.enabled).forEach((locale) => routes.add(locale.routePrefix))
  publicSections(config).forEach((section) => routes.add(section.route))
  articles.forEach((article) => routes.add(article.route))
  const urls = [...routes].sort().map((route) => `  <url><loc>${escapeXml(absoluteUrl(config.site.canonicalUrl, route))}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

function atomDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

export function generateAtomFeed(config: NormalizedSiteConfiguration, articles: readonly PublicArticleRecord[]): string {
  const origin = config.site.canonicalUrl
  const sorted = [...articles].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
  const entries = sorted.map((article) => {
    const url = absoluteUrl(origin, article.route)
    return `  <entry><title>${escapeXml(article.title)}</title><id>${escapeXml(url)}</id><link href="${escapeXml(url)}"/><updated>${atomDate(article.updatedAt || article.publishedAt)}</updated><summary>${escapeXml(article.description)}</summary><author><name>${escapeXml(article.author)}</name></author></entry>`
  })
  const updated = sorted[0] ? atomDate(sorted[0].updatedAt || sorted[0].publishedAt) : new Date(0).toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>${escapeXml(config.seo.feed.title)}</title><id>${escapeXml(origin)}</id><updated>${updated}</updated><subtitle>${escapeXml(config.seo.feed.description)}</subtitle>\n${entries.join('\n')}\n</feed>\n`
}

export function generateLlmsTxt(config: NormalizedSiteConfiguration, articles: readonly PublicArticleRecord[]): string | null {
  if (!config.geo.llmsTxt.enabled) return null
  const lines = articles.map((article) => `- [${article.title}](${absoluteUrl(config.site.canonicalUrl, article.route)}): ${article.description}`)
  return `# ${config.site.name}\n\n> Experimental machine-readable index; llms.txt is not a unified standard.\n\n${config.site.description}\n\n## Articles\n\n${lines.join('\n')}\n`
}

export function createWebsiteJsonLd(config: NormalizedSiteConfiguration): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: config.site.name, description: config.site.description, url: config.site.canonicalUrl }
}

export function createPersonJsonLd(config: NormalizedSiteConfiguration): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'Person', '@id': `${config.site.canonicalUrl.replace(/\/$/, '')}/#${config.author.id}`, name: config.author.name, description: config.author.bio, image: absoluteUrl(config.site.canonicalUrl, config.author.avatar.src), sameAs: config.author.sameAs }
}

export function createBlogPostingJsonLd(config: NormalizedSiteConfiguration, article: PublicArticleRecord): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title, description: article.description, url: absoluteUrl(config.site.canonicalUrl, article.route), datePublished: article.publishedAt, dateModified: article.updatedAt || article.publishedAt, author: { '@type': 'Person', name: article.author } }
}

export function createBreadcrumbJsonLd(config: NormalizedSiteConfiguration, article: PublicArticleRecord): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: config.site.name, item: config.site.canonicalUrl },
    { '@type': 'ListItem', position: 2, name: article.sectionName },
    { '@type': 'ListItem', position: 3, name: article.title, item: absoluteUrl(config.site.canonicalUrl, article.route) }
  ] }
}
