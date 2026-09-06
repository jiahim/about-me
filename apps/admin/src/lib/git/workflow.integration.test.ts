import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { GitRunner } from './workflow'
import { exactStageAndCommit } from './workflow'

const temporaryRepositories: string[] = []

function createRunner(cwd: string): GitRunner {
  return (args) =>
    new Promise((resolve, reject) => {
      execFile('git', [...args], { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
          return
        }
        resolve({ stdout, stderr, exitCode: 0 })
      })
    })
}

afterEach(async () => {
  await Promise.all(
    temporaryRepositories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

describe('exactStageAndCommit', () => {
  it('commits only approved paths and leaves unrelated worktree edits untouched', async () => {
    const repository = await mkdtemp(path.join(tmpdir(), 'jiahim-git-test-'))
    temporaryRepositories.push(repository)
    const run = createRunner(repository)
    const articlePath = 'docs/zh/essay/a.md'

    await mkdir(path.join(repository, 'docs/zh/essay'), { recursive: true })
    await writeFile(path.join(repository, articlePath), '# Before\n', 'utf8')
    await writeFile(path.join(repository, 'package.json'), '{}\n', 'utf8')
    await run(['init', '-b', 'main'])
    await run(['config', 'user.name', 'Test User'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['add', '--', articlePath, 'package.json'])
    await run(['commit', '-m', 'initial'])

    await writeFile(path.join(repository, articlePath), '# After\n', 'utf8')
    await writeFile(path.join(repository, 'package.json'), '{"changed":true}\n', 'utf8')

    await exactStageAndCommit(
      {
        paths: [articlePath],
        message: '[Human] docs: update article'
      },
      run
    )

    const committed = await run(['show', '--pretty=', '--name-only', 'HEAD'])
    const unrelated = await run(['status', '--short', '--', 'package.json'])
    expect(committed.stdout.trim()).toBe(articlePath)
    expect(unrelated.stdout).toContain('package.json')
  })

  it('commits an exact multi-file settings scope without staging unrelated changes', async () => {
    const repository = await mkdtemp(path.join(tmpdir(), 'jiahim-settings-git-test-'))
    temporaryRepositories.push(repository)
    const run = createRunner(repository)
    const settingsPaths = [
      'config/site.config.json',
      'docs/zh/new-section/index.md',
      'docs/public/images/site/logo.png'
    ]

    await mkdir(path.join(repository, 'config'), { recursive: true })
    await mkdir(path.join(repository, 'docs/zh/new-section'), { recursive: true })
    await mkdir(path.join(repository, 'docs/public/images/site'), { recursive: true })
    await writeFile(path.join(repository, settingsPaths[0]), '{}\n', 'utf8')
    await writeFile(path.join(repository, 'package.json'), '{}\n', 'utf8')
    await run(['init', '-b', 'main'])
    await run(['config', 'user.name', 'Test User'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['add', '--', settingsPaths[0], 'package.json'])
    await run(['commit', '-m', 'initial'])

    await writeFile(path.join(repository, settingsPaths[0]), '{"schemaVersion":2}\n', 'utf8')
    await writeFile(path.join(repository, settingsPaths[1]), '# New section\n', 'utf8')
    await writeFile(path.join(repository, settingsPaths[2]), Buffer.from([0, 1, 2, 3]))
    await writeFile(path.join(repository, 'package.json'), '{"unrelated":true}\n', 'utf8')

    await exactStageAndCommit({ paths: settingsPaths, message: '[Human] config: update site settings' }, run)

    const committed = await run(['show', '--pretty=', '--name-only', 'HEAD'])
    const unrelated = await run(['status', '--short', '--', 'package.json'])
    expect(committed.stdout.trim().split(/\r?\n/).sort()).toEqual([...settingsPaths].sort())
    expect(unrelated.stdout).toContain('package.json')
  })
})
