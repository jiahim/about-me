import { expect, it } from 'vitest'

import type { GitStatus } from './types'
import { canPublishArticle, canPublishSettings, settingsPublishGuidance } from './client-state'

const status: GitStatus = {
  branch: 'main',
  defaultBranch: 'main',
  remote: 'origin',
  upstream: 'origin/main',
  ahead: 0,
  behind: 0,
  operation: 'none',
  canWrite: true,
  conflicts: [],
  changedFiles: [
    {
      path: 'docs/zh/essay/a.md',
      indexStatus: '.',
      worktreeStatus: 'M',
      kind: 'ordinary'
    }
  ]
}

it('enables publishing only for a saved article with scoped changes', () => {
  expect(canPublishArticle(status, 'docs/zh/essay/a.md', false, 0)).toBe(true)
  expect(canPublishArticle({ ...status, ahead: 3 }, 'docs/zh/essay/a.md', false, 0)).toBe(true)
  expect(canPublishArticle({ ...status, behind: 1 }, 'docs/zh/essay/a.md', false, 0)).toBe(false)
  expect(canPublishArticle(status, 'docs/zh/essay/b.md', false, 0)).toBe(false)
  expect(canPublishArticle(status, 'docs/zh/essay/b.md', false, 1)).toBe(true)
  expect(canPublishArticle(status, 'docs/zh/essay/a.md', true, 0)).toBe(false)
  expect(
    canPublishArticle(
      { ...status, branch: 'codex/editorial-cms' },
      'docs/zh/essay/a.md',
      false,
      0
    )
  ).toBe(false)
})

it('enables settings publishing only for a clean, trusted session scope on the default branch', () => {
  expect(canPublishSettings(status, false, 1)).toBe(true)
  expect(canPublishSettings({ ...status, ahead: 3 }, false, 1)).toBe(true)
  expect(canPublishSettings({ ...status, behind: 1 }, false, 1)).toBe(false)
  expect(canPublishSettings({ ...status, ahead: 2, behind: 1 }, false, 1)).toBe(false)
  expect(canPublishSettings(status, true, 1)).toBe(false)
  expect(canPublishSettings(status, false, 0)).toBe(false)
  expect(canPublishSettings(status, false, 1, 'pre-existing change')).toBe(false)
  expect(canPublishSettings({ ...status, branch: 'codex/editorial-cms' }, false, 1)).toBe(false)
})

it('explains the next settings publishing action in user-facing priority order', () => {
  expect(settingsPublishGuidance(status, true, 1)).toEqual({
    tone: 'action',
    message: '尚未发布：请先保存设置，保存完成后才能提交并推送。'
  })
  expect(settingsPublishGuidance({ ...status, branch: 'codex/editorial-cms' }, false, 1)).toEqual({
    tone: 'blocked',
    message: '暂时无法发布：当前分支为 codex/editorial-cms，发布只允许从 main 开始。请先在终端运行 git switch main 后刷新。'
  })
  expect(settingsPublishGuidance({ ...status, behind: 2 }, false, 1)).toEqual({
    tone: 'blocked',
    message: '暂时无法发布：本地 main 落后 origin/main 2 个提交。请先在终端运行 git pull --ff-only origin main；如有本地修改冲突，请先保留修改并人工处理后再刷新。'
  })
  expect(settingsPublishGuidance({ ...status, ahead: 3, behind: 1 }, false, 1)).toEqual({
    tone: 'blocked',
    message: '暂时无法发布：本地 main 与 origin/main 已经分叉（领先 3、落后 1 个提交）。请先在终端人工完成 rebase 或 merge，确认工作区安全后再刷新。'
  })
  expect(settingsPublishGuidance(status, false, 1, '存在会话外配置改动')).toEqual({
    tone: 'blocked',
    message: '暂时无法发布：存在会话外配置改动'
  })
  expect(settingsPublishGuidance(status, false, 0)).toEqual({
    tone: 'idle',
    message: '当前没有待发布的设置更改。修改并保存后即可提交推送。'
  })
  expect(settingsPublishGuidance(status, false, 2)).toEqual({
    tone: 'ready',
    message: '已准备 2 个设置文件，可以提交并推送。'
  })
  expect(settingsPublishGuidance({ ...status, ahead: 3 }, false, 2)).toEqual({
    tone: 'action',
    message: '本地 main 领先 origin/main 3 个提交，仍可继续发布；这些提交会与 2 个设置文件一起进入新 Pull Request。'
  })
})
