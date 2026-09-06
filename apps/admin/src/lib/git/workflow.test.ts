import { describe, expect, it } from 'vitest'

import {
  assertManagedPullRequest,
  assertMergeLocalState,
  assertPublishStartingBranch,
  buildContentBranchName,
  buildSettingsBranchName,
  buildManagedMergeArgs,
  findUniqueContentBranchName,
  normalizeCommitMessage,
  parseManagedPullRequestInfo,
  validatePublishPaths,
  verifyManagedPullRequestForMerge
} from './workflow'
import type { GitStatus } from './types'

const managedPullRequest = {
  number: 42,
  url: 'https://github.com/jiahim/about-me/pull/42',
  state: 'OPEN',
  isDraft: false,
  baseRefName: 'main',
  headRefName: 'content/2026-09-01-note',
  isCrossRepository: false,
  author: { login: 'jiahim' },
  mergeStateStatus: 'CLEAN',
  statusCheckRollup: [
    {
      __typename: 'CheckRun' as const,
      name: 'build',
      status: 'COMPLETED',
      conclusion: 'SUCCESS'
    }
  ],
  headRefOid: '0123456789abcdef0123456789abcdef01234567'
}

const mergeStatus: GitStatus = {
  branch: 'content/2026-09-01-note',
  defaultBranch: 'main',
  remote: 'origin',
  upstream: 'origin/content/2026-09-01-note',
  ahead: 0,
  behind: 0,
  operation: 'none',
  canWrite: true,
  conflicts: [],
  changedFiles: []
}

describe('Git publish helpers', () => {
  it('builds a stable content branch from date and article filename', () => {
    expect(
      buildContentBranchName('2026-09-01', 'docs/zh/essay/my-note.md')
    ).toBe('content/2026-09-01-my-note')
  })

  it('builds a stable managed branch for site settings', () => {
    expect(buildSettingsBranchName('2026-09-05')).toBe('content/2026-09-05-site-settings')
  })

  it('accepts only the current article and article-media paths', () => {
    expect(
      validatePublishPaths('docs/zh/essay/a.md', [
        'docs/public/images/articles/2026/09/a-123.png'
      ])
    ).toEqual([
      'docs/zh/essay/a.md',
      'docs/public/images/articles/2026/09/a-123.png'
    ])
    expect(() =>
      validatePublishPaths('docs/zh/essay/a.md', ['package.json'])
    ).toThrow('媒体路径不在允许目录')
  })

  it('adds the human attribution prefix exactly once', () => {
    expect(normalizeCommitMessage('docs: update note')).toBe(
      '[Human] docs: update note'
    )
    expect(normalizeCommitMessage('[Human] docs: update note')).toBe(
      '[Human] docs: update note'
    )
  })

  it('starts a managed publish only from the default branch', () => {
    const synchronizedDefaultBranch = {
      branch: 'main',
      defaultBranch: 'main',
      remote: 'origin',
      upstream: 'origin/main',
      ahead: 0,
      behind: 0
    }
    expect(() =>
      assertPublishStartingBranch(synchronizedDefaultBranch)
    ).not.toThrow()
    expect(() =>
      assertPublishStartingBranch({
        ...synchronizedDefaultBranch,
        branch: 'codex/editorial-cms'
      })
    ).toThrow('只能从默认分支开始')
    expect(() =>
      assertPublishStartingBranch({
        ...synchronizedDefaultBranch,
        branch: 'content/old-note'
      })
    ).toThrow('只能从默认分支开始')
    expect(() => assertPublishStartingBranch({
      ...synchronizedDefaultBranch,
      upstream: undefined
    })).toThrow(/upstream/)
    expect(() => assertPublishStartingBranch({
      ...synchronizedDefaultBranch,
      upstream: 'fork/main'
    })).toThrow(/upstream/)
    expect(() => assertPublishStartingBranch({
      ...synchronizedDefaultBranch,
      ahead: 1
    })).toThrow(/远端同步/)
    expect(() => assertPublishStartingBranch({
      ...synchronizedDefaultBranch,
      behind: 1
    })).toThrow(/远端同步/)
  })

  it('avoids a branch name that still exists on the remote', async () => {
    const commands: string[][] = []
    const run = async (args: readonly string[]) => {
      commands.push([...args])
      const ref = args.at(-1)

      if (args[0] === 'ls-remote' && ref === 'refs/heads/content/note') {
        return { stdout: 'abc\trefs/heads/content/note\n', stderr: '', exitCode: 0 }
      }

      return { stdout: '', stderr: '', exitCode: args[0] === 'ls-remote' ? 2 : 1 }
    }

    await expect(
      findUniqueContentBranchName('content/note', 'origin', run)
    ).resolves.toBe('content/note-2')
    expect(commands).toContainEqual([
      'ls-remote',
      '--exit-code',
      '--heads',
      'origin',
      'refs/heads/content/note'
    ])
  })

  it('accepts only the current user managed PR with successful checks', () => {
    expect(() =>
      assertManagedPullRequest(managedPullRequest, {
        currentBranch: 'content/2026-09-01-note',
        currentLogin: 'jiahim',
        defaultBranch: 'main',
        pullRequestNumber: 42
      })
    ).not.toThrow()
  })

  it.each([
    [{ state: 'CLOSED' }, 'OPEN'],
    [{ isDraft: true }, '草稿'],
    [{ baseRefName: 'develop' }, '目标分支'],
    [{ headRefName: 'codex/editorial-cms' }, '受管内容分支'],
    [{ isCrossRepository: true }, '外部 fork'],
    [{ author: { login: 'contributor' } }, '作者'],
    [{ mergeStateStatus: 'BLOCKED' }, '不可安全合并'],
    [
      {
        statusCheckRollup: [
          {
            __typename: 'CheckRun',
            name: 'build',
            status: 'IN_PROGRESS',
            conclusion: null
          }
        ]
      },
      '检查尚未成功'
    ]
  ])('rejects an unmanaged PR variant: %j', (change, message) => {
    expect(() =>
      assertManagedPullRequest(
        { ...managedPullRequest, ...change },
        {
          currentBranch: 'content/2026-09-01-note',
          currentLogin: 'jiahim',
          defaultBranch: 'main',
          pullRequestNumber: 42
        }
      )
    ).toThrow(message)
  })

  it('rejects a managed PR that is not the current branch PR', () => {
    expect(() =>
      assertManagedPullRequest(managedPullRequest, {
        currentBranch: 'content/another-note',
        currentLogin: 'jiahim',
        defaultBranch: 'main',
        pullRequestNumber: 42
      })
    ).toThrow('当前分支')
  })

  it('rejects PR metadata whose number differs from the requested PR', () => {
    expect(() =>
      assertManagedPullRequest(managedPullRequest, {
        currentBranch: 'content/2026-09-01-note',
        currentLogin: 'jiahim',
        defaultBranch: 'main',
        pullRequestNumber: 99
      })
    ).toThrow('编号')
  })

  it('strictly parses required PR metadata and fails closed', () => {
    expect(parseManagedPullRequestInfo(managedPullRequest)).toEqual(managedPullRequest)
    expect(() =>
      parseManagedPullRequestInfo({ ...managedPullRequest, isDraft: undefined })
    ).toThrow('isDraft')
    expect(() =>
      parseManagedPullRequestInfo({ ...managedPullRequest, isCrossRepository: 0 })
    ).toThrow('isCrossRepository')
    expect(() =>
      parseManagedPullRequestInfo({ ...managedPullRequest, statusCheckRollup: false })
    ).toThrow('statusCheckRollup')
    expect(() =>
      parseManagedPullRequestInfo({ ...managedPullRequest, author: null })
    ).toThrow('author')
    expect(() =>
      parseManagedPullRequestInfo({ ...managedPullRequest, headRefOid: 'not-a-sha' })
    ).toThrow('headRefOid')
  })

  it('binds merge to the verified repository and head commit', () => {
    expect(buildManagedMergeArgs(managedPullRequest, 'jiahim/about-me')).toEqual([
      'pr',
      'merge',
      '42',
      '--repo',
      'jiahim/about-me',
      '--squash',
      '--delete-branch',
      '--match-head-commit',
      '0123456789abcdef0123456789abcdef01234567'
    ])
  })

  it('requires a clean synchronized local branch bound to the displayed and fresh PR OID', () => {
    const oid = managedPullRequest.headRefOid
    expect(() => assertMergeLocalState(mergeStatus, oid, oid, oid)).not.toThrow()
    expect(() => assertMergeLocalState({ ...mergeStatus, changedFiles: [{ path: 'config/site.config.json', indexStatus: '.', worktreeStatus: 'M', kind: 'ordinary' }] }, oid, oid, oid)).toThrow(/工作区或暂存区/)
    expect(() => assertMergeLocalState({ ...mergeStatus, upstream: undefined }, oid, oid, oid)).toThrow(/upstream/)
    expect(() => assertMergeLocalState({ ...mergeStatus, ahead: 1 }, oid, oid, oid)).toThrow(/未与远端同步/)
    expect(() => assertMergeLocalState(mergeStatus, 'f'.repeat(40), oid, oid)).toThrow(/已变化/)
    expect(() => assertMergeLocalState(mergeStatus, oid, 'f'.repeat(40), oid)).toThrow(/已变化/)
  })

  it('reloads the current gh identity and PR before merge', async () => {
    const commands: string[][] = []
    const runGh = async (args: readonly string[]) => {
      commands.push([...args])

      if (args[0] === 'api') {
        return { stdout: 'jiahim\n', stderr: '', exitCode: 0 }
      }

      if (args[0] === 'repo') {
        return { stdout: 'jiahim/about-me\n', stderr: '', exitCode: 0 }
      }

      return {
        stdout: JSON.stringify(managedPullRequest),
        stderr: '',
        exitCode: 0
      }
    }

    await expect(
      verifyManagedPullRequestForMerge(42, {
        getStatus: async () => mergeStatus,
        runGh
      })
    ).resolves.toMatchObject({
      repository: 'jiahim/about-me',
      pullRequest: { number: 42 }
    })
    expect(commands).toEqual([
      ['api', 'user', '--jq', '.login'],
      ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
      [
        'pr',
        'view',
        '42',
        '--repo',
        'jiahim/about-me',
        '--json',
        'number,url,state,isDraft,baseRefName,headRefName,headRefOid,isCrossRepository,author,mergeStateStatus,statusCheckRollup'
      ]
    ])
  })

  it('stops before merge when the reloaded PR is not managed', async () => {
    const runGh = async (args: readonly string[]) => ({
      stdout:
        args[0] === 'api'
          ? 'jiahim\n'
          : args[0] === 'repo'
            ? 'jiahim/about-me\n'
            : JSON.stringify({ ...managedPullRequest, author: { login: 'other' } }),
      stderr: '',
      exitCode: 0
    })

    await expect(
      verifyManagedPullRequestForMerge(42, {
        getStatus: async () => mergeStatus,
        runGh
      })
    ).rejects.toThrow('作者')
  })
})
