import { randomUUID } from 'node:crypto'
import {
  lstat,
  open,
  readFile,
  realpath,
  rename,
  unlink
} from 'node:fs/promises'
import path from 'node:path'

import {
  parseSiteConfigurationWithReport,
  type MigrationWarning,
  type NormalizedSiteConfiguration,
  type SiteConfiguration
} from '@jiahim/site-schema'

import { hashContent } from './hash'
import { assertGenericSectionUpdate } from './sections'
import { findRepositoryRoot } from '../repository-root'

export const SITE_CONFIG_PATH = 'config/site.config.json' as const

export interface ValidationIssue {
  path: string
  code: string
  message: string
}

export interface SettingsValidation {
  valid: boolean
  issues: ValidationIssue[]
}

export interface SettingsSnapshot {
  config: NormalizedSiteConfiguration
  baseHash: string
  migrationWarnings: readonly MigrationWarning[]
  normalizedJson: string
  validation: SettingsValidation
}

export interface SettingsValidationResult {
  config?: NormalizedSiteConfiguration
  migrationWarnings?: readonly MigrationWarning[]
  normalizedJson?: string
  validation: SettingsValidation
}

interface SettingsFileSystem {
  lstat: typeof lstat
  open: typeof open
  readFile: (target: string, encoding: 'utf8') => Promise<string>
  realpath: typeof realpath
  rename: typeof rename
  unlink: typeof unlink
  isProcessAlive: (pid: number) => boolean
}

const defaultFileSystem: SettingsFileSystem = {
  lstat,
  open,
  readFile: (target, encoding) => readFile(target, encoding),
  realpath,
  rename,
  unlink,
  isProcessAlive(pid) {
    try {
      process.kill(pid, 0)
      return true
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== 'ESRCH'
    }
  }
}

const saveQueues = new Map<string, Promise<void>>()

export class SettingsConflictError extends Error {}

export class SettingsValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super('站点设置未通过校验')
  }
}

function normalizedJson(config: NormalizedSiteConfiguration): string {
  return `${JSON.stringify(config, null, 2)}\n`
}

function issuePath(parts: readonly PropertyKey[]): string {
  if (!parts.length) return '$'
  return parts.reduce<string>((result, part) => {
    if (typeof part === 'number') return `${result}[${part}]`
    return `${result}.${String(part)}`
  }, '$')
}

function validationIssues(error: unknown): ValidationIssue[] {
  const possibleIssues =
    typeof error === 'object' && error !== null && 'issues' in error
      ? (error as { issues?: unknown }).issues
      : undefined
  if (Array.isArray(possibleIssues)) {
    return possibleIssues.map((issue) => {
      const value = issue as { path?: PropertyKey[]; code?: string; message?: string }
      return {
        path: issuePath(value.path ?? []),
        code: value.code ?? 'invalid',
        message: value.message ?? '配置字段无效'
      }
    })
  }
  return [
    {
      path: '$',
      code: 'custom',
      message: error instanceof Error ? error.message : '配置无效'
    }
  ]
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

export class SettingsRepository {
  private readonly repositoryRoot: string
  private readonly fileSystem: SettingsFileSystem

  constructor(
    repositoryRoot: string = findRepositoryRoot(),
    fileSystem: Partial<SettingsFileSystem> = {}
  ) {
    this.repositoryRoot = path.resolve(repositoryRoot)
    this.fileSystem = { ...defaultFileSystem, ...fileSystem }
  }

  private get configDirectory(): string {
    return path.join(this.repositoryRoot, 'config')
  }

  private get configPath(): string {
    return path.join(this.repositoryRoot, SITE_CONFIG_PATH)
  }

  private async assertSafeConfigPath(): Promise<{
    mode: number
    configDirectoryRealPath: string
  }> {
    const [rootRealPath, configDirectoryMetadata, configMetadata] = await Promise.all([
      this.fileSystem.realpath(this.repositoryRoot),
      this.fileSystem.lstat(this.configDirectory),
      this.fileSystem.lstat(this.configPath)
    ])
    if (configDirectoryMetadata.isSymbolicLink() || configMetadata.isSymbolicLink()) {
      throw new Error('站点配置路径不能包含符号链接')
    }
    if (!configDirectoryMetadata.isDirectory() || !configMetadata.isFile()) {
      throw new Error('站点配置路径类型无效')
    }
    const [directoryRealPath, configRealPath] = await Promise.all([
      this.fileSystem.realpath(this.configDirectory),
      this.fileSystem.realpath(this.configPath)
    ])
    if (
      !isWithin(rootRealPath, directoryRealPath) ||
      !isWithin(directoryRealPath, configRealPath)
    ) {
      throw new Error('站点配置路径越出当前仓库')
    }
    return { mode: configMetadata.mode, configDirectoryRealPath: directoryRealPath }
  }

  validate(input: unknown): SettingsValidationResult {
    try {
      const parsed = parseSiteConfigurationWithReport(input)
      return {
        config: parsed.config,
        migrationWarnings: parsed.warnings,
        normalizedJson: normalizedJson(parsed.config),
        validation: { valid: true, issues: [] }
      }
    } catch (error) {
      return {
        validation: { valid: false, issues: validationIssues(error) }
      }
    }
  }

  async read(): Promise<SettingsSnapshot> {
    await this.assertSafeConfigPath()
    const raw = await this.fileSystem.readFile(this.configPath, 'utf8')
    let input: unknown
    try {
      input = JSON.parse(raw)
    } catch {
      throw new Error(`站点配置 ${this.configPath} 不是合法 JSON`)
    }
    const result = this.validate(input)
    if (!result.config || !result.normalizedJson) {
      throw new SettingsValidationError(result.validation.issues)
    }
    return {
      config: result.config,
      baseHash: hashContent(raw),
      migrationWarnings: result.migrationWarnings ?? [],
      normalizedJson: result.normalizedJson,
      validation: result.validation
    }
  }

  async save(
    input: { config: unknown; baseHash: string },
    options: { allowSectionChanges?: boolean } = {}
  ): Promise<SettingsSnapshot & { changedPaths: string[] }> {
    return this.withSaveLock(async () => {
      const safePath = await this.assertSafeConfigPath()
      return this.withFileLock(safePath.configDirectoryRealPath, async () => {
        const { mode } = await this.assertSafeConfigPath()
        const raw = await this.fileSystem.readFile(this.configPath, 'utf8')
        if (hashContent(raw) !== input.baseHash) {
          throw new SettingsConflictError('站点设置已被其他进程修改，请重新加载后人工合并')
        }
        const result = this.validate(input.config)
        if (!result.config || !result.normalizedJson) {
          throw new SettingsValidationError(result.validation.issues)
        }
        if (!options.allowSectionChanges) {
          const currentResult = this.validate(JSON.parse(raw))
          if (!currentResult.config) {
            throw new SettingsValidationError(currentResult.validation.issues)
          }
          try {
            assertGenericSectionUpdate(
              currentResult.config as SiteConfiguration,
              result.config as SiteConfiguration
            )
          } catch (error) {
            throw new SettingsValidationError([{
              path: '$.sections',
              code: 'unsafe_transition',
              message: error instanceof Error
                ? error.message
                : '栏目变更必须使用栏目管理向导'
            }])
          }
        }
        const changedPaths = raw === result.normalizedJson ? [] : [SITE_CONFIG_PATH]
        if (changedPaths.length) {
          await this.atomicWrite(result.normalizedJson, mode, input.baseHash)
        }
        return {
          config: result.config,
          baseHash: hashContent(result.normalizedJson),
          migrationWarnings: result.migrationWarnings ?? [],
          normalizedJson: result.normalizedJson,
          validation: result.validation,
          changedPaths
        }
      })
    })
  }

  private async withFileLock<T>(
    lockDirectory: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockPath = path.join(lockDirectory, '.site.config.lock')
    const token = randomUUID()
    const lease = await this.acquireFileLock(lockPath, token)
    try {
      return await operation()
    } finally {
      await this.releaseFileLock(lease, token)
    }
  }

  private async acquireFileLock(
    lockPath: string,
    token: string,
    depth = 0
  ): Promise<{
    handle: Awaited<ReturnType<typeof open>>
    ownedPath: string
    staleMarkers: Array<{ path: string; identity: string }>
  }> {
    if (depth > 8) {
      throw new SettingsConflictError('设置锁恢复次数过多，请稍后重试')
    }
    try {
      const handle = await this.fileSystem.open(lockPath, 'wx', 0o600)
      try {
        await handle.writeFile(
          `${JSON.stringify({ token, pid: process.pid, createdAt: Date.now() })}\n`,
          'utf8'
        )
        await handle.sync()
      } catch (error) {
        await handle.close().catch(() => undefined)
        await this.fileSystem.unlink(lockPath).catch(() => undefined)
        throw error
      }
      return {
        handle,
        ownedPath: lockPath,
        staleMarkers: []
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const existing = await this.inspectLock(lockPath)
      if (!existing) {
        return this.acquireFileLock(lockPath, token, depth + 1)
      }
      if (existing.stale) {
        const recoveryName = `.site.config.recovery-${hashContent(
          `${lockPath}\0${existing.identity}`
        ).slice(0, 32)}.lock`
        const recovery = await this.acquireFileLock(
          path.join(path.dirname(lockPath), recoveryName),
          token,
          depth + 1
        )
        const current = await this.inspectLock(lockPath)
        if (
          !current ||
          !current.stale ||
          current.identity !== existing.identity
        ) {
          await this.releaseFileLock(recovery, token)
          throw new SettingsConflictError(
            '设置锁已被其他进程接管，请重新加载后重试'
          )
        }
        recovery.staleMarkers.unshift({ path: lockPath, identity: existing.identity })
        return recovery
      }
      throw new SettingsConflictError('另一个进程正在保存站点设置，请稍后重试')
    }
  }

  private async releaseFileLock(
    lease: {
      handle: Awaited<ReturnType<typeof open>>
      ownedPath: string
      staleMarkers: Array<{ path: string; identity: string }>
    },
    token: string
  ): Promise<void> {
    await lease.handle.close().catch(() => undefined)
    for (const stale of lease.staleMarkers) {
      if ((await this.inspectLock(stale.path))?.identity === stale.identity) {
        await this.fileSystem.unlink(stale.path).catch(() => undefined)
      }
    }
    if (await this.lockBelongsTo(lease.ownedPath, token)) {
      await this.fileSystem.unlink(lease.ownedPath).catch(() => undefined)
    }
  }

  private async inspectLock(lockPath: string): Promise<{
    identity: string
    token?: string
    stale: boolean
  } | null> {
    try {
      const metadata = await this.fileSystem.lstat(lockPath)
      if (metadata.isSymbolicLink() || !metadata.isFile()) return null
      try {
        const value = JSON.parse(await this.fileSystem.readFile(lockPath, 'utf8')) as {
          token?: unknown
          pid?: unknown
          createdAt?: unknown
        }
        if (
          typeof value.token === 'string' &&
          Number.isInteger(value.pid) &&
          (value.pid as number) > 0 &&
          typeof value.createdAt === 'number'
        ) {
          return {
            identity: `token:${value.token}`,
            token: value.token,
            stale: !this.fileSystem.isProcessAlive(value.pid as number)
          }
        }
      } catch {
        // 刚创建但尚未写完的锁按 inode 和年龄保守判断。
      }
      return {
        identity: `inode:${metadata.dev}:${metadata.ino}`,
        stale: Date.now() - metadata.mtimeMs > 5 * 60_000
      }
    } catch {
      return null
    }
  }

  private async lockBelongsTo(lockPath: string, token: string): Promise<boolean> {
    return (await this.inspectLock(lockPath))?.token === token
  }

  private async withSaveLock<T>(operation: () => Promise<T>): Promise<T> {
    const key = this.repositoryRoot
    const previous = saveQueues.get(key) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    const queued = previous.then(() => current)
    saveQueues.set(key, queued)
    await previous
    try {
      return await operation()
    } finally {
      release()
      if (saveQueues.get(key) === queued) saveQueues.delete(key)
    }
  }

  private async atomicWrite(
    contents: string,
    mode: number,
    expectedHash: string
  ): Promise<void> {
    const temporaryPath = path.join(
      this.configDirectory,
      `.site.config.${process.pid}.${randomUUID()}.tmp`
    )
    let handle: Awaited<ReturnType<typeof open>> | undefined
    let renamed = false
    try {
      handle = await this.fileSystem.open(temporaryPath, 'wx', mode & 0o777)
      await handle.writeFile(contents, 'utf8')
      await handle.sync()
      await handle.close()
      handle = undefined
      await this.assertSafeConfigPath()
      const latest = await this.fileSystem.readFile(this.configPath, 'utf8')
      if (hashContent(latest) !== expectedHash) {
        throw new SettingsConflictError(
          '站点设置在保存期间被外部修改，请重新加载后人工合并'
        )
      }
      await this.fileSystem.rename(temporaryPath, this.configPath)
      renamed = true
      try {
        const directoryHandle = await this.fileSystem.open(this.configDirectory, 'r')
        try {
          await directoryHandle.sync()
        } finally {
          await directoryHandle.close().catch(() => undefined)
        }
      } catch {
        // rename 是提交点；目录 fsync 不受所有平台支持，不能把已保存结果报告为失败。
      }
    } finally {
      if (handle) await handle.close().catch(() => undefined)
      if (!renamed) {
        await this.fileSystem.unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error
        })
      }
    }
  }
}
