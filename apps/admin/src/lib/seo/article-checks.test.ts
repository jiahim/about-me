import { describe, expect, it } from 'vitest'

import { checkArticleSeoGeo } from './article-checks'

describe('checkArticleSeoGeo', () => {
  it('reports deterministic structural and accessibility findings with lines', () => {
    const findings = checkArticleSeoGeo({
      title: '', description: '', date: '2026-03-02', body: '## Starts at two\n#### Jump\n![](https://example.com/a.png)\n[https://example.com](javascript:alert(1))'
    }, { canonicalOrigin: 'https://jiahim.com', route: '/zh/skill/test', author: '' })

    expect(findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'title-missing', 'description-missing', 'author-missing', 'heading-jump', 'image-alt-missing', 'link-protocol-invalid'
    ]))
    expect(findings.find((finding) => finding.id === 'heading-jump')?.line).toBe(2)
  })

  it('accepts a complete article without errors', () => {
    const findings = checkArticleSeoGeo({
      title: 'A useful title',
      description: 'A concise and useful summary.',
      date: '2026-03-01',
      updatedAt: '2026-03-02',
      canonical: 'https://jiahim.com/zh/skill/test',
      body: '## Context\nText with [a source](https://example.com/source).\n\n![Diagram](/images/diagram.png)'
    }, { canonicalOrigin: 'https://jiahim.com', route: '/zh/skill/test', author: 'Jia him' })

    expect(findings.filter((finding) => finding.severity === 'error')).toEqual([])
  })

  it('rejects impossible calendar dates', () => {
    const findings = checkArticleSeoGeo({
      title: 'Date', description: 'Summary', date: '2026-02-30', body: '## Context'
    }, { canonicalOrigin: 'https://jiahim.com', route: '/zh/skill/date', author: 'Jia him' })
    expect(findings.map((item) => item.id)).toContain('published-at-invalid')
  })

  it('respects disabled content-signal gates while keeping structural checks', () => {
    const findings = checkArticleSeoGeo({
      title: 'Title', description: 'Summary', date: '', body: '![](/missing-alt.png)'
    }, {
      canonicalOrigin: 'https://jiahim.com', route: '/zh/skill/test', author: ''
    }, {
      requireAuthor: false,
      requirePublishedAt: false,
      requireUpdatedAt: false,
      requireCanonical: false,
      requireImageAlt: false,
      requireCitations: false
    })

    const ids = findings.map((finding) => finding.id)
    for (const id of ['author-missing', 'published-at-invalid', 'image-alt-missing', 'citation-missing']) {
      expect(ids).not.toContain(id)
    }
  })
})
