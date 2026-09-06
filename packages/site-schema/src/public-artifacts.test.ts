import { describe, expect, it } from 'vitest'

import { createDefaultSiteConfiguration } from './defaults.js'
import {
  createBlogPostingJsonLd,
  createBreadcrumbJsonLd,
  createPersonJsonLd,
  createWebsiteJsonLd,
  generateAtomFeed,
  generateLlmsTxt,
  generateRobots,
  generateSitemap,
  type PublicArticleRecord
} from './public-artifacts.js'

const articles: PublicArticleRecord[] = [{
  relativePath: 'zh/skill/hello.md',
  route: '/zh/skill/hello',
  title: 'Hello & XML',
  description: 'A <useful> article',
  body: '# Hello',
  publishedAt: '2026-01-02',
  updatedAt: '2026-01-03',
  author: 'Jia him',
  sectionName: '技术'
}]

describe('shared public artifacts', () => {
  it('serializes deterministic robots and sitemap output', () => {
    const config = createDefaultSiteConfiguration()

    expect(generateRobots(config)).toBe(
      'User-agent: Googlebot\nAllow: /\n\n' +
      'User-agent: Google-Extended\nDisallow: /\n\n' +
      'User-agent: OAI-SearchBot\nAllow: /\n\n' +
      'User-agent: GPTBot\nDisallow: /\n\n' +
      'Sitemap: https://jiahim.com/sitemap.xml\n'
    )
    expect(generateSitemap(config, articles)).toContain(
      '<url><loc>https://jiahim.com/zh/skill/hello</loc></url>'
    )
  })

  it('preserves Atom escaping and disabled llms behavior', () => {
    const config = createDefaultSiteConfiguration()
    const feed = generateAtomFeed(config, articles)

    expect(feed).toContain('<title>Hello &amp; XML</title>')
    expect(feed).toContain('<summary>A &lt;useful&gt; article</summary>')
    expect(generateLlmsTxt(config, articles)).toBeNull()
    config.geo.llmsTxt.enabled = true
    expect(generateLlmsTxt(config, articles)).toContain(
      '- [Hello & XML](https://jiahim.com/zh/skill/hello): A <useful> article'
    )
  })

  it('creates stable Website, Person, BlogPosting, and Breadcrumb data', () => {
    const config = createDefaultSiteConfiguration()

    expect(createWebsiteJsonLd(config)).toMatchObject({ '@type': 'WebSite', url: 'https://jiahim.com' })
    expect(createPersonJsonLd(config)).toMatchObject({
      '@type': 'Person',
      image: 'https://jiahim.com/images/me.jpg',
      sameAs: ['https://github.com/xiexin12138']
    })
    expect(createBlogPostingJsonLd(config, articles[0])).toMatchObject({
      '@type': 'BlogPosting',
      datePublished: '2026-01-02',
      dateModified: '2026-01-03'
    })
    expect(createBreadcrumbJsonLd(config, articles[0])).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: expect.arrayContaining([
        expect.objectContaining({ position: 3, item: 'https://jiahim.com/zh/skill/hello' })
      ])
    })
  })
})
