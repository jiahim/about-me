import type { GitStatus } from './types'

export function canPublishArticle(
  status: GitStatus | null,
  articlePath: string | undefined,
  dirty: boolean,
  sessionMediaCount: number
): boolean {
  if (
    !status?.canWrite ||
    status.branch !== status.defaultBranch ||
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
    status.branch === status.defaultBranch &&
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

  if (status.branch !== status.defaultBranch) {
    return {
      tone: 'blocked',
      message: `暂时无法发布：当前分支为 ${status.branch || 'detached HEAD'}，设置只允许从 ${status.defaultBranch} 提交并推送。`
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

  return {
    tone: 'ready',
    message: `已准备 ${publishablePathCount} 个设置文件，可以提交并推送。`
  }
}
