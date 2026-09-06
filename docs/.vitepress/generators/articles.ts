import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

import type { PublicArticleRecord, SiteConfiguration } from '@jiahim/site-schema'

export type { PublicArticleRecord } from '@jiahim/site-schema'

function isPublicSection(config: SiteConfiguration, sectionId: string): boolean {
  let current = config.sections.find((section) => section.id === sectionId)
  while (current) {
    if (current.status !== 'active' || !config.locales[current.locale]?.enabled) return false
    current = current.parentId
      ? config.sections.find((candidate) => candidate.id === current?.parentId)
      : undefined
  }
  return true
}

export function publicSections(config: SiteConfiguration) {
  return config.sections.filter((section) => isPublicSection(config, section.id))
}

async function markdownFiles(directory: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const files: string[] = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(target))
    else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') files.push(target)
  }
  return files
}

export async function readPublicArticles(
  config: SiteConfiguration,
  docsRoot: string
): Promise<PublicArticleRecord[]> {
  const activeSections = publicSections(config)
  const candidates = new Set<string>()
  for (const section of activeSections) {
    const directory = path.join(docsRoot, section.directory.replace(/^docs\//, ''))
    for (const file of await markdownFiles(directory)) candidates.add(file)
  }
  const records: PublicArticleRecord[] = []
  for (const file of candidates) {
    const relativePath = path.relative(docsRoot, file).split(path.sep).join('/')
    const repositoryPath = `docs/${relativePath}`
    const section = activeSections
      .filter((candidate) => repositoryPath.startsWith(`${candidate.directory}/`))
      .sort((left, right) => right.directory.length - left.directory.length)[0]
    if (!section) continue
    const parsed = matter(await readFile(file, 'utf8'))
    const attributes = parsed.data as Record<string, unknown>
    const body = parsed.content
    if (attributes.draft === true) continue
    const fallbackTitle = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(file, '.md')
    records.push({
      relativePath,
      route: `/${relativePath.replace(/\.md$/, '')}`,
      title: typeof attributes.title === 'string' ? attributes.title : fallbackTitle,
      description: typeof attributes.description === 'string' ? attributes.description : '',
      body,
      publishedAt: attributes.date instanceof Date ? attributes.date.toISOString().slice(0, 10) : typeof attributes.date === 'string' ? attributes.date : '',
      ...(attributes.updatedAt ? { updatedAt: attributes.updatedAt instanceof Date ? attributes.updatedAt.toISOString().slice(0, 10) : String(attributes.updatedAt) } : {}),
      author: typeof attributes.author === 'string' ? attributes.author : config.author.name,
      sectionName: section.name
    })
  }
  return records.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.route.localeCompare(right.route))
}
