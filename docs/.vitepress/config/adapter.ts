import path from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import matter from 'gray-matter'

import {
  buildSectionForest,
  type NormalizedSiteConfiguration,
  type SectionNode
} from '@jiahim/site-schema'
import type { DefaultTheme, UserConfig } from 'vitepress'

import { generateSidebarItems } from './tools'
import {
  createBlogPostingJsonLd,
  createBreadcrumbJsonLd,
  createPersonJsonLd,
  createWebsiteJsonLd
} from '../generators/structured-data'
import type { PublicArticleRecord } from '../generators/articles'

export interface VitePressAdapterOptions {
  command: 'serve' | 'build'
}

const rssIcon: DefaultTheme.SocialLinkIcon = {
  svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3a16 16 0 0 1 16 16h-3A13 13 0 0 0 5 6V3Zm0 6a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V9Zm0 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>'
}

const genericSocialIcon: DefaultTheme.SocialLinkIcon = {
  svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 1 0-1.4l4-4a3 3 0 1 1 4.2 4.2l-2 2a1 1 0 0 0 1.4 1.4l2-2A5 5 0 0 0 13.2 6.6l-4 4a3 3 0 0 0 0 4.2 1 1 0 1 0 1.4-1.4Zm2.8-2.8a1 1 0 0 1 0 1.4l-4 4a3 3 0 1 1-4.2-4.2l2-2a1 1 0 1 0-1.4-1.4l-2 2a5 5 0 0 0 7 7l4-4a3 3 0 0 0 0-4.2 1 1 0 0 0-1.4 1.4Z"/></svg>'
}

function socialIcon(provider: NormalizedSiteConfiguration['footer']['social'][number]['provider']): DefaultTheme.SocialLinkIcon {
  if (provider === 'rss') return rssIcon
  if (provider === 'generic') return genericSocialIcon
  return provider
}

function flatten(nodes: readonly SectionNode[]): SectionNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)])
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function publicRoute(relativePath: string): string {
  if (relativePath === 'index.md') return '/'
  if (relativePath.endsWith('/index.md')) return `/${relativePath.slice(0, -'index.md'.length)}`
  return `/${relativePath.replace(/\.md$/, '')}`
}

function discoverDraftSources(docsRoot: string): string[] {
  const results: string[] = []
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error(`内容目录不能包含符号链接：${path.join(directory, entry.name)}`)
      if (entry.name === '.vitepress' || entry.name === 'public' || entry.name === 'superpowers' || entry.name === 'uat') continue
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(target)
      else if (entry.isFile() && entry.name.endsWith('.md') && matter(readFileSync(target, 'utf8')).data.draft === true) {
        results.push(path.relative(docsRoot, target).split(path.sep).join('/'))
      }
    }
  }
  walk(docsRoot)
  return results
}

function footerMessage(config: NormalizedSiteConfiguration): string {
  const links = config.footer.links
    .map(
      (link) =>
        `<a class="footer-links__link" href="${escapeHtml(link.href)}"${
          link.newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
        }>${escapeHtml(link.label)}</a>`
    )
    .join('<span class="footer-links__divider" aria-hidden="true">·</span>')
  return `<span class="footer-links"><span class="footer-links__label">友情链接</span>${links}</span><span class="footer-note">${escapeHtml(config.footer.notice)}</span>`
}

function absoluteSectionDirectory(docsRoot: string, directory: string): string {
  return path.join(docsRoot, directory.replace(/^docs\//, ''))
}

function sidebarNode(
  node: SectionNode,
  docsRoot: string,
  configuredDirectories: ReadonlySet<string>
): DefaultTheme.SidebarItem {
  const sectionDirectory = absoluteSectionDirectory(
    docsRoot,
    node.section.directory
  )
  const descendantDirectories = new Set(
    [...configuredDirectories].filter((directory) => {
      const relative = path.relative(sectionDirectory, directory)
      return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`)
    })
  )
  return {
    text: node.section.description || node.section.name,
    link: node.section.route,
    collapsed: node.section.navigation.collapsed,
    items: [
      ...generateSidebarItems(
        sectionDirectory,
        node.section.route,
        descendantDirectories,
        docsRoot
      ),
      ...node.children.map((child) =>
        sidebarNode(child, docsRoot, configuredDirectories)
      )
    ]
  }
}

export interface VitePressAdapter {
  shared: UserConfig
  locales: Record<
    string,
    { label: string; lang: string; themeConfig: DefaultTheme.Config }
  >
  nav: Record<string, DefaultTheme.NavItem[]>
  sidebar: Record<string, DefaultTheme.Sidebar>
  sectionIds: Record<string, readonly string[]>
}

export function createVitePressAdapter(
  config: NormalizedSiteConfiguration,
  docsRoot: string,
  options: VitePressAdapterOptions = { command: 'build' }
): VitePressAdapter {
  const nav: VitePressAdapter['nav'] = {}
  const sidebar: VitePressAdapter['sidebar'] = {}
  const sectionIds: VitePressAdapter['sectionIds'] = {}
  const locales: VitePressAdapter['locales'] = {}
  const publicSectionIds = new Set(
    config.sections
      .filter((section) => {
        let current: typeof section | undefined = section
        while (current) {
          if (current.status !== 'active') return false
          current = current.parentId
            ? config.sections.find((candidate) => candidate.id === current?.parentId)
            : undefined
        }
        return config.locales[section.locale]?.enabled === true
      })
      .map((section) => section.id)
  )

  for (const [localeId, locale] of Object.entries(config.locales)) {
    if (!locale.enabled) continue
    const key = locale.vitepressKey
    const headerForest = buildSectionForest(config, {
      locale: localeId,
      surface: 'header'
    })
    const headerIds = new Set(flatten(headerForest).map((node) => node.section.id))
    nav[key] = config.navigation
      .filter((item) => item.locale === localeId && item.visible)
      .slice()
      .sort(
        (left, right) =>
          left.order - right.order ||
          left.label.localeCompare(right.label, 'zh-CN') ||
          left.id.localeCompare(right.id)
      )
      .flatMap((item): DefaultTheme.NavItem[] => {
        if (item.type === 'section') {
          const section = config.sections.find(
            (candidate) => candidate.id === item.sectionId
          )
          if (!section || !headerIds.has(section.id)) return []
          return [
            {
              text: item.label,
              link: section.route,
              activeMatch: `^${section.route}`
            }
          ]
        }
        return [
          {
            text: item.label,
            link: item.href,
            target: item.newTab ? '_blank' : undefined,
            rel: item.newTab ? 'noopener noreferrer' : undefined
          }
        ]
      })

    const sidebarForest = buildSectionForest(config, {
      locale: localeId,
      surface: 'sidebar'
    })
    const configuredDirectories = new Set(
      config.sections
        .filter((section) => section.locale === localeId)
        .map((section) => absoluteSectionDirectory(docsRoot, section.directory))
    )
    sidebar[key] = Object.fromEntries(
      sidebarForest.map((node) => [
        node.section.route,
        [sidebarNode(node, docsRoot, configuredDirectories)]
      ])
    )
    sectionIds[key] = flatten(
      buildSectionForest(config, { locale: localeId, surface: 'editor' })
    ).map((node) => node.section.id)
    locales[key] = {
      label: locale.label,
      lang: localeId,
      themeConfig: { nav: nav[key], sidebar: sidebar[key] }
    }
  }

  const analytics = config.integrations.analytics
  const head: NonNullable<UserConfig['head']> = [
    [
      'link',
      {
        rel: 'icon',
        type: config.branding.favicon.type,
        sizes: config.branding.favicon.sizes,
        href: config.branding.favicon.src
      }
    ]
  ]
  if (config.branding.appleTouchIcon) {
    head.push([
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: config.branding.appleTouchIcon.sizes,
        href: config.branding.appleTouchIcon.src
      }
    ])
  }
  if (options.command === 'build' && analytics.enabled && analytics.provider === 'umami') {
    head.push([
      'script',
      {
        defer: '',
        src: analytics.scriptSrc,
        'data-website-id': analytics.websiteId
      }
    ])
  }

  const homepageModules = config.homepage.modules
    .filter((module) => module.visible)
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
  const heroes = homepageModules.filter((module) => module.type === 'hero')
  if (heroes.length > 1) throw new Error('首页只能配置一个可见 hero 模块')
  const hero = heroes[0]
  const featureItems = homepageModules
    .filter((module) => module.type === 'features')
    .flatMap((module) => module.items)
    .filter(
      (item) => !item.sectionId || publicSectionIds.has(item.sectionId)
    )
  const disabledLocaleSources = Object.values(config.locales)
    .filter((locale) => !locale.enabled)
    .map((locale) => `${locale.contentRoot.replace(/^docs\//, '')}/**`)
  const nonPublicSectionSources = config.sections
    .filter((section) => !publicSectionIds.has(section.id))
    .map((section) => `${section.directory.replace(/^docs\//, '')}/**`)
  const draftSources = discoverDraftSources(docsRoot)

  return {
    shared: {
      title: config.site.name,
      titleTemplate: config.seo.titleTemplate,
      description: config.site.description,
      head,
      markdown: {
        theme: {
          light: config.appearance.codeTheme.light,
          dark: config.appearance.codeTheme.dark
        }
      },
      sitemap: config.seo.sitemap.enabled
        ? { hostname: config.site.canonicalUrl }
        : undefined,
      srcExclude: [...new Set([...disabledLocaleSources, ...nonPublicSectionSources, ...draftSources])],
      transformPageData(pageData) {
        const route = publicRoute(pageData.relativePath)
        const canonical = new URL(route.replace(/^\//, ''), `${config.site.canonicalUrl.replace(/\/$/, '')}/`).toString()
        const title = pageData.title || pageData.frontmatter.title || config.site.name
        const description = pageData.description || pageData.frontmatter.description || config.seo.defaultDescription
        const isDraft = pageData.frontmatter.draft === true
        const isIndex = pageData.relativePath === 'index.md' || pageData.relativePath.endsWith('/index.md')
        const pageHead: unknown[] = [
          ['meta', { name: 'robots', content: isDraft ? 'noindex,nofollow' : `${config.seo.indexing.index ? 'index' : 'noindex'},${config.seo.indexing.follow ? 'follow' : 'nofollow'}` }]
        ]
        if (!isDraft && config.seo.canonical.enabled) pageHead.push(['link', { rel: 'canonical', href: canonical }])
        if (!isDraft && config.seo.openGraph.enabled) {
          pageHead.push(
            ['meta', { property: 'og:title', content: title }],
            ['meta', { property: 'og:description', content: description }],
            ['meta', { property: 'og:url', content: canonical }],
            ['meta', { property: 'og:site_name', content: config.seo.openGraph.siteName }],
            ['meta', { property: 'og:type', content: isIndex ? 'website' : 'article' }],
            ['meta', { property: 'og:image', content: new URL(config.branding.shareImage.src.replace(/^\//, ''), `${config.site.canonicalUrl.replace(/\/$/, '')}/`).toString() }],
            ['meta', { property: 'og:image:alt', content: config.branding.shareImage.alt }]
          )
        }
        if (isDraft) {
          pageData.frontmatter.head = [...(Array.isArray(pageData.frontmatter.head) ? pageData.frontmatter.head : []), ...pageHead]
          return
        }
        if (pageData.relativePath === 'index.md') {
          if (config.seo.structuredData.website) pageHead.push(['script', { type: 'application/ld+json' }, safeJson(createWebsiteJsonLd(config))])
          if (config.seo.structuredData.person) pageHead.push(['script', { type: 'application/ld+json' }, safeJson(createPersonJsonLd(config))])
        } else {
          const repositoryPath = `docs/${pageData.relativePath}`
          const section = config.sections
            .filter((candidate) => publicSectionIds.has(candidate.id) && repositoryPath.startsWith(`${candidate.directory}/`))
            .sort((left, right) => right.directory.length - left.directory.length)[0]
          if (section) {
            const article: PublicArticleRecord = {
              relativePath: pageData.relativePath,
              route,
              title: String(title),
              description: String(description),
              body: '',
              publishedAt: String(pageData.frontmatter.date || ''),
              ...(pageData.frontmatter.updatedAt ? { updatedAt: String(pageData.frontmatter.updatedAt) } : {}),
              author: String(pageData.frontmatter.author || config.author.name),
              sectionName: section.name
            }
            const validPublishedAt = /^\d{4}-\d{2}-\d{2}$/.test(article.publishedAt) && !Number.isNaN(new Date(`${article.publishedAt}T00:00:00Z`).getTime())
            if (!isIndex && validPublishedAt && config.seo.structuredData.blogPosting) pageHead.push(['script', { type: 'application/ld+json' }, safeJson(createBlogPostingJsonLd(config, article))])
            if (!isIndex && config.seo.structuredData.breadcrumbs) pageHead.push(['script', { type: 'application/ld+json' }, safeJson(createBreadcrumbJsonLd(config, article))])
          }
        }
        pageData.frontmatter.head = [...(Array.isArray(pageData.frontmatter.head) ? pageData.frontmatter.head : []), ...pageHead]
        if (!['index.md', 'zh/index.md'].includes(pageData.relativePath)) return
        pageData.frontmatter.layout = 'home'
        if (hero?.type === 'hero') {
          pageData.frontmatter.hero = {
            name: hero.name,
            text: hero.text,
            tagline: hero.tagline,
            image: hero.image,
            actions: hero.actions.map((action, index) => ({
              theme: index === 0 ? 'brand' : 'alt',
              text: action.label,
              link: action.href,
              target: action.newTab ? '_blank' : undefined,
              rel: action.newTab ? 'noopener noreferrer' : undefined
            }))
          }
        }
        if (featureItems.length) {
          pageData.frontmatter.features = featureItems.map((item) => ({
            icon: item.icon,
            title: item.title,
            details: item.details,
            link:
              item.href ??
              config.sections.find((section) => section.id === item.sectionId)?.route
          }))
        }
      },
      themeConfig: {
        logo: config.branding.logo,
        socialLinks: config.footer.social
          .map((link) => ({
            icon: socialIcon(link.provider),
            link: link.href,
            ariaLabel: link.label
          })),
        outline: {
          level: [
            config.appearance.outline.minLevel,
            config.appearance.outline.maxLevel
          ],
          label: config.appearance.outline.label
        },
        footer: {
          message: footerMessage(config),
          copyright: `Copyright © ${config.footer.copyright.startYear}-${new Date().getFullYear()} ${config.footer.copyright.holder}`
        },
        comments: config.integrations.comments,
        siteAppearance: config.appearance,
        authorName: config.author.name,
        sectionLabels: config.sections
          .filter((section) => publicSectionIds.has(section.id))
          .map((section) => ({ name: section.name, route: section.route })),
        homepageModules
      } as DefaultTheme.Config & {
        comments: typeof config.integrations.comments
        siteAppearance: typeof config.appearance
        authorName: string
        sectionLabels: Array<{ name: string; route: string }>
        homepageModules: typeof homepageModules
      }
    },
    locales,
    nav,
    sidebar,
    sectionIds
  }
}
