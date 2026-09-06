import { describe, expect, it } from 'vitest'

import { auditArticleContentSignals } from './content-signals.js'

const disabled = {
  requireAuthor: false,
  requirePublishedAt: false,
  requireUpdatedAt: false,
  requireCanonical: false,
  requireImageAlt: false,
  requireCitations: false
}

describe('content signal policy', () => {
  it('emits no policy finding when all signals are disabled', () => {
    expect(auditArticleContentSignals(disabled, {
      title: '', description: '', date: '', body: '![](/image.png)'
    }, {
      canonicalOrigin: 'https://jiahim.com',
      route: '/zh/skill/test',
      author: '',
      canonicalGenerated: false
    })).toEqual([])
  })

  it('accepts a generated canonical and gates author and dates independently', () => {
    const findings = auditArticleContentSignals({
      ...disabled,
      requireAuthor: true,
      requirePublishedAt: true,
      requireUpdatedAt: true,
      requireCanonical: true
    }, {
      title: 'Test', description: '', date: '', body: ''
    }, {
      canonicalOrigin: 'https://jiahim.com',
      route: '/zh/skill/test',
      author: '',
      canonicalGenerated: true
    })

    expect(findings.map((finding) => finding.id)).toEqual([
      'author-missing',
      'published-at-invalid',
      'updated-at-missing'
    ])
  })

  it('requires a parseable off-site HTTP citation when enabled', () => {
    const findings = auditArticleContentSignals({
      ...disabled,
      requireCitations: true
    }, {
      title: 'Test', description: '', date: '2026-01-01',
      body: '[internal](/zh/book/) [bad](javascript:alert(1)) [same](https://jiahim.com/about)'
    }, {
      canonicalOrigin: 'https://jiahim.com',
      route: '/zh/skill/test',
      author: 'Jia him',
      canonicalGenerated: true
    })

    expect(findings).toEqual([
      expect.objectContaining({ id: 'citation-missing', severity: 'warning' })
    ])
  })
})
