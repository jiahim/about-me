export type GitChangeKind = 'ordinary' | 'renamed' | 'unmerged' | 'untracked'
export type GitOperation = 'none' | 'merge' | 'rebase' | 'cherry-pick'

export interface GitChangedFile {
  path: string
  originalPath?: string
  indexStatus: string
  worktreeStatus: string
  kind: GitChangeKind
}

export interface ParsedGitStatus {
  branch: string | null
  upstream?: string
  ahead: number
  behind: number
  changedFiles: GitChangedFile[]
  conflicts: string[]
}

export interface GitStatus extends ParsedGitStatus {
  defaultBranch: string
  remote: string | null
  operation: GitOperation
  canWrite: boolean
  blockReason?: string
  pullRequest?: PullRequestSummary
}

export interface PullRequestSummary {
  number: number
  url: string
  state: string
  baseRefName?: string
  headRefName?: string
  headRefOid?: string
  mergeStateStatus?: string
}

export interface GitHistoryEntry {
  sha: string
  shortSha: string
  authoredAt: string
  author: string
  subject: string
}

export interface PublishWorkflowResult extends PullRequestSummary {
  branch: string
  commitSha: string
  message: string
}

export interface MergeWorkflowResult {
  message: string
  pullRequestNumber: number
}
