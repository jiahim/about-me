import { existsSync } from 'node:fs'
import {
  lstat,
  link,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm
} from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import type { NormalizedSiteConfiguration } from '@jiahim/site-schema'

import { parseArticle, serializeArticle, summarizeArticle } from './article-format'
import { articleFingerprint } from './editor/drafts'
import {
  assertArticlePath,
  buildArticlePath,
  categoryDefinitions,
  getCategoryForPath
} from './content-config'
import type { ContentRepository, MediaUpload } from './content-repository'
import { createMediaDestination } from './media'
import { findRepositoryRoot } from './repository-root'
import { loadSiteConfiguration } from './site-configuration'
import type {
  Article,
  ArticleInput,
  ArticleSummary,
  MediaResult,
  NewArticleInput,
  PublishResult,
  SaveResult
} from './types'

export { findRepositoryRoot } from './repository-root'

function sortArticles(articles: ArticleSummary[]): ArticleSummary[] {
  return articles.sort((left, right) => {
    const byDate = right.date.localeCompare(left.date)
    return byDate || left.title.localeCompare(right.title, 'zh-CN')
  })
}

async function atomicWrite(target: string, contents: string | Uint8Array, createOnly = false): Promise<void> {
  const temporary = `${target}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  let published = false
  try {
    handle = await open(temporary, 'wx', 0o644)
    await handle.writeFile(contents)
    await handle.sync()
    await handle.close()
    handle = undefined
    if (createOnly) {
      await link(temporary, target)
      await rm(temporary)
    } else {
      await rename(temporary, target)
    }
    published = true
  } finally {
    if (handle) await handle.close().catch(() => undefined)
    if (!published) await rm(temporary, { force: true }).catch(() => undefined)
  }
}

const contentQueues = new Map<string, Promise<void>>()

async function withContentLock<T>(target: string, operation: () => Promise<T>): Promise<T> {
  const previous = contentQueues.get(target) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => { release = resolve })
  const queued = previous.then(() => current)
  contentQueues.set(target, queued)
  await previous
  try {
    return await operation()
  } finally {
    release()
    if (contentQueues.get(target) === queued) contentQueues.delete(target)
  }
}

export class ArticleConflictError extends Error {}

async function walkMarkdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return walkMarkdown(entryPath)
      }

      return entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md'
        ? [entryPath]
        : []
    })
  )

  return nested.flat()
}

export class LocalContentRepository implements ContentRepository {
  constructor(
    private readonly repositoryRoot = findRepositoryRoot(),
    private readonly config: NormalizedSiteConfiguration = loadSiteConfiguration()
  ) {}

  private absolutePath(repositoryPath: string): string {
    const absolute = path.resolve(this.repositoryRoot, repositoryPath)
    const rootPrefix = `${this.repositoryRoot}${path.sep}`

    if (!absolute.startsWith(rootPrefix)) {
      throw new Error('文件路径越出了当前仓库')
    }

    return absolute
  }

  private async assertSafeExistingDirectory(repositoryPath: string): Promise<void> {
    await this.assertSafeRepositoryLocation(repositoryPath, false)
  }

  private async assertSafeRepositoryLocation(
    repositoryPath: string,
    allowMissingLeaf: boolean
  ): Promise<void> {
    this.absolutePath(repositoryPath)
    const realRepository = await realpath(this.repositoryRoot)
    let current = this.repositoryRoot

    for (const segment of repositoryPath.split('/')) {
      current = path.join(current, segment)
      let metadata
      try {
        metadata = await lstat(current)
      } catch (error) {
        if (
          allowMissingLeaf &&
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          return
        }
        throw error
      }
      if (metadata.isSymbolicLink()) {
        throw new Error('仓库内受管路径不能包含符号链接')
      }
    }

    const resolved = await realpath(current)
    if (
      resolved !== realRepository &&
      !resolved.startsWith(`${realRepository}${path.sep}`)
    ) {
      throw new Error('受管路径通过符号链接越出了当前仓库')
    }
  }

  private async assertSafeArticleLocation(
    articlePath: string,
    allowMissingLeaf: boolean
  ): Promise<void> {
    const category = getCategoryForPath(articlePath, this.config)
    if (!category) throw new Error('文章路径不在允许的内容目录中')
    await this.assertSafeRepositoryLocation(articlePath, allowMissingLeaf)
  }

  async listArticles(): Promise<ArticleSummary[]> {
    const visibleCategories = categoryDefinitions(this.config)
    const visibleCategoryIds = new Set(
      visibleCategories.map((category) => category.id)
    )
    const directories = visibleCategories
      .map((category) => category.directory)
      .filter(
        (directory, _index, all) =>
          !all.some(
            (candidate) =>
              candidate !== directory && directory.startsWith(`${candidate}/`)
          )
      )
    await Promise.all(
      directories.map((directory) => this.assertSafeExistingDirectory(directory))
    )
    const paths = (
      await Promise.all(
        directories.map((directory) => walkMarkdown(this.absolutePath(directory)))
      )
    ).flat()

    const visiblePaths = paths.filter((absolutePath) => {
      const repositoryPath = path
        .relative(this.repositoryRoot, absolutePath)
        .split(path.sep)
        .join('/')
      const section = this.config.sections.find(
        (candidate) => candidate.id === getCategoryForPath(repositoryPath, this.config)?.id
      )
      return Boolean(section && visibleCategoryIds.has(section.id))
    })
    const articles = await Promise.all(
      visiblePaths.map(async (absolutePath) => {
        const repositoryPath = path.relative(this.repositoryRoot, absolutePath).split(path.sep).join('/')
        const raw = await readFile(absolutePath, 'utf8')
        return summarizeArticle(
          parseArticle(raw, repositoryPath, { draft: false }, this.config)
        )
      })
    )

    return sortArticles(articles)
  }

  async getArticle(articlePath: string): Promise<Article> {
    assertArticlePath(articlePath, this.config)
    await this.assertSafeArticleLocation(articlePath, false)
    const raw = await readFile(this.absolutePath(articlePath), 'utf8')
    return parseArticle(raw, articlePath, { draft: false }, this.config)
  }

  async createArticle(input: NewArticleInput): Promise<SaveResult> {
    const articlePath = buildArticlePath(
      input.category,
      input.date,
      input.slug,
      this.config
    )
    const absolutePath = this.absolutePath(articlePath)

    return withContentLock(absolutePath, async () => {
      if (existsSync(absolutePath)) throw new ArticleConflictError('同名文章已经存在')
      return this.writeArticle({ ...input, path: articlePath, baseHash: '' }, true)
    })
  }

  async saveArticle(input: ArticleInput): Promise<SaveResult> {
    assertArticlePath(input.path, this.config)
    await this.assertSafeArticleLocation(input.path, true)
    const absolutePath = this.absolutePath(input.path)
    return withContentLock(absolutePath, async () => {
      if (!existsSync(absolutePath)) throw new ArticleConflictError('文章已不存在，请重新加载列表')
      const existingRaw = await readFile(absolutePath, 'utf8')
      const currentFingerprint = articleFingerprint(parseArticle(existingRaw, input.path, { draft: false }, this.config))
      if (currentFingerprint !== input.baseHash) throw new ArticleConflictError('文章已被其他窗口修改，请重新加载后人工合并')
      return this.writeArticle(input, false, existingRaw)
    })
  }

  private async writeArticle(input: ArticleInput, createOnly: boolean, existingRaw?: string): Promise<SaveResult> {
    const absolutePath = this.absolutePath(input.path)
    const raw = serializeArticle(existingRaw, input)

    await mkdir(path.dirname(absolutePath), { recursive: true })
    try {
      await atomicWrite(absolutePath, raw, createOnly)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ArticleConflictError('同名文章已经存在')
      throw error
    }

    return {
      article: parseArticle(raw, input.path, { draft: false }, this.config),
      message: '已保存到当前 worktree；公开站点刷新后即可预览。'
    }
  }

  async publishArticle(articlePath: string): Promise<PublishResult> {
    assertArticlePath(articlePath, this.config)
    return { message: '本地模式没有远端发布步骤；文件已保存在当前 worktree。' }
  }

  async uploadMedia(articlePath: string, upload: MediaUpload): Promise<MediaResult> {
    assertArticlePath(articlePath, this.config)
    await this.assertSafeArticleLocation(articlePath, false)
    const destination = createMediaDestination(upload)
    await this.assertSafeRepositoryLocation(destination.path, true)
    const absolutePath = this.absolutePath(destination.path)

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await this.assertSafeRepositoryLocation(
      path.posix.dirname(destination.path),
      false
    )
    await atomicWrite(absolutePath, upload.bytes)

    return {
      ...destination,
      message: '图片已保存到当前 worktree。'
    }
  }
}
