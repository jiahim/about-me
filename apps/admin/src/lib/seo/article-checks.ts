import {
  auditArticleContentSignals,
  type CheckableArticle,
  type ContentSignalFinding,
  type ContentSignalPolicy
} from '@jiahim/site-schema'

export type ArticleFinding = ContentSignalFinding
export type { CheckableArticle }

export interface ArticleCheckContext {
  canonicalOrigin: string
  route: string
  author: string
  canonicalGenerated?: boolean
}

function finding(id: string, severity: ArticleFinding['severity'], field: string, message: string, line?: number): ArticleFinding {
  return { id, severity, field, message, ...(line === undefined ? {} : { line }) }
}

const defaultPolicy: ContentSignalPolicy = {
  requireAuthor: true,
  requirePublishedAt: true,
  requireUpdatedAt: true,
  requireCanonical: true,
  requireImageAlt: true,
  requireCitations: true
}

export function checkArticleSeoGeo(article: CheckableArticle, context: ArticleCheckContext, policy: ContentSignalPolicy = defaultPolicy): ArticleFinding[] {
  const findings: ArticleFinding[] = [...auditArticleContentSignals(policy, article, {
    ...context,
    canonicalGenerated: context.canonicalGenerated ?? true
  })]
  if (!article.title.trim()) findings.push(finding('title-missing', 'error', 'title', '补充清晰的文章标题。'))
  if (!article.description.trim()) findings.push(finding('description-missing', 'warning', 'description', '补充摘要，帮助读者和搜索系统理解文章。'))
  else if (article.description.length > 180) findings.push(finding('description-long', 'warning', 'description', '摘要超过 180 个字符，建议精简。'))

  let previousHeading = 1
  const lines = article.body.split(/\r?\n/)
  let fenced = false
  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      return
    }
    if (fenced) return
    const heading = line.match(/^(#{1,6})\s+\S/)
    if (heading) {
      const level = heading[1].length
      if (level === 1) findings.push(finding('body-h1-present', 'warning', 'body', '正文不要重复一级标题；标题字段会渲染 H1。', index + 1))
      if (level > previousHeading + 1) findings.push(finding('heading-jump', 'warning', 'body', `标题层级从 H${previousHeading} 跳到 H${level}，请补齐层级。`, index + 1))
      previousHeading = level
    }
    for (const match of line.matchAll(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g)) {
      const label = match[1].trim()
      const href = match[2].trim()
      if (/^https?:\/\//i.test(label)) findings.push(finding('link-text-bare-url', 'warning', 'body', '链接文本应描述目标内容，不要直接使用裸 URL。', index + 1))
      try {
        const url = href.startsWith('/') ? new URL(href, context.canonicalOrigin) : new URL(href)
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported')
      } catch {
        findings.push(finding('link-protocol-invalid', 'error', 'body', '引用链接必须使用 HTTPS、HTTP 或规范站内路径。', index + 1))
      }
    }
  })
  return findings
}
