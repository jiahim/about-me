import type { GitChangedFile, ParsedGitStatus } from './types'

function pathAfterFields(record: string, fieldCount: number): string {
  return record.split(' ').slice(fieldCount).join(' ')
}

export function parsePorcelainV2(output: string): ParsedGitStatus {
  const records = output.split('\0')
  const changedFiles: GitChangedFile[] = []
  const conflicts: string[] = []
  let branch: string | null = null
  let upstream: string | undefined
  let ahead = 0
  let behind = 0

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!record) continue

    if (record.startsWith('# branch.head ')) {
      const head = record.slice('# branch.head '.length)
      branch = head === '(detached)' ? null : head
      continue
    }

    if (record.startsWith('# branch.upstream ')) {
      upstream = record.slice('# branch.upstream '.length)
      continue
    }

    if (record.startsWith('# branch.ab ')) {
      const match = record.match(/\+(\d+)\s+-(\d+)/)
      ahead = match ? Number(match[1]) : 0
      behind = match ? Number(match[2]) : 0
      continue
    }

    if (record.startsWith('1 ')) {
      const status = record.slice(2, 4)
      changedFiles.push({
        path: pathAfterFields(record, 8),
        indexStatus: status[0],
        worktreeStatus: status[1],
        kind: 'ordinary'
      })
      continue
    }

    if (record.startsWith('2 ')) {
      const status = record.slice(2, 4)
      changedFiles.push({
        path: pathAfterFields(record, 9),
        originalPath: records[index + 1] || undefined,
        indexStatus: status[0],
        worktreeStatus: status[1],
        kind: 'renamed'
      })
      index += 1
      continue
    }

    if (record.startsWith('u ')) {
      const status = record.slice(2, 4)
      const path = pathAfterFields(record, 10)
      changedFiles.push({
        path,
        indexStatus: status[0],
        worktreeStatus: status[1],
        kind: 'unmerged'
      })
      conflicts.push(path)
      continue
    }

    if (record.startsWith('? ')) {
      changedFiles.push({
        path: record.slice(2),
        indexStatus: '?',
        worktreeStatus: '?',
        kind: 'untracked'
      })
    }
  }

  return {
    branch,
    ...(upstream ? { upstream } : {}),
    ahead,
    behind,
    changedFiles,
    conflicts
  }
}
