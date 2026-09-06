import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { describe, expect, it } from 'vitest'

import { generateAtomFeed } from './feed'
import { generateLlmsTxt } from './llms'
import { generateRobots } from './robots'
import { generateSitemap } from './sitemap'
import {
  createBlogPostingJsonLd,
  createBreadcrumbJsonLd,
  createPersonJsonLd,
  createWebsiteJsonLd
} from './structured-data'
import type { PublicArticleRecord } from './articles'

const articles: PublicArticleRecord[] = [
  {
    relativePath: 'zh/skill/hello.md',
    route: '/zh/skill/hello',
    title: 'Hello & XML',
    description: 'A <useful> article',
    body: '# Hello',
    publishedAt: '2026-01-02',
    updatedAt: '2026-01-03',
    author: 'Jia him',
    sectionName: '技术'
  }
]

describe('public discovery generators', () => {
  it('keeps discovery and training crawler policies independent', () => {
    const output = generateRobots(createDefaultSiteConfiguration())
    expect(output).toContain('User-agent: OAI-SearchBot\nAllow: /')
    expect(output).toContain('User-agent: GPTBot\nDisallow: /')
    expect(output).toContain('User-agent: Google-Extended\nDisallow: /')
  })

  it('escapes and sorts sitemap/feed content', () => {
    const config = createDefaultSiteConfiguration()
    expect(generateSitemap(config, articles)).toContain('hello')
    expect(generateSitemap(config, articles)).toContain('<loc>https://jiahim.com/zh/</loc>')
    const feed = generateAtomFeed(config, articles)
    expect(feed).toContain('Hello &amp; XML')
    expect(feed).toContain('A &lt;useful&gt; article')
  })

  it('keeps experimental llms output disabled by default', () => {
    const config = createDefaultSiteConfiguration()
    expect(generateLlmsTxt(config, articles)).toBeNull()
    config.geo.llmsTxt.enabled = true
    expect(generateLlmsTxt(config, articles)).toContain('Experimental')
  })

  it('creates the four configured JSON-LD types from public data', () => {
    const config = createDefaultSiteConfiguration()
    expect(createWebsiteJsonLd(config)['@type']).toBe('WebSite')
    expect(createPersonJsonLd(config)).toMatchObject({
      '@type': 'Person',
      sameAs: ['https://github.com/xiexin12138']
    })
    expect(createBlogPostingJsonLd(config, articles[0])['@type']).toBe('BlogPosting')
    expect(createBreadcrumbJsonLd(config, articles[0])['@type']).toBe('BreadcrumbList')
  })
})
