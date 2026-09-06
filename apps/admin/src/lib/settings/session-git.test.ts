import { beforeEach, describe, expect, it, vi } from 'vitest'

const runGit = vi.hoisted(() => vi.fn())
vi.mock('../git/command', () => ({ runGit }))

import { readSettingsGitSnapshot } from './session-git'

const result = (stdout = '', exitCode = 0) => ({ stdout, stderr: '', exitCode })

describe('readSettingsGitSnapshot', () => {
  beforeEach(() => runGit.mockReset())

  it('只读获取真实仓库、分支、HEAD 和会话开始前的脏文件', async () => {
    runGit
      .mockResolvedValueOnce(result('main\n'))
      .mockResolvedValueOnce(result('a'.repeat(40) + '\n'))
      .mockResolvedValueOnce(result('? config/site.config.json\0'))
    await expect(readSettingsGitSnapshot()).resolves.toMatchObject({
      branch: 'main',
      head: 'a'.repeat(40),
      dirtyPaths: new Set(['config/site.config.json'])
    })
  })

  it('fail closed 拒绝 detached HEAD', async () => {
    runGit
      .mockResolvedValueOnce(result('', 1))
      .mockResolvedValueOnce(result('a'.repeat(40) + '\n'))
      .mockResolvedValueOnce(result(''))
    await expect(readSettingsGitSnapshot()).rejects.toThrow(/detached HEAD/)
  })
})
