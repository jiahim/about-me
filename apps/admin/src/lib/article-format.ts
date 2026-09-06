import matter from 'gray-matter'
import type {
  NormalizedSiteConfiguration,
  SiteConfiguration
} from '@jiahim/site-schema'

import { getCategoryForPath } from './content-config'
import { loadSiteConfiguration } from './site-configuration'
import type { Article, ArticleInput, ArticleSummary } from './types'

interface DraftMetadata {
  draft: boolean
  pullRequestNumber?: number
  pullRequestUrl?: string
}

function stringValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10)
  }

  return typeof value === 'string' ? value.trim() : ''
}

function dateFromFilename(articlePath: string): string {
  return articlePath.match(/\/(\d{4}-\d{2}-\d{2})(?:-|\.md$)/)?.[1] ?? ''
}

function splitTitleHeading(content: string): { heading: string; body: string } {
  const normalized = content.replace(/^\uFEFF/, '').trimStart()
  const match = normalized.match(/^#\s+(.+?)(?:\r?\n|$)/)

  if (!match) {
    return { heading: '', body: normalized.trim() }
  }

  return {
    heading: match[1].trim(),
    body: normalized.slice(match[0].length).trim()
  }
}

export function parseArticle(
  raw: string,
  articlePath: string,
  draftMetadata: DraftMetadata = { draft: false },
  config: SiteConfiguration | NormalizedSiteConfiguration = loadSiteConfiguration()
): Article {
  const parsed = matter(raw)
  const category = getCategoryForPath(articlePath, config)

  if (!category) {
    throw new Error(`无法识别文章分类：${articlePath}`)
  }

  const { heading, body } = splitTitleHeading(parsed.content)
  const fallbackTitle = articlePath.split('/').at(-1)?.replace(/\.md$/, '') || '未命名文章'
  const title = stringValue(parsed.data.title) || heading || fallbackTitle

  return {
    path: articlePath,
    category: category.id,
    title,
    date: stringValue(parsed.data.date) || dateFromFilename(articlePath),
    description: stringValue(parsed.data.description),
    ...(stringValue(parsed.data.updatedAt) ? { updatedAt: stringValue(parsed.data.updatedAt) } : {}),
    ...(stringValue(parsed.data.canonical) ? { canonical: stringValue(parsed.data.canonical) } : {}),
    ...(stringValue(parsed.data.author) ? { author: stringValue(parsed.data.author) } : {}),
    body,
    ...draftMetadata
  }
}

export function summarizeArticle(article: Article): ArticleSummary {
  const { body: _body, ...summary } = article
  return summary
}

export function serializeArticle(existingRaw: string | undefined, input: ArticleInput): string {
  const previousData = existingRaw ? matter(existingRaw).data : {}
  const title = input.title.trim()

  if (!title) {
    throw new Error('文章标题不能为空')
  }

  const data: Record<string, unknown> = {
    ...previousData,
    title,
    cms: true
  }

  if (input.date) {
    data.date = input.date
  } else {
    delete data.date
  }

  if (input.description.trim()) {
    data.description = input.description.trim()
  } else {
    delete data.description
  }

  const body = input.body.trim()
  const content = body ? `# ${title}\n\n${body}\n` : `# ${title}\n`
  return matter.stringify(content, data)
}
