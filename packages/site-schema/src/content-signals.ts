import type { SiteConfiguration } from './schema.js'

export interface ContentSignalFinding {
  id: string
  severity: 'error' | 'warning' | 'info'
  field: string
  message: string
  line?: number
}

export interface CheckableArticle {
  title: string
  description: string
  date: string
  updatedAt?: string
  canonical?: string
  body: string
}

export interface ContentSignalContext {
  canonicalOrigin: string
  route: string
  author: string
  canonicalGenerated: boolean
}

export type ContentSignalPolicy = SiteConfiguration['geo']['contentSignals']

function finding(id: string, severity: ContentSignalFinding['severity'], field: string, message: string, line?: number): ContentSignalFinding {
  return { id, severity, field, message, ...(line === undefined ? {} : { line }) }
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function hasExternalCitation(body: string, canonicalOrigin: string): boolean {
  let canonicalHost: string
  try {
    canonicalHost = new URL(canonicalOrigin).host
  } catch {
    return false
  }
  for (const match of body.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    try {
      const url = new URL(match[1])
      if (['http:', 'https:'].includes(url.protocol) && url.host !== canonicalHost) return true
    } catch {
      // Malformed and relative links are not external citations.
    }
  }
  return false
}

export function auditArticleContentSignals(
  policy: ContentSignalPolicy,
  article: CheckableArticle,
  context: ContentSignalContext
): readonly ContentSignalFinding[] {
  const findings: ContentSignalFinding[] = []

  if (policy.requireAuthor && !context.author.trim()) {
    findings.push(finding('author-missing', 'error', 'author', '配置公开作者信息。'))
  }
  if (policy.requirePublishedAt && !validDate(article.date)) {
    findings.push(finding('published-at-invalid', 'error', 'date', '发布时间必须是有效的 YYYY-MM-DD 日期。'))
  }
  if (policy.requireUpdatedAt) {
    if (!article.updatedAt) {
      findings.push(finding('updated-at-missing', 'warning', 'updatedAt', '补充更新时间，帮助读者判断内容时效。'))
    } else if (!validDate(article.updatedAt)) {
      findings.push(finding('updated-at-invalid', 'warning', 'updatedAt', '更新时间必须是有效的 YYYY-MM-DD 日期。'))
    } else if (validDate(article.date) && article.updatedAt < article.date) {
      findings.push(finding('updated-before-published', 'error', 'updatedAt', '更新时间不能早于发布时间。'))
    }
  }
  if (policy.requireCanonical) {
    if (article.canonical) {
      try {
        const canonical = new URL(article.canonical)
        const expectedOrigin = new URL(context.canonicalOrigin).origin
        if (canonical.origin !== expectedOrigin) findings.push(finding('canonical-origin-mismatch', 'error', 'canonical', 'Canonical 必须使用站点公开域名。'))
        if (canonical.pathname.replace(/\/$/, '') !== context.route.replace(/\/$/, '')) findings.push(finding('canonical-route-mismatch', 'error', 'canonical', 'Canonical 路径必须与文章公开路由一致。'))
      } catch {
        findings.push(finding('canonical-invalid', 'error', 'canonical', 'Canonical 不是有效 URL。'))
      }
    } else if (!context.canonicalGenerated) {
      findings.push(finding('canonical-missing', 'error', 'canonical', '文章缺少 Canonical，且站点未启用自动生成。'))
    }
  }
  if (policy.requireImageAlt) {
    article.body.split(/\r?\n/).forEach((line, index) => {
      for (const match of line.matchAll(/!\[([^\]]*)\]\([^)]+\)/g)) {
        if (!match[1].trim()) findings.push(finding('image-alt-missing', 'warning', 'body', '图片缺少替代文本。', index + 1))
      }
    })
  }
  if (policy.requireCitations && !hasExternalCitation(article.body, context.canonicalOrigin)) {
    findings.push(finding('citation-missing', 'warning', 'body', '补充至少一个可验证的站外来源链接。'))
  }

  return findings
}
