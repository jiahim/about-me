import { randomUUID } from 'node:crypto'

import type { ReadSettingsGitSnapshot, SettingsGitSnapshot } from './session-git'
import { readSettingsGitSnapshot } from './session-git'
import { HttpError } from '../route-utils'

const verifiedSettingsScope = Symbol('verified-settings-publish-scope')
const SETTINGS_ASSET_PREFIX = 'docs/public/images/site/'
const SESSION_TTL_MS = 30 * 60 * 1000

export interface VerifiedSettingsPublishScope {
  readonly sessionId: string
  readonly repositoryRoot: string
  readonly branch: string
  readonly head: string
  readonly baseHash: string
  readonly paths: readonly string[]
  readonly [verifiedSettingsScope]: true
}

export interface SettingsSessionStatus {
  id: string
  expiresAt: number
  publishablePaths: readonly string[]
  rejectedPaths: readonly { path: string; reason: string }[]
  blockReason?: string
}

export interface SettingsSessionSnapshot extends SettingsSessionStatus {
  repositoryRoot: string
  branch: string
  head: string
  baseHash: string
}

interface StoredSession {
  id: string
  snapshot: SettingsGitSnapshot
  originalBaseHash: string
  baseHash: string
  createdAt: number
  lastUsedAt: number
  acceptedPaths: Set<string>
  rejectedPaths: Map<string, string>
  complete: boolean
  mutating: boolean
}

export interface SettingsSessionOperation {
  baseHashBefore: string
  baseHashAfter: string
  changedPaths: readonly string[]
}

export interface SettingsSessionMutation<T> {
  result: T
  baseHashAfter: string
  changedPaths: readonly string[]
}

export class SettingsSessionStore {
  private readonly sessions = new Map<string, StoredSession>()

  constructor(
    private readonly readSnapshot: ReadSettingsGitSnapshot = readSettingsGitSnapshot,
    private readonly now: () => number = Date.now
  ) {}

  async create(baseHash: string): Promise<SettingsSessionStatus> {
    const current = await this.readSnapshot()
    const snapshot: SettingsGitSnapshot = {
      repositoryRoot: current.repositoryRoot,
      branch: current.branch,
      head: current.head,
      dirtyPaths: new Set(current.dirtyPaths)
    }
    const time = this.now()
    const session: StoredSession = {
      id: randomUUID(), snapshot, originalBaseHash: baseHash, baseHash,
      createdAt: time, lastUsedAt: time, acceptedPaths: new Set(), rejectedPaths: new Map(), complete: false, mutating: false
    }
    this.sessions.set(session.id, session)
    return this.publicStatus(session)
  }

  async get(id: string): Promise<SettingsSessionStatus> {
    const session = await this.requireLive(id)
    return this.publicStatus(session)
  }

  async register(id: string, operation: SettingsSessionOperation): Promise<SettingsSessionStatus> {
    const session = await this.requireLive(id)
    return this.applyOperation(session, operation)
  }

  async mutate<T>(
    id: string,
    baseHashBefore: string | undefined,
    mutation: (baseHash: string) => Promise<SettingsSessionMutation<T>>
  ): Promise<{ result: T; session: SettingsSessionStatus }> {
    const session = await this.requireLive(id)
    const expectedBaseHash = baseHashBefore ?? session.baseHash
    if (expectedBaseHash !== session.baseHash) {
      throw new HttpError(409, '设置发布会话的配置版本不一致，请重新加载设置')
    }
    if (session.mutating) throw new HttpError(409, '设置发布会话正在处理另一个操作，请稍后重试')
    session.mutating = true
    try {
      const value = await mutation(expectedBaseHash)
      const status = this.applyOperation(session, {
        baseHashBefore: expectedBaseHash,
        baseHashAfter: value.baseHashAfter,
        changedPaths: value.changedPaths
      })
      return { result: value.result, session: status }
    } finally {
      session.mutating = false
    }
  }

  private applyOperation(session: StoredSession, operation: SettingsSessionOperation): SettingsSessionStatus {
    if (operation.baseHashBefore !== session.baseHash) throw new HttpError(409, '设置发布会话的配置版本不一致，请重新加载设置')
    for (const changedPath of new Set(operation.changedPaths)) {
      if (session.snapshot.dirtyPaths.has(changedPath)) {
        session.rejectedPaths.set(changedPath, '该文件在设置会话创建前已有改动，不能纳入本次发布')
      } else {
        session.acceptedPaths.add(changedPath)
      }
    }
    session.baseHash = operation.baseHashAfter
    session.lastUsedAt = this.now()
    return this.publicStatus(session)
  }

  async registerPaths(id: string, changedPaths: readonly string[]): Promise<SettingsSessionStatus> {
    const session = await this.requireLive(id)
    return this.register(id, { baseHashBefore: session.baseHash, baseHashAfter: session.baseHash, changedPaths })
  }

  async verifyForPublish(id: string, referencedAssets: ReadonlySet<string>, currentBaseHash: string): Promise<VerifiedSettingsPublishScope> {
    const scope = await this.verifyForDiff(id, referencedAssets, currentBaseHash)
    if (!scope.paths.length) throw new HttpError(409, '当前设置会话没有可发布的文件')
    return scope
  }

  async verifyForDiff(id: string, referencedAssets: ReadonlySet<string>, currentBaseHash: string): Promise<VerifiedSettingsPublishScope> {
    const session = await this.requireLive(id)
    if (currentBaseHash !== session.baseHash) {
      throw new HttpError(409, '站点配置已在当前设置会话之外发生变化，请重新加载设置')
    }
    const paths = [...session.acceptedPaths].filter((candidate) => {
      if (!candidate.startsWith(SETTINGS_ASSET_PREFIX) || referencedAssets.has(candidate)) return true
      session.rejectedPaths.set(candidate, '资源未被当前已保存配置引用，已排除')
      return false
    }).sort()
    return {
      sessionId: session.id,
      repositoryRoot: session.snapshot.repositoryRoot,
      branch: session.snapshot.branch,
      head: session.snapshot.head,
      baseHash: session.baseHash,
      paths,
      [verifiedSettingsScope]: true
    }
  }

  async complete(id: string): Promise<void> {
    const session = await this.requireLive(id)
    session.complete = true
  }

  private publicStatus(session: StoredSession): SettingsSessionStatus {
    const rejectedPaths = [...session.rejectedPaths].map(([path, reason]) => ({ path, reason }))
    return {
      id: session.id,
      expiresAt: session.lastUsedAt + SESSION_TTL_MS,
      publishablePaths: [...session.acceptedPaths].filter((path) => !session.rejectedPaths.has(path)).sort(),
      rejectedPaths,
      ...(rejectedPaths.length ? { blockReason: rejectedPaths.map((item) => `${item.path}：${item.reason}`).join('；') } : {})
    }
  }

  private async requireLive(id: string): Promise<StoredSession> {
    const session = this.sessions.get(id)
    if (!session || session.complete) throw new HttpError(409, '设置发布会话已失效，请重新加载设置')
    if (this.now() - session.lastUsedAt > SESSION_TTL_MS) {
      this.sessions.delete(id)
      throw new HttpError(409, '设置发布会话已过期，请重新加载设置；浏览器草稿仍会保留')
    }
    const current = await this.readSnapshot()
    if (current.repositoryRoot !== session.snapshot.repositoryRoot || current.branch !== session.snapshot.branch || current.head !== session.snapshot.head) {
      throw new HttpError(409, '仓库、分支或 HEAD 已变化，设置发布会话已失效')
    }
    session.lastUsedAt = this.now()
    return session
  }
}
