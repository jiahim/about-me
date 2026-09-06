import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  createDefaultSiteConfiguration,
  parseSiteConfiguration
} from '@jiahim/site-schema'
import { afterEach, describe, expect, it } from 'vitest'

import { LocalContentRepository } from './local-repository'
import { articleFingerprint } from './editor/drafts'

const temporaryDirectories: string[] = []

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

async function createRepositoryDirectories(repository: string): Promise<void> {
  await mkdir(path.join(repository, 'docs/.vitepress'), { recursive: true })
  for (const section of ['book', 'skill', 'essay', 'work']) {
    await mkdir(path.join(repository, `docs/zh/${section}`), { recursive: true })
  }
}

describe('LocalContentRepository 动态栏目', () => {
  it('嵌套栏目只扫描一次并按最长目录归属', async () => {
    const repository = await temporaryDirectory('site-sections-')
    await createRepositoryDirectories(repository)
    await mkdir(path.join(repository, 'docs/zh/book/vue'), { recursive: true })
    await writeFile(path.join(repository, 'docs/zh/book/note.md'), '# 读书\n')
    await writeFile(path.join(repository, 'docs/zh/book/vue/patch.md'), '# Patch\n')

    const config = createDefaultSiteConfiguration()
    config.sections.push({
      ...config.sections[0],
      id: 'book-vue',
      name: 'Vue',
      directory: 'docs/zh/book/vue',
      route: '/zh/book/vue/',
      parentId: 'book'
    })
    const content = new LocalContentRepository(
      repository,
      parseSiteConfiguration(config)
    )

    const articles = await content.listArticles()
    expect(articles.map((article) => article.path).sort()).toEqual([
      'docs/zh/book/note.md',
      'docs/zh/book/vue/patch.md'
    ])
    expect(
      articles.find((article) => article.path.endsWith('patch.md'))?.category
    ).toBe('book-vue')
  })

  it('拒绝配置栏目目录通过符号链接越出仓库', async () => {
    const repository = await temporaryDirectory('site-symlink-repository-')
    const outside = await temporaryDirectory('site-symlink-outside-')
    await createRepositoryDirectories(repository)
    await rm(path.join(repository, 'docs/zh/book'), { recursive: true })
    await writeFile(path.join(outside, 'escape.md'), '# Escape\n')
    await symlink(outside, path.join(repository, 'docs/zh/book'))

    const content = new LocalContentRepository(
      repository,
      parseSiteConfiguration(createDefaultSiteConfiguration())
    )
    await expect(content.listArticles()).rejects.toThrow(/符号链接|越出/)
  })

  it('拒绝文章子路径和媒体父目录中的嵌套符号链接', async () => {
    const repository = await temporaryDirectory('site-nested-symlink-')
    const outside = await temporaryDirectory('site-nested-outside-')
    await createRepositoryDirectories(repository)
    await writeFile(path.join(repository, 'docs/zh/book/note.md'), '# Note\n')
    await writeFile(path.join(outside, 'escape.md'), '# Escape\n')
    await symlink(outside, path.join(repository, 'docs/zh/book/link'))
    await mkdir(path.join(repository, 'docs/public/images'), { recursive: true })
    await symlink(outside, path.join(repository, 'docs/public/images/articles'))

    const content = new LocalContentRepository(
      repository,
      parseSiteConfiguration(createDefaultSiteConfiguration())
    )
    await expect(
      content.getArticle('docs/zh/book/link/escape.md')
    ).rejects.toThrow(/符号链接|越出/)
    await expect(
      content.uploadMedia('docs/zh/book/note.md', {
        name: 'image.png',
        type: 'image/png',
        bytes: new Uint8Array([1])
      })
    ).rejects.toThrow(/符号链接|越出/)
  })

  it('递归扫描时一致排除归档子栏目，但仍允许明确读取旧文章', async () => {
    const repository = await temporaryDirectory('site-archived-child-')
    await createRepositoryDirectories(repository)
    await mkdir(path.join(repository, 'docs/zh/book/old'), { recursive: true })
    await writeFile(path.join(repository, 'docs/zh/book/old/legacy.md'), '# Legacy\n')
    await mkdir(path.join(repository, 'docs/zh/book/old/child'), { recursive: true })
    await writeFile(
      path.join(repository, 'docs/zh/book/old/child/descendant.md'),
      '# Descendant\n'
    )

    const config = createDefaultSiteConfiguration()
    config.sections.push({
      ...config.sections[0],
      id: 'book-old',
      name: '旧书',
      directory: 'docs/zh/book/old',
      route: '/zh/book/old/',
      parentId: 'book',
      status: 'archived'
    })
    config.sections.push({
      ...config.sections[0],
      id: 'book-old-child',
      name: '旧书子栏目',
      directory: 'docs/zh/book/old/child',
      route: '/zh/book/old/child/',
      parentId: 'book-old',
      status: 'active'
    })
    const content = new LocalContentRepository(
      repository,
      parseSiteConfiguration(config)
    )

    await expect(content.listArticles()).resolves.toEqual([])
    await expect(
      content.getArticle('docs/zh/book/old/legacy.md')
    ).resolves.toMatchObject({ category: 'book-old', title: 'Legacy' })
  })

  it('rejects stale article saves and publishes only one concurrent create', async () => {
    const repository = await temporaryDirectory('site-article-conflict-')
    await createRepositoryDirectories(repository)
    const articlePath = 'docs/zh/skill/existing.md'
    await writeFile(path.join(repository, articlePath), '---\ntitle: Existing\ndate: 2026-01-01\n---\n# Existing\n\nBefore\n')
    const content = new LocalContentRepository(repository, parseSiteConfiguration(createDefaultSiteConfiguration()))
    const original = await content.getArticle(articlePath)
    await writeFile(path.join(repository, articlePath), '---\ntitle: External\ndate: 2026-01-01\n---\n# External\n')
    await expect(content.saveArticle({ ...original, title: 'Stale', baseHash: articleFingerprint(original) })).rejects.toThrow(/其他窗口修改/)
    expect(await readFile(path.join(repository, articlePath), 'utf8')).toContain('External')

    const input = { category: 'skill', slug: 'same', title: 'Same', date: '2026-01-02', description: '', body: '' }
    const results = await Promise.allSettled([content.createArticle(input), content.createArticle(input)])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })
})
