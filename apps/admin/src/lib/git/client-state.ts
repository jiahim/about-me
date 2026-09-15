import type { GitStatus } from './types'

type PublishStartingStatus = Pick<
  GitStatus,
  'ahead' | 'behind' | 'branch' | 'defaultBranch' | 'remote' | 'upstream'
>

export function publishStartingBranchIssue(status: PublishStartingStatus): string | null {
  const remoteBranch = `${status.remote}/${status.defaultBranch}`

  if (!status.branch || status.branch !== status.defaultBranch) {
    return `当前分支为 ${status.branch || 'detached HEAD'}，发布只允许从 ${status.defaultBranch} 开始。请先在终端运行 git switch ${status.defaultBranch} 后刷新。`
  }

  if (!status.upstream || status.upstream !== remoteBranch) {
    return `本地 ${status.defaultBranch} 的 upstream 不是 ${remoteBranch}。请先在终端运行 git branch --set-upstream-to=${remoteBranch} ${status.defaultBranch} 后刷新。`
  }

  if (status.behind > 0 && status.ahead > 0) {
    return `本地 ${status.defaultBranch} 与 ${remoteBranch} 已经分叉（领先 ${status.ahead}、落后 ${status.behind} 个提交）。请先在终端人工完成 rebase 或 merge，确认工作区安全后再刷新。`
  }

  if (status.behind > 0) {
    return `本地 ${status.defaultBranch} 落后 ${remoteBranch} ${status.behind} 个提交。请先在终端运行 git pull --ff-only ${status.remote} ${status.defaultBranch}；如有本地修改冲突，请先保留修改并人工处理后再刷新。`
  }

  return null
}

export function canPublishArticle(
  status: GitStatus | null,
  articlePath: string | undefined,
  dirty: boolean,
  sessionMediaCount: number
): boolean {
  if (
    !status?.canWrite ||
    publishStartingBranchIssue(status) ||
    !articlePath ||
    dirty
  ) {
    return false
  }

  return (
    sessionMediaCount > 0 ||
    status.changedFiles.some(
      (file) => file.path === articlePath || file.originalPath === articlePath
    )
  )
}

export function canPublishSettings(
  status: GitStatus | null,
  dirty: boolean,
  publishablePathCount: number,
  sessionBlockReason?: string
): boolean {
  return Boolean(
    status?.canWrite &&
    !publishStartingBranchIssue(status) &&
    !dirty &&
    publishablePathCount > 0 &&
    !sessionBlockReason
  )
}

export interface SettingsPublishGuidance {
  tone: 'action' | 'blocked' | 'idle' | 'ready'
  message: string
}

export function settingsPublishGuidance(
  status: GitStatus | null,
  dirty: boolean,
  publishablePathCount: number,
  sessionBlockReason?: string
): SettingsPublishGuidance {
  if (dirty) {
    return {
      tone: 'action',
      message: '尚未发布：请先保存设置，保存完成后才能提交并推送。'
    }
  }

  if (!status) {
    return { tone: 'blocked', message: '暂时无法发布：正在读取 Git 状态。' }
  }

  if (!status.canWrite) {
    return {
      tone: 'blocked',
      message: `暂时无法发布：${status.blockReason || '当前 Git 工作区不可写。'}`
    }
  }

  const startingBranchIssue = publishStartingBranchIssue(status)
  if (startingBranchIssue) {
    return {
      tone: 'blocked',
      message: `暂时无法发布：${startingBranchIssue}`
    }
  }

  if (sessionBlockReason) {
    return { tone: 'blocked', message: `暂时无法发布：${sessionBlockReason}` }
  }

  if (publishablePathCount < 1) {
    return {
      tone: 'idle',
      message: '当前没有待发布的设置更改。修改并保存后即可提交推送。'
    }
  }

  if (status.ahead > 0) {
    return {
      tone: 'action',
      message: `本地 ${status.defaultBranch} 领先 ${status.remote}/${status.defaultBranch} ${status.ahead} 个提交，仍可继续发布；这些提交会与 ${publishablePathCount} 个设置文件一起进入新 Pull Request。`
    }
  }

  return {
    tone: 'ready',
    message: `已准备 ${publishablePathCount} 个设置文件，可以提交并推送。`
  }
}
