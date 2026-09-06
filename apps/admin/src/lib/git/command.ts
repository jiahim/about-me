import { execFile } from 'node:child_process'

import { findRepositoryRoot } from '../local-repository'

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface CommandOptions {
  allowFailure?: boolean
  timeoutMs?: number
}

function safeError(stderr: string): string {
  return stderr
    .replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/g, 'https://')
    .trim()
    .slice(0, 4000)
}

export function runCommand(
  file: 'git' | 'gh',
  args: readonly string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      [...args],
      {
        cwd: findRepositoryRoot(),
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024,
        timeout: options.timeoutMs || 15_000
      },
      (error, stdout, stderr) => {
        const exitCode =
          error && 'code' in error && typeof error.code === 'number' ? error.code : error ? 1 : 0
        const result = { stdout, stderr, exitCode }

        if (error && !options.allowFailure) {
          reject(new Error(safeError(stderr) || '本地命令执行失败'))
          return
        }

        resolve(result)
      }
    )
  })
}

export function runGit(
  args: readonly string[],
  options?: CommandOptions
): Promise<CommandResult> {
  return runCommand('git', args, options)
}
