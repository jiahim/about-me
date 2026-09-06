import {
  buildSectionForest,
  findSectionForArticlePath,
  listCreatableSections,
  type NormalizedSiteConfiguration,
  type SectionNode,
  type SiteConfiguration
} from '@jiahim/site-schema'

import { loadSiteConfiguration } from './site-configuration'
import type { CategoryDefinition, CategoryId } from './types'

type SiteConfig = SiteConfiguration | NormalizedSiteConfiguration

function flattenCategoryTree(
  nodes: readonly SectionNode[],
  depth = 0
): CategoryDefinition[] {
  return nodes.flatMap((node) => [
    {
      id: node.section.id,
      label: node.section.name,
      description: node.section.description ?? '',
      directory: node.section.directory,
      parentId: node.section.parentId,
      depth,
      status: node.section.status as 'active' | 'hidden'
    },
    ...flattenCategoryTree(node.children, depth + 1)
  ])
}

export function categoryDefinitions(
  config: SiteConfig = loadSiteConfiguration(),
  locale = config.site.defaultLocale
): readonly CategoryDefinition[] {
  return flattenCategoryTree(
    buildSectionForest(config, { locale, surface: 'editor' })
  )
}

export function isCategoryId(
  value: string,
  config: SiteConfig = loadSiteConfiguration()
): value is CategoryId {
  return listCreatableSections(config, config.site.defaultLocale).some(
    (section) => section.id === value
  )
}

export function getCategory(
  id: CategoryId,
  config: SiteConfig = loadSiteConfiguration()
): CategoryDefinition {
  const category = categoryDefinitions(config).find((item) => item.id === id)
  if (!category) throw new Error('未知或已归档的文章分类')
  return category
}

export function getCategoryForPath(
  articlePath: string,
  config: SiteConfig = loadSiteConfiguration()
): CategoryDefinition | undefined {
  const section = findSectionForArticlePath(config, articlePath)
  if (!section) return undefined

  return {
    id: section.id,
    label: section.name,
    description: section.description ?? '',
    directory: section.directory,
    parentId: section.parentId,
    depth: 0,
    status: section.status === 'archived' ? 'hidden' : section.status
  }
}

export function isArticlePath(
  articlePath: string,
  config: SiteConfig = loadSiteConfiguration()
): boolean {
  if (
    !articlePath.endsWith('.md') ||
    articlePath.includes('..') ||
    articlePath.includes('\\') ||
    articlePath.startsWith('/') ||
    articlePath.endsWith('/index.md')
  ) {
    return false
  }
  const section = findSectionForArticlePath(config, articlePath)
  return Boolean(
    section &&
      section.locale === config.site.defaultLocale &&
      config.locales[section.locale]?.enabled
  )
}

export function assertArticlePath(
  articlePath: string,
  config: SiteConfig = loadSiteConfiguration()
): void {
  if (!isArticlePath(articlePath, config)) {
    throw new Error('文章路径不在允许的内容目录中')
  }
}

export function sanitizeSlug(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80)
}

export function buildArticlePath(
  categoryId: CategoryId,
  date: string,
  slugInput: string,
  config: SiteConfig = loadSiteConfiguration()
): string {
  const section = listCreatableSections(config, config.site.defaultLocale).find(
    (item) => item.id === categoryId
  )
  if (!section) throw new Error('该栏目不能新建文章')

  const slug = sanitizeSlug(slugInput)
  const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''
  if (!slug) throw new Error('请填写有效的文件名')

  const filename = normalizedDate ? `${normalizedDate}-${slug}.md` : `${slug}.md`
  const articlePath = `${section.directory}/${filename}`
  assertArticlePath(articlePath, config)
  return articlePath
}

export function articlePreviewPath(articlePath: string): string {
  return `/${articlePath.replace(/^docs\//, '').replace(/\.md$/, '')}`
}
