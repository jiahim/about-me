import { describe, expect, it, vi } from 'vitest'

import { getSettingsDiff } from './repository'
import { validateSettingsPublishPaths } from './workflow'

const result = (stdout = '', exitCode = 0) => ({ stdout, stderr: '', exitCode })

describe('设置 Git 边界', () => {
  it('只读取会话给出的 tracked 路径的 staged 与 worktree diff', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(result('config/site.config.json\n'))
      .mockResolvedValueOnce(result('M\tconfig/site.config.json\n'))
      .mockResolvedValueOnce(result('1\t1\tconfig/site.config.json\n'))
      .mockResolvedValueOnce(result('staged diff'))
      .mockResolvedValueOnce(result('worktree diff'))

    await expect(getSettingsDiff(['config/site.config.json'], run)).resolves.toMatchObject({
      text: expect.stringContaining('staged diff'),
      files: [{ path: 'config/site.config.json', kind: 'text', status: 'modified' }]
    })
    expect(run.mock.calls.map(([args]) => args)).toEqual([
      ['ls-files', '--error-unmatch', '--', 'config/site.config.json'],
      ['diff', '--name-status', 'HEAD', '--', 'config/site.config.json'],
      ['diff', '--numstat', 'HEAD', '--', 'config/site.config.json'],
      ['diff', '--cached', '--no-ext-diff', '--', 'config/site.config.json'],
      ['diff', '--no-ext-diff', '--', 'config/site.config.json']
    ])
  })

  it('为未跟踪配置生成 no-index diff', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(result('', 1))
      .mockResolvedValueOnce(result('1\t0\tconfig/site.config.json\n', 1))
      .mockResolvedValueOnce(result('new file diff', 1))

    await expect(getSettingsDiff(['config/site.config.json'], run)).resolves.toMatchObject({
      text: expect.stringContaining('new file diff'),
      files: [{ path: 'config/site.config.json', kind: 'text', status: 'added' }]
    })
    expect(run).toHaveBeenLastCalledWith([
      'diff',
      '--no-index',
      '--no-ext-diff',
      '--',
      '/dev/null',
      'config/site.config.json'
    ])
  })

  it('Git 命令故障不会伪装成未跟踪或无差异', async () => {
    const discoveryFailure = vi.fn().mockResolvedValue(result('', 128))
    await expect(getSettingsDiff(['config/site.config.json'], discoveryFailure)).rejects.toThrow(/无法读取/)

    const diffFailure = vi
      .fn()
      .mockResolvedValueOnce(result('config/site.config.json\n'))
      .mockResolvedValueOnce(result('M\tconfig/site.config.json\n'))
      .mockResolvedValueOnce(result('1\t1\tconfig/site.config.json\n'))
      .mockResolvedValueOnce(result('', 128))
      .mockResolvedValueOnce(result(''))
    await expect(getSettingsDiff(['config/site.config.json'], diffFailure)).rejects.toThrow(/无法读取/)
  })

  it('为空会话返回稳定结果，二进制内容只显示摘要', async () => {
    await expect(getSettingsDiff([], vi.fn())).resolves.toEqual({
      text: '当前会话没有可发布的设置差异。',
      files: []
    })
    const run = vi.fn()
      .mockResolvedValueOnce(result('', 1))
      .mockResolvedValueOnce(result('-\t-\tdocs/public/images/site/logo.png\n', 1))
    await expect(getSettingsDiff(['docs/public/images/site/logo.png'], run)).resolves.toMatchObject({
      text: expect.stringContaining('二进制'),
      files: [{ path: 'docs/public/images/site/logo.png', kind: 'binary', status: 'added' }]
    })
  })

  it('发布路径必须属于服务端记录的设置会话精确集合', () => {
    const allowed = new Set([
      'config/site.config.json',
      'docs/zh/new-section/index.md',
      'docs/public/images/site/logo-a.png'
    ])
    expect(
      validateSettingsPublishPaths(
        ['docs/public/images/site/logo-a.png', 'config/site.config.json'],
        allowed
      )
    ).toEqual(['config/site.config.json', 'docs/public/images/site/logo-a.png'])
    expect(() =>
      validateSettingsPublishPaths(['docs/zh/other/index.md'], allowed)
    ).toThrow(/会话/)
    expect(() => validateSettingsPublishPaths(['../package.json'], allowed)).toThrow()
  })
})
