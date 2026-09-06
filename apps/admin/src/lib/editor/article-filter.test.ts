import { describe, expect, it } from 'vitest'

import type { ArticleSummary } from '../types'
import { filterArticles } from './article-filter'

const articles: ArticleSummary[] = [
  {
    path: 'docs/zh/essay/travel.md',
    category: 'essay',
    title: '旅行随记',
    date: '2026-08-20',
    description: '海边散步',
    draft: false
  },
  {
    path: 'docs/zh/skill/python-notes.md',
    category: 'skill',
    title: 'Python 踩坑记录',
    date: '2026-08-18',
    description: 'uv 与本地环境',
    draft: false
  }
]

describe('filterArticles', () => {
  it('combines category and case-insensitive text filters', () => {
    expect(filterArticles(articles, 'skill', 'PYTHON')).toEqual([articles[1]])
  })

  it('matches descriptions and repository paths', () => {
    expect(filterArticles(articles, 'all', '海边')).toEqual([articles[0]])
    expect(filterArticles(articles, 'all', 'python-notes')).toEqual([articles[1]])
  })
})
