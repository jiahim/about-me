import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

import { assertArticlePath } from '../content-config'
import { runCommand, runGit } from './command'
import { parsePorcelainV2 } from './status'
import type {
  GitHistoryEntry,
  GitOperation,
  GitStatus,
  PullRequestSummary
} from './types'
import type { CommandResult } from './command'
import { validateSettingsPublishPaths } from './settings-scope'
import { findRepositoryRoot } from '../repository-root'

type GitRunner = (args: readonly string[]) => Promise<CommandResult>

export interface SettingsDiffResult {
  text: string
  files: Array<{
    path: string
    kind: 'text' | 'binary'
    status: 'added' | 'modified' | 'deleted' | 'renamed'
    size?: number
  }>
}

async function getCurrentPullRequest(
  branch: string | null
): Promise<PullRequestSummary | undefined> {
  if (!branch) return undefined

  const result = await runCommand(
    'gh',
    ['pr', 'view', branch, '--json', 'number,url,state,baseRefName,headRefName,headRefOid,mergeStateStatus'],
    { allowFailure: true, timeoutMs: 10_000 }
  )
  if (result.exitCode !== 0) return undefined

  try {
    return JSON.parse(result.stdout) as PullRequestSummary
  } catch {
    return undefined
  }
}

async function getOperation(): Promise<GitOperation> {
  const candidates: Array<[string, GitOperation]> = [
    ['MERGE_HEAD', 'merge'],
    ['rebase-merge', 'rebase'],
    ['rebase-apply', 'rebase'],
    ['CHERRY_PICK_HEAD', 'cherry-pick']
  ]

  for (const [gitPath, operation] of candidates) {
    const result = await runGit(['rev-parse', '--git-path', gitPath])
    if (existsSync(result.stdout.trim())) return operation
  }

  return 'none'
}

async function getDefaultBranch(): Promise<string> {
  const symbolic = await runGit(
    ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'],
    { allowFailure: true }
  )

  if (symbolic.exitCode === 0) {
    return symbolic.stdout.trim().replace(/^origin\//, '')
  }

  return 'main'
}

export async function getGitStatus(): Promise<GitStatus> {
  const [statusResult, remoteResult, operation, defaultBranch] = await Promise.all([
    runGit(['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all']),
    runGit(['remote'], { allowFailure: true }),
    getOperation(),
    getDefaultBranch()
  ])
  const parsed = parsePorcelainV2(statusResult.stdout)
  const pullRequest = await getCurrentPullRequest(parsed.branch)
  const remotes = remoteResult.stdout.split(/\r?\n/).filter(Boolean)
  const remote = remotes.includes('origin') ? 'origin' : remotes[0] || null
  let blockReason: string | undefined

  if (!parsed.branch) blockReason = '当前仓库处于 detached HEAD，请先在终端切换到分支。'
  else if (parsed.conflicts.length) blockReason = '仓库存在冲突，请先在终端解决。'
  else if (operation !== 'none') blockReason = '仓库正在进行 ' + operation + '，请先在终端完成。'
  else if (!remote) blockReason = '仓库没有可用远端，无法推送。'

  return {
    ...parsed,
    defaultBranch,
    remote,
    operation,
    canWrite: !blockReason,
    ...(pullRequest ? { pullRequest } : {}),
    ...(blockReason ? { blockReason } : {})
  }
}

export async function getArticleDiff(articlePath: string): Promise<string> {
  assertArticlePath(articlePath)
  const [staged, worktree] = await Promise.all([
    runGit(['diff', '--cached', '--no-ext-diff', '--', articlePath]),
    runGit(['diff', '--no-ext-diff', '--', articlePath])
  ])
  const sections = []

  if (staged.stdout) sections.push('--- 已暂存 ---\n' + staged.stdout)
  if (worktree.stdout) sections.push('--- 工作区 ---\n' + worktree.stdout)

  return sections.join('\n') || '当前文章没有可显示的差异。'
}

export async function getArticleHistory(articlePath: string): Promise<GitHistoryEntry[]> {
  assertArticlePath(articlePath)
  const result = await runGit([
    'log',
    '--follow',
    '--format=%H%x1f%h%x1f%aI%x1f%an%x1f%s',
    '-n',
    '30',
    '--',
    articlePath
  ])

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, authoredAt, author, subject] = line.split('\x1f')
      return { sha, shortSha, authoredAt, author, subject }
    })
}

function parseNameStatus(value: string): 'added' | 'modified' | 'deleted' | 'renamed' {
  const code = value.trim().charAt(0)
  if (code === 'A') return 'added'
  if (code === 'D') return 'deleted'
  if (code === 'R') return 'renamed'
  return 'modified'
}

function isBinaryNumstat(value: string): boolean {
  return value.split(/\0|\r?\n/).some((line) => line.startsWith('-\t-\t'))
}

async function readOptionalFileSize(candidate: string): Promise<number | undefined> {
  try {
    return (await stat(path.join(findRepositoryRoot(), candidate))).size
  } catch {
    return undefined
  }
}

export async function getSettingsDiff(
  requestedPaths: readonly string[],
  run: GitRunner = (args) => runGit(args, { allowFailure: true })
): Promise<SettingsDiffResult> {
  const paths = validateSettingsPublishPaths(requestedPaths, new Set(requestedPaths))
  if (!paths.length) {
    return { text: '当前会话没有可发布的设置差异。', files: [] }
  }

  const files: SettingsDiffResult['files'] = []
  const sections: string[] = []

  for (const candidate of paths) {
    const tracked = await run(['ls-files', '--error-unmatch', '--', candidate])
    if (![0, 1].includes(tracked.exitCode)) throw new Error('无法读取站点设置差异')

    if (tracked.exitCode === 1) {
      const numstat = await run(['diff', '--no-index', '--numstat', '--', '/dev/null', candidate])
      if (![0, 1].includes(numstat.exitCode)) throw new Error('无法读取站点设置差异')
      const binary = isBinaryNumstat(numstat.stdout)
      files.push({
        path: candidate,
        kind: binary ? 'binary' : 'text',
        status: 'added',
        ...(binary ? { size: await readOptionalFileSize(candidate) } : {})
      })
      if (binary) {
        sections.push(`--- 新增二进制文件 ---\n${candidate}`)
      } else {
        const diff = await run(['diff', '--no-index', '--no-ext-diff', '--', '/dev/null', candidate])
        if (![0, 1].includes(diff.exitCode)) throw new Error('无法读取站点设置差异')
        if (diff.stdout) sections.push(`--- 未跟踪：${candidate} ---\n${diff.stdout}`)
      }
      continue
    }

    const [nameStatus, numstat, staged, worktree] = await Promise.all([
      run(['diff', '--name-status', 'HEAD', '--', candidate]),
      run(['diff', '--numstat', 'HEAD', '--', candidate]),
      run(['diff', '--cached', '--no-ext-diff', '--', candidate]),
      run(['diff', '--no-ext-diff', '--', candidate])
    ])
    if ([nameStatus, numstat, staged, worktree].some((result) => result.exitCode !== 0)) {
      throw new Error('无法读取站点设置差异')
    }
    if (!nameStatus.stdout && !staged.stdout && !worktree.stdout) continue

    const binary = isBinaryNumstat(numstat.stdout)
    files.push({
      path: candidate,
      kind: binary ? 'binary' : 'text',
      status: parseNameStatus(nameStatus.stdout),
      ...(binary ? { size: await readOptionalFileSize(candidate) } : {})
    })
    if (binary) {
      sections.push(`--- 二进制文件 ---\n${candidate}`)
    } else {
      if (staged.stdout) sections.push(`--- 已暂存：${candidate} ---\n${staged.stdout}`)
      if (worktree.stdout) sections.push(`--- 工作区：${candidate} ---\n${worktree.stdout}`)
    }
  }

  return {
    text: sections.join('\n') || '当前会话没有可发布的设置差异。',
    files
  }
}
