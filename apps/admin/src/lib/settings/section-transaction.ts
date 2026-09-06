import { link, lstat, mkdir, open, readFile, realpath, rm, rmdir, unlink } from 'node:fs/promises'
import path from 'node:path'

import type { SiteConfiguration } from '@jiahim/site-schema'

import type { SettingsRepository, SettingsSnapshot } from './repository'
import {
  planSectionArchive,
  planSectionCreation,
  type CreateSectionInput
} from './sections'
import { countSectionArticles } from './section-files'

interface SettingsStore {
  read(): Promise<SettingsSnapshot>
  save(input: { config: unknown; baseHash: string }, options?: { allowSectionChanges?: boolean }): Promise<SettingsSnapshot & { changedPaths: string[] }>
}

export interface CreateSectionRequest extends CreateSectionInput {
  baseHash: string
}

export class SectionTransaction {
  constructor(
    private readonly repositoryRoot: string,
    private readonly settings: SettingsStore
  ) {}

  private absolute(relativePath: string): string {
    const root = path.resolve(this.repositoryRoot)
    const target = path.resolve(root, relativePath)
    const relative = path.relative(root, target)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('栏目路径越出仓库')
    }
    return target
  }

  private async assertSafeDirectoryAncestors(relativePath: string): Promise<void> {
    const root = path.resolve(this.repositoryRoot)
    const realRoot = await realpath(root)
    let current = root
    for (const segment of relativePath.split('/')) {
      current = path.join(current, segment)
      try {
        const metadata = await lstat(current)
        if (metadata.isSymbolicLink()) throw new Error('栏目路径祖先不能包含符号链接')
        if (!metadata.isDirectory()) throw new Error('栏目路径祖先必须是目录')
        const currentRealPath = await realpath(current)
        const relative = path.relative(realRoot, currentRealPath)
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('栏目路径越出仓库')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') break
        throw error
      }
    }
  }

  private async assertSafeConfigDirectory(): Promise<void> {
    const root = path.resolve(this.repositoryRoot)
    const configDirectory = this.absolute('config')
    const metadata = await lstat(configDirectory)
    if (metadata.isSymbolicLink()) throw new Error('配置目录不能是符号链接')
    if (!metadata.isDirectory()) throw new Error('配置路径不是目录')

    const [realRoot, realConfigDirectory] = await Promise.all([
      realpath(root),
      realpath(configDirectory)
    ])
    const relative = path.relative(realRoot, realConfigDirectory)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('配置目录越出仓库')
    }
  }

  private async withTransactionLock<T>(operation: () => Promise<T>, allowRecovery = true): Promise<T> {
    await this.assertSafeConfigDirectory()
    const lockPath = this.absolute('config/.section-transaction.lock')
    let handle: Awaited<ReturnType<typeof open>>
    try {
      handle = await open(lockPath, 'wx', 0o600)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST' && allowRecovery) {
        const identity = await lstat(lockPath)
        const raw = await readFile(lockPath, 'utf8').catch(() => '')
        const pid = Number.parseInt(raw.trim(), 10)
        const validPid = Number.isInteger(pid) && pid > 0
        let alive = true
        if (validPid) {
          try { process.kill(pid, 0) } catch (probeError) { alive = (probeError as NodeJS.ErrnoException).code !== 'ESRCH' }
        }
        const staleInvalidLock = !validPid && Date.now() - identity.mtimeMs > 5 * 60_000
        if ((validPid && !alive) || staleInvalidLock) {
          const current = await lstat(lockPath)
          if (current.dev === identity.dev && current.ino === identity.ino) await unlink(lockPath)
          return this.withTransactionLock(operation, false)
        }
      }
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('另一个栏目操作正在进行，请稍后重试')
      throw error
    }
    const identity = await handle.stat()
    try {
      await handle.writeFile(`${process.pid}\n`, 'utf8')
      await handle.sync()
      return await operation()
    } finally {
      await handle.close().catch(() => undefined)
      try {
        const current = await lstat(lockPath)
        if (current.dev === identity.dev && current.ino === identity.ino) await unlink(lockPath)
      } catch {
        // 已被外部清理或替换时不删除新的锁。
      }
    }
  }

  async create(input: CreateSectionRequest) {
    return this.withTransactionLock(async () => {
      const snapshot = await this.settings.read()
      if (snapshot.baseHash !== input.baseHash) {
        throw new Error('站点设置已被其他进程修改，请重新加载后重试')
      }
      const planned = planSectionCreation(snapshot.config as SiteConfiguration, input)
      const indexRelativePath = `${planned.section.directory}/index.md`
      const directory = this.absolute(planned.section.directory)
      const indexPath = this.absolute(indexRelativePath)
      const temporaryPath = `${indexPath}.${process.pid}.${Date.now()}.tmp`

      await this.assertSafeDirectoryAncestors(planned.section.directory)

      try {
        await lstat(directory)
        throw new Error('目标栏目目录已存在')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }

      let published = false
      try {
      await mkdir(directory, { recursive: true })
      const directoryMetadata = await lstat(directory)
      if (directoryMetadata.isSymbolicLink() || !directoryMetadata.isDirectory()) throw new Error('栏目目录类型无效')
      const realRoot = await realpath(this.repositoryRoot)
      const realDirectory = await realpath(directory)
      const realRelative = path.relative(realRoot, realDirectory)
      if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) throw new Error('栏目目录越出仓库')
      const handle = await open(temporaryPath, 'wx', 0o644)
      try {
        await handle.writeFile(planned.indexContents, 'utf8')
        await handle.sync()
      } finally {
        await handle.close()
      }
      await link(temporaryPath, indexPath)
      await unlink(temporaryPath)
      published = true
      const saved = await this.settings.save({
        config: planned.config,
        baseHash: input.baseHash
      }, { allowSectionChanges: true })
      return {
        ...saved,
        section: planned.section,
        changedPaths: ['config/site.config.json', indexRelativePath]
      }
      } catch (error) {
        await rm(temporaryPath, { force: true }).catch(() => undefined)
        if (published) await rm(indexPath, { force: true }).catch(() => undefined)
        await rmdir(directory).catch(() => undefined)
        throw error
      }
    })
  }

  async archive(sectionId: string, baseHash: string) {
    return this.withTransactionLock(async () => {
      const snapshot = await this.settings.read()
      if (snapshot.baseHash !== baseHash) {
        throw new Error('站点设置已被其他进程修改，请重新加载后重试')
      }
      const section = snapshot.config.sections.find((candidate) => candidate.id === sectionId)
      if (!section) throw new Error('栏目不存在')
      const articleCount = await countSectionArticles(this.repositoryRoot, section.directory)
        .catch((error: NodeJS.ErrnoException) => error.code === 'ENOENT' ? 0 : Promise.reject(error))
      const config = planSectionArchive(snapshot.config as SiteConfiguration, sectionId)
      const saved = await this.settings.save({ config, baseHash }, { allowSectionChanges: true })
      return { ...saved, articleCount }
    })
  }

  async previewArchive(sectionId: string) {
    const snapshot = await this.settings.read()
    const section = snapshot.config.sections.find((candidate) => candidate.id === sectionId)
    if (!section) throw new Error('栏目不存在')
    const articleCount = await countSectionArticles(this.repositoryRoot, section.directory)
      .catch((error: NodeJS.ErrnoException) => error.code === 'ENOENT' ? 0 : Promise.reject(error))
    return { articleCount }
  }
}

export function createSectionTransaction(
  repositoryRoot: string,
  settings: SettingsRepository
): SectionTransaction {
  return new SectionTransaction(repositoryRoot, settings)
}
