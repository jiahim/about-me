import { createDefaultSiteConfiguration, type PublicArticleRecord } from '@jiahim/site-schema'
import { describe, expect, it } from 'vitest'

import { auditPublicArticles } from './content-audit'

const article: PublicArticleRecord = {
  relativePath: 'zh/skill/test.md',
  route: '/zh/skill/test',
  title: 'Test',
  description: 'Summary',
  body: '## Body',
  publishedAt: '',
  author: 'Jia him',
  sectionName: '技术'
}

describe('public content audit', () => {
  it('uses configured signals and preserves article identity', () => {
    const config = createDefaultSiteConfiguration()
    const findings = auditPublicArticles(config, [article])

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'published-at-invalid', relativePath: 'zh/skill/test.md', severity: 'error' }),
      expect.objectContaining({ id: 'citation-missing', relativePath: 'zh/skill/test.md', severity: 'warning' })
    ]))

    config.geo.contentSignals.requirePublishedAt = false
    config.geo.contentSignals.requireCitations = false
    const ids = auditPublicArticles(config, [article]).map((finding) => finding.id)
    expect(ids).not.toContain('published-at-invalid')
    expect(ids).not.toContain('citation-missing')
  })
})
