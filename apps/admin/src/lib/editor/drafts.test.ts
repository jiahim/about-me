import { beforeEach, describe, expect, it } from 'vitest'

import { clearDraft, draftKey, readDraft, writeDraft } from './drafts'

const snapshot = {
  article: {
    path: 'docs/zh/essay/note.md',
    category: 'essay' as const,
    title: 'Recovered',
    date: '2026-09-01',
    description: '',
    body: 'draft body',
    draft: false,
    isNew: false,
    slug: ''
  },
  sourceFingerprint: 'source-a',
  savedAt: 100
}

describe('draft storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a matching versioned snapshot', () => {
    const key = draftKey(snapshot.article.path)
    writeDraft(localStorage, key, snapshot)
    expect(readDraft(localStorage, key, 'source-a')).toEqual(snapshot)
  })

  it('rejects a snapshot created from a different source version', () => {
    const key = draftKey(snapshot.article.path)
    writeDraft(localStorage, key, snapshot)
    expect(readDraft(localStorage, key, 'source-b')).toBeNull()
  })

  it('ignores malformed data and clears only the requested article', () => {
    const first = draftKey('docs/zh/essay/first.md')
    const second = draftKey('docs/zh/essay/second.md')
    localStorage.setItem(first, '{bad json')
    writeDraft(localStorage, second, snapshot)

    expect(readDraft(localStorage, first, 'source-a')).toBeNull()
    clearDraft(localStorage, first)
    expect(localStorage.getItem(second)).not.toBeNull()
  })
})
