import { describe, expect, it } from 'vitest'

import { parsePorcelainV2 } from './status'

describe('parsePorcelainV2', () => {
  it('parses branch tracking and ordinary worktree changes', () => {
    const output = [
      '# branch.oid abc123',
      '# branch.head content/my-note',
      '# branch.upstream origin/content/my-note',
      '# branch.ab +2 -1',
      '1 .M N... 100644 100644 100644 abc123 abc123 docs/zh/essay/a.md',
      '? docs/zh/essay/new.md',
      ''
    ].join('\0')

    expect(parsePorcelainV2(output)).toEqual({
      branch: 'content/my-note',
      upstream: 'origin/content/my-note',
      ahead: 2,
      behind: 1,
      changedFiles: [
        {
          path: 'docs/zh/essay/a.md',
          indexStatus: '.',
          worktreeStatus: 'M',
          kind: 'ordinary'
        },
        {
          path: 'docs/zh/essay/new.md',
          indexStatus: '?',
          worktreeStatus: '?',
          kind: 'untracked'
        }
      ],
      conflicts: []
    })
  })

  it('parses rename records and consumes the original path field', () => {
    const output = [
      '# branch.head main',
      '2 R. N... 100644 100644 100644 abc123 def456 R100 docs/zh/essay/new.md',
      'docs/zh/essay/old.md',
      ''
    ].join('\0')

    expect(parsePorcelainV2(output).changedFiles).toEqual([
      {
        path: 'docs/zh/essay/new.md',
        originalPath: 'docs/zh/essay/old.md',
        indexStatus: 'R',
        worktreeStatus: '.',
        kind: 'renamed'
      }
    ])
  })

  it('marks detached heads and unmerged paths', () => {
    const output = [
      '# branch.head (detached)',
      'u UU N... 100644 100644 100644 100644 a b c docs/zh/essay/conflict.md',
      ''
    ].join('\0')
    const status = parsePorcelainV2(output)

    expect(status.branch).toBeNull()
    expect(status.conflicts).toEqual(['docs/zh/essay/conflict.md'])
    expect(status.changedFiles[0]).toMatchObject({
      path: 'docs/zh/essay/conflict.md',
      indexStatus: 'U',
      worktreeStatus: 'U',
      kind: 'unmerged'
    })
  })
})
