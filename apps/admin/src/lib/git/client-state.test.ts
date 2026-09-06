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
    message: '暂时无法发布：当前分支为 codex/editorial-cms，设置只允许从 main 提交并推送。'
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
})
