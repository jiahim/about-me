import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { NormalizedSiteConfiguration } from '@jiahim/site-schema'

import type { PublicArticleRecord } from '../generators/articles'
import { generateAtomFeed } from '../generators/feed'
import { generateLlmsTxt } from '../generators/llms'
import { generateRobots } from '../generators/robots'
import { generateSitemap } from '../generators/sitemap'
import { auditPublicArticles } from './content-audit'

async function controlledWrite(outDir: string, filename: string, contents: string | null) {
  const target = path.join(outDir, filename)
  if (contents === null) {
    await rm(target, { force: true })
    return
  }
  await writeFile(target, contents, 'utf8')
}

export async function generatePublicFiles(
  config: NormalizedSiteConfiguration,
  articles: readonly PublicArticleRecord[],
  outDir: string,
  options: { reportWarning?: (message: string) => void } = {}
): Promise<void> {
  const findings = auditPublicArticles(config, articles)
  const errors = findings.filter((finding) => finding.severity === 'error')
  if (errors.length) {
    throw new Error(`公开内容完整性检查失败：${errors.map((finding) => `${finding.relativePath}:${finding.id}`).join(', ')}`)
  }
  const reportWarning = options.reportWarning ?? console.warn
  findings
    .filter((finding) => finding.severity === 'warning')
    .forEach((finding) => reportWarning(`[content-signal] ${finding.relativePath}:${finding.id} ${finding.message}`))
  await mkdir(outDir, { recursive: true })
  await Promise.all([
    controlledWrite(outDir, 'robots.txt', generateRobots(config)),
    controlledWrite(outDir, 'sitemap.xml', config.seo.sitemap.enabled ? generateSitemap(config, articles) : null),
    controlledWrite(outDir, 'feed.xml', config.seo.feed.enabled ? generateAtomFeed(config, articles) : null),
    controlledWrite(outDir, 'llms.txt', generateLlmsTxt(config, articles))
  ])
}
