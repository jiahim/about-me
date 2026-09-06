import path from 'node:path'
import { realpath } from 'node:fs/promises'

import { assertArticlePath } from '../content-config'
import { runCommand, runGit } from './command'
import { getGitStatus } from './repository'
import { validateSettingsPublishPaths } from './settings-scope'
import type {
  GitStatus,
  MergeWorkflowResult,
  PublishWorkflowResult
} from './types'
import type { CommandResult } from './command'
import type { VerifiedSettingsPublishScope } from '../settings/session'

export type GitRunner = (args: readonly string[]) => Promise<CommandResult>

interface CommitInput {
  paths: string[]
  message: string
}

export interface ArticlePublishInput {
  scope: 'article'
  articlePath: string
  mediaPaths: string[]
  message: string
  date: string
}

export interface SettingsPublishInput {
  scope: 'settings'
  verified: VerifiedSettingsPublishScope
  message: string
  date: string
}

export type PublishInput = ArticlePublishInput | SettingsPublishInput

interface PullRequestCheck {
  __typename: string
  name?: string
  context?: string
  status?: string
  conclusion?: string | null
  state?: string
}

export interface ManagedPullRequestInfo {
  number: number
  url: string
  state: string
  isDraft: boolean
  baseRefName: string
  headRefName: string
  headRefOid: string
  isCrossRepository: boolean
  author: { login: string }
  mergeStateStatus: string
  statusCheckRollup: PullRequestCheck[] | null
}

interface ManagedPullRequestExpectation {
  pullRequestNumber: number
  currentBranch: string
  currentLogin: string
  defaultBranch: string
}

interface MergeVerificationDependencies {
  getStatus: typeof getGitStatus
  runGh: (args: readonly string[]) => Promise<CommandResult>
}

const pullRequestJsonFields =
  'number,url,state,isDraft,baseRefName,headRefName,headRefOid,isCrossRepository,author,mergeStateStatus,statusCheckRollup'

const mediaPrefix = 'docs/public/images/articles/'
export { validateSettingsPublishPaths } from './settings-scope'

export function buildContentBranchName(date: string, articlePath: string): string {
  const basename = path.posix.basename(articlePath, '.md')
  const slug =
    basename
      .normalize('NFKD')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'article'

  return 'content/' + date + '-' + slug
}

export function buildSettingsBranchName(date: string): string {
  return `content/${date}-site-settings`
}

export function normalizeCommitMessage(message: string): string {
  const trimmed = message.trim() || 'docs: update article'
  return trimmed.startsWith('[Human] ') ? trimmed : '[Human] ' + trimmed
}

export function assertPublishStartingBranch(
  status: Pick<GitStatus, 'branch' | 'defaultBranch' | 'remote' | 'upstream' | 'ahead' | 'behind'>
): void {
  if (!status.branch || status.branch !== status.defaultBranch) {
    throw new Error(
      `只能从默认分支开始提交并推送（当前默认分支：${status.defaultBranch}），请先在终端切换后重试。`
    )
  }
  const expectedUpstream = `${status.remote}/${status.defaultBranch}`
  if (!status.upstream || status.upstream !== expectedUpstream) {
    throw new Error(`默认分支 upstream 必须是 ${expectedUpstream}，请先在终端修复跟踪关系。`)
  }
  if (status.ahead !== 0 || status.behind !== 0) {
    throw new Error('默认分支未与远端同步，不能开始内容发布。')
  }
}

function checkSucceeded(check: PullRequestCheck): boolean {
  if (check.__typename === 'CheckRun') {
    return (
      check.status === 'COMPLETED' &&
      ['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(check.conclusion || '')
    )
  }

  if (check.__typename === 'StatusContext') {
    return check.state === 'SUCCESS'
  }

  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(
  value: Record<string, unknown>,
  field: string
): string {
  const result = value[field]

  if (typeof result !== 'string' || !result.trim()) {
    throw new Error(`Pull Request 字段 ${field} 无效`)
  }

  return result
}

function parsePullRequestCheck(value: unknown): PullRequestCheck {
  if (!isRecord(value)) {
    throw new Error('Pull Request 字段 statusCheckRollup 无效')
  }

  const typename = requiredString(value, '__typename')

  if (typename === 'CheckRun') {
    const conclusion = value.conclusion
    if (conclusion !== null && typeof conclusion !== 'string') {
      throw new Error('Pull Request CheckRun 字段 conclusion 无效')
    }

    return {
      __typename: typename,
      name: requiredString(value, 'name'),
      status: requiredString(value, 'status'),
      conclusion
    }
  }

  if (typename === 'StatusContext') {
    return {
      __typename: typename,
      context: requiredString(value, 'context'),
      state: requiredString(value, 'state')
    }
  }

  throw new Error('Pull Request 字段 statusCheckRollup 包含未知检查类型')
}

export function parseManagedPullRequestInfo(
  input: unknown
): ManagedPullRequestInfo {
  if (!isRecord(input)) {
    throw new Error('GitHub CLI 返回了无法识别的 Pull Request 信息')
  }

  if (!Number.isInteger(input.number) || (input.number as number) <= 0) {
    throw new Error('Pull Request 字段 number 无效')
  }
  if (typeof input.isDraft !== 'boolean') {
    throw new Error('Pull Request 字段 isDraft 无效')
  }
  if (typeof input.isCrossRepository !== 'boolean') {
    throw new Error('Pull Request 字段 isCrossRepository 无效')
  }

  const author = input.author
  if (!isRecord(author)) {
    throw new Error('Pull Request 字段 author 无效')
  }

  const headRefOid = requiredString(input, 'headRefOid')
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(headRefOid)) {
    throw new Error('Pull Request 字段 headRefOid 无效')
  }

  const checks = input.statusCheckRollup
  if (checks !== null && !Array.isArray(checks)) {
    throw new Error('Pull Request 字段 statusCheckRollup 无效')
  }

  return {
    number: input.number as number,
    url: requiredString(input, 'url'),
    state: requiredString(input, 'state'),
    isDraft: input.isDraft,
    baseRefName: requiredString(input, 'baseRefName'),
    headRefName: requiredString(input, 'headRefName'),
    headRefOid,
    isCrossRepository: input.isCrossRepository,
    author: { login: requiredString(author, 'login') },
    mergeStateStatus: requiredString(input, 'mergeStateStatus'),
    statusCheckRollup: checks === null ? null : checks.map(parsePullRequestCheck)
  }
}

export function assertManagedPullRequest(
  pullRequest: ManagedPullRequestInfo,
  expected: ManagedPullRequestExpectation
): void {
  if (pullRequest.number !== expected.pullRequestNumber) {
    throw new Error('Pull Request 编号与待合并编号不一致')
  }
  if (pullRequest.state !== 'OPEN') {
    throw new Error('Pull Request 未处于 OPEN 状态')
  }
  if (pullRequest.isDraft) {
    throw new Error('草稿 Pull Request 不能合并发布')
  }
  if (pullRequest.baseRefName !== expected.defaultBranch) {
    throw new Error('Pull Request 目标分支不是当前默认分支')
  }
  if (!pullRequest.headRefName.startsWith('content/')) {
    throw new Error('Pull Request 来源不是受管内容分支')
  }
  if (pullRequest.isCrossRepository) {
    throw new Error('不允许从外部 fork 合并发布')
  }
  if (pullRequest.author.login !== expected.currentLogin) {
    throw new Error('Pull Request 作者不是当前 GitHub CLI 用户')
  }
  if (pullRequest.headRefName !== expected.currentBranch) {
    throw new Error('Pull Request 不属于当前分支')
  }
  if (pullRequest.mergeStateStatus !== 'CLEAN') {
    throw new Error('Pull Request 当前不可安全合并')
  }
  if (!(pullRequest.statusCheckRollup || []).every(checkSucceeded)) {
    throw new Error('Pull Request 检查尚未成功完成')
  }
}

export function validatePublishPaths(
  articlePath: string,
  mediaPaths: readonly string[]
): string[] {
  assertArticlePath(articlePath)
  const unique = new Set<string>([articlePath])

  for (const mediaPath of mediaPaths) {
    if (
      !mediaPath.startsWith(mediaPrefix) ||
      mediaPath.includes('..') ||
      mediaPath.includes('\\') ||
      path.posix.isAbsolute(mediaPath)
    ) {
      throw new Error('媒体路径不在允许目录')
    }
    unique.add(mediaPath)
  }

  return [...unique]
}

function nulPaths(value: string): string[] {
  return value.split('\0').filter(Boolean)
}

export async function exactStageAndCommit(
  input: CommitInput,
  run: GitRunner = (args) => runGit(args)
): Promise<string> {
  const allowed = new Set(input.paths)
  const before = await run(['diff', '--cached', '--name-only', '-z'])
  const unexpectedBefore = nulPaths(before.stdout).filter((file) => !allowed.has(file))

  if (unexpectedBefore.length) {
    throw new Error('暂存区包含其他文件，请先在终端处理：' + unexpectedBefore.join('、'))
  }

  await run(['add', '--', ...input.paths])
  const staged = await run(['diff', '--cached', '--name-only', '-z'])
  const stagedPaths = nulPaths(staged.stdout)
  const unexpectedAfter = stagedPaths.filter((file) => !allowed.has(file))

  if (unexpectedAfter.length) {
    throw new Error('检测到超出本次范围的暂存文件：' + unexpectedAfter.join('、'))
  }

  if (!stagedPaths.length) {
    throw new Error('当前范围没有可提交的变更')
  }

  await run(['commit', '-m', normalizeCommitMessage(input.message)])
  const commit = await run(['rev-parse', 'HEAD'])
  return commit.stdout.trim()
}

export async function findUniqueContentBranchName(
  baseName: string,
  remote: string,
  run: GitRunner = (args) =>
    runGit(args, { allowFailure: true, timeoutMs: 30_000 })
): Promise<string> {
  let candidate = baseName
  let suffix = 2

  while (true) {
    const local = await run([
      'show-ref',
      '--verify',
      '--quiet',
      'refs/heads/' + candidate
    ])

    if (local.exitCode !== 0 && local.exitCode !== 1) {
      throw new Error(local.stderr.trim() || '无法检查本地内容分支')
    }

    if (local.exitCode === 1) {
      const remoteHead = await run([
        'ls-remote',
        '--exit-code',
        '--heads',
        remote,
        'refs/heads/' + candidate
      ])

      if (remoteHead.exitCode === 2) return candidate
      if (remoteHead.exitCode !== 0) {
        throw new Error(remoteHead.stderr.trim() || '无法检查远端内容分支')
      }
    }

    candidate = baseName + '-' + suffix
    suffix += 1
  }
}

async function readPullRequest(branch: string): Promise<ManagedPullRequestInfo | null> {
  const result = await runCommand(
    'gh',
    [
      'pr',
      'view',
      branch,
      '--json',
      pullRequestJsonFields
    ],
    { allowFailure: true, timeoutMs: 30_000 }
  )

  if (result.exitCode !== 0) return null

  try {
    return parseManagedPullRequestInfo(JSON.parse(result.stdout))
  } catch {
    throw new Error('GitHub CLI 返回了无法识别的 Pull Request 信息')
  }
}

export interface VerifiedManagedPullRequest {
  repository: string
  pullRequest: ManagedPullRequestInfo
}

export async function verifyManagedPullRequestForMerge(
  pullRequestNumber: number,
  dependencies: MergeVerificationDependencies = {
    getStatus: getGitStatus,
    runGh: (args) => runCommand('gh', args, { timeoutMs: 30_000 })
  }
): Promise<VerifiedManagedPullRequest> {
  const status = await dependencies.getStatus()

  if (!status.canWrite || !status.branch) {
    throw new Error(status.blockReason || '当前 Git 状态不允许合并')
  }

  const identity = await dependencies.runGh(['api', 'user', '--jq', '.login'])
  const currentLogin = identity.stdout.trim()

  if (identity.exitCode !== 0 || !currentLogin) {
    throw new Error('无法确认当前 GitHub CLI 用户')
  }

  const repositoryResult = await dependencies.runGh([
    'repo',
    'view',
    '--json',
    'nameWithOwner',
    '--jq',
    '.nameWithOwner'
  ])
  const repository = repositoryResult.stdout.trim()

  if (
    repositoryResult.exitCode !== 0 ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
  ) {
    throw new Error('无法确认当前 GitHub 仓库')
  }

  const pullRequestResult = await dependencies.runGh([
    'pr',
    'view',
    String(pullRequestNumber),
    '--repo',
    repository,
    '--json',
    pullRequestJsonFields
  ])

  if (pullRequestResult.exitCode !== 0) {
    throw new Error('无法读取待合并的 Pull Request')
  }

  let pullRequest: ManagedPullRequestInfo

  try {
    pullRequest = parseManagedPullRequestInfo(JSON.parse(pullRequestResult.stdout))
  } catch {
    throw new Error('GitHub CLI 返回了无法识别的 Pull Request 信息')
  }

  assertManagedPullRequest(pullRequest, {
    pullRequestNumber,
    currentBranch: status.branch,
    currentLogin,
    defaultBranch: status.defaultBranch
  })

  return { repository, pullRequest }
}

export function buildManagedMergeArgs(
  pullRequest: ManagedPullRequestInfo,
  repository: string
): string[] {
  return [
    'pr',
    'merge',
    String(pullRequest.number),
    '--repo',
    repository,
    '--squash',
    '--delete-branch',
    '--match-head-commit',
    pullRequest.headRefOid
  ]
}

export function assertMergeLocalState(
  status: Pick<GitStatus, 'ahead' | 'behind' | 'changedFiles' | 'upstream'>,
  expectedHeadOid: string,
  currentHeadOid: string,
  pullRequestHeadOid: string
): void {
  if (status.changedFiles.length) throw new Error('工作区或暂存区存在改动，不能执行合并')
  if (!status.upstream) throw new Error('当前内容分支没有 upstream，不能执行合并')
  if (status.ahead !== 0 || status.behind !== 0) throw new Error('当前内容分支未与远端同步，不能执行合并')
  if (expectedHeadOid !== pullRequestHeadOid || currentHeadOid !== expectedHeadOid) {
    throw new Error('Pull Request 提交已变化，请刷新并重新确认')
  }
}

export async function publishChanges(input: PublishInput): Promise<PublishWorkflowResult> {
  const paths = input.scope === 'article'
    ? validatePublishPaths(input.articlePath, input.mediaPaths)
    : validateSettingsPublishPaths(input.verified.paths, new Set(input.verified.paths))
  if (!paths.length) throw new Error('当前范围没有可提交的变更')
  const status = await getGitStatus()

  if (!status.canWrite || !status.branch || !status.remote) {
    throw new Error(status.blockReason || '当前 Git 状态不允许提交')
  }

  assertPublishStartingBranch(status)
  if (input.scope === 'settings') {
    const [root, branch, head] = await Promise.all([
      runGit(['rev-parse', '--show-toplevel']),
      runGit(['symbolic-ref', '--quiet', '--short', 'HEAD']),
      runGit(['rev-parse', 'HEAD'])
    ])
    if (
      (await realpath(root.stdout.trim())) !== input.verified.repositoryRoot ||
      branch.stdout.trim() !== input.verified.branch ||
      head.stdout.trim() !== input.verified.head
    ) {
      throw new Error('仓库、分支或 HEAD 已变化，设置发布会话已失效')
    }
  }
  const branch = await findUniqueContentBranchName(
    input.scope === 'article'
      ? buildContentBranchName(input.date, input.articlePath)
      : buildSettingsBranchName(input.date),
    status.remote
  )
  await runGit(['switch', '-c', branch])

  const commitSha = await exactStageAndCommit({
    paths,
    message: input.message
  })
  await runGit(['push', '--set-upstream', status.remote, branch], {
    timeoutMs: 120_000
  })

  let pullRequest = await readPullRequest(branch)
  if (!pullRequest) {
    await runCommand(
      'gh',
      [
        'pr',
        'create',
        '--base',
        status.defaultBranch,
        '--head',
        branch,
        '--title',
        normalizeCommitMessage(input.message),
        '--body',
        input.scope === 'article'
          ? '由 Jia him 本地文章工作台创建。'
          : '由 Jia him 本地站点设置工作台创建。'
      ],
      { timeoutMs: 120_000 }
    )
    pullRequest = await readPullRequest(branch)
  }

  if (!pullRequest) {
    throw new Error('提交已推送，但无法读取 Pull Request，请运行 gh pr view 检查。')
  }

  return {
    branch,
    commitSha,
    number: pullRequest.number,
    url: pullRequest.url,
    state: pullRequest.state,
    baseRefName: pullRequest.baseRefName,
    headRefName: pullRequest.headRefName,
    headRefOid: pullRequest.headRefOid,
    mergeStateStatus: pullRequest.mergeStateStatus,
    message: '已提交并推送，Pull Request 等待预览与合并。'
  }
}

export async function mergePullRequest(
  pullRequestNumber: number,
  expectedHeadOid: string,
  confirmed: boolean
): Promise<MergeWorkflowResult> {
  if (
    !confirmed ||
    !Number.isInteger(pullRequestNumber) ||
    pullRequestNumber <= 0 ||
    !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(expectedHeadOid)
  ) {
    throw new Error('合并发布需要明确确认有效的 Pull Request')
  }

  const verified = await verifyManagedPullRequestForMerge(pullRequestNumber)
  const status = await getGitStatus()
  const localHead = (await runGit(['rev-parse', 'HEAD'])).stdout.trim()
  assertMergeLocalState(status, expectedHeadOid, localHead, verified.pullRequest.headRefOid)

  await runCommand(
    'gh',
    buildManagedMergeArgs(verified.pullRequest, verified.repository),
    { timeoutMs: 120_000 }
  )

  return {
    pullRequestNumber,
    message: 'Pull Request 已合并，Vercel 将开始发布公开站点。'
  }
}
