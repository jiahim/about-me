import { realpath } from 'node:fs/promises'

import { runGit } from '../git/command'
import { parsePorcelainV2 } from '../git/status'
import { findRepositoryRoot } from '../repository-root'

export interface SettingsGitSnapshot {
  repositoryRoot: string
  branch: string
  head: string
  dirtyPaths: ReadonlySet<string>
}

export type ReadSettingsGitSnapshot = () => Promise<SettingsGitSnapshot>

export async function readSettingsGitSnapshot(): Promise<SettingsGitSnapshot> {
  const repositoryRoot = await realpath(findRepositoryRoot())
  const [branchResult, headResult, statusResult] = await Promise.all([
    runGit(['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true }),
    runGit(['rev-parse', 'HEAD']),
    runGit(['status', '--porcelain=v2', '-z', '--untracked-files=all'])
  ])
  const branch = branchResult.stdout.trim()
  if (branchResult.exitCode !== 0 || !branch) throw new Error('设置发布会话不支持 detached HEAD')
  const parsed = parsePorcelainV2(statusResult.stdout)
  return {
    repositoryRoot,
    branch,
    head: headResult.stdout.trim(),
    dirtyPaths: new Set(parsed.changedFiles.flatMap((file) => file.originalPath ? [file.path, file.originalPath] : [file.path]))
  }
}
