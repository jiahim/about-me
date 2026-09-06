import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  SettingsConflictError,
  SettingsRepository,
  SettingsValidationError
} from './repository'

const temporaryDirectories: string[] = []

async function temporaryRepository(): Promise<string> {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'settings-repository-'))
  temporaryDirectories.push(repository)
  await mkdir(path.join(repository, 'config'))
  await writeFile(
    path.join(repository, 'config/site.config.json'),
    JSON.stringify(createDefaultSiteConfiguration())
  )
  return repository
}

function legacyConfiguration(): Record<string, any> {
  const config = structuredClone(createDefaultSiteConfiguration()) as Record<string, any>
  config.schemaVersion = 1
  config.branding.favicon.alt = 'legacy favicon'
  config.author.avatar.alt = 'legacy avatar'
  config.author.sameAs = [{ label: 'GitHub', href: 'https://github.com/example', newTab: true }]
  config.seo.openGraph.type = 'website'
  config.seo.openGraph.image = { src: '/effective.png', alt: 'Effective' }
  config.branding.shareImage = { src: '/old.png', alt: 'Old' }
  for (const crawler of Object.values(config.geo.crawlers) as Record<string, any>[]) crawler.purpose = 'legacy'
  config.footer.social = [{ label: 'Mastodon', href: 'https://social.example/@me', newTab: true }]
  return config
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

describe('SettingsRepository', () => {
  it('读取并返回原始内容哈希与单换行标准化 JSON', async () => {
    const root = await temporaryRepository()
    const snapshot = await new SettingsRepository(root).read()

    expect(snapshot.baseHash).toMatch(/^[0-9a-f]{64}$/)
    expect(snapshot.normalizedJson.endsWith('\n')).toBe(true)
    expect(snapshot.normalizedJson.endsWith('\n\n')).toBe(false)
    expect(snapshot.validation).toEqual({ valid: true, issues: [] })
    expect(snapshot.migrationWarnings).toEqual([])
  })

  it('读取 v1 时只归一化并上报告警，不修改磁盘', async () => {
    const root = await temporaryRepository()
    const configPath = path.join(root, 'config/site.config.json')
    const raw = JSON.stringify(legacyConfiguration())
    await writeFile(configPath, raw)

    const snapshot = await new SettingsRepository(root).read()

    expect(snapshot.config.schemaVersion).toBe(2)
    expect(snapshot.config.branding.shareImage.src).toBe('/effective.png')
    expect(snapshot.migrationWarnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'share-image-conflict' }),
      expect.objectContaining({ code: 'unknown-social-provider' })
    ]))
    expect(await readFile(configPath, 'utf8')).toBe(raw)
  })

  it('保存 v1 输入时持久化规范化 v2', async () => {
    const root = await temporaryRepository()
    const repository = new SettingsRepository(root)
    const snapshot = await repository.read()

    const saved = await repository.save({
      config: legacyConfiguration(),
      baseHash: snapshot.baseHash
    })
    const persisted = JSON.parse(await readFile(path.join(root, 'config/site.config.json'), 'utf8'))

    expect(saved.config.schemaVersion).toBe(2)
    expect(saved.migrationWarnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'share-image-conflict' })
    ]))
    expect(persisted.schemaVersion).toBe(2)
    expect(persisted.seo.openGraph).not.toHaveProperty('image')
  })

  it('validate 只校验而不写盘', async () => {
    const root = await temporaryRepository()
    const configPath = path.join(root, 'config/site.config.json')
    const before = await readFile(configPath, 'utf8')
    const repository = new SettingsRepository(root)
    const candidate = createDefaultSiteConfiguration()
    candidate.site.name = '新名称'

    const result = repository.validate(candidate)

    expect(result).toMatchObject({ validation: { valid: true, issues: [] } })
    expect(await readFile(configPath, 'utf8')).toBe(before)
  })

  it('旧 baseHash、非法配置都不写盘', async () => {
    const root = await temporaryRepository()
    const configPath = path.join(root, 'config/site.config.json')
    const before = await readFile(configPath, 'utf8')
    const repository = new SettingsRepository(root)

    await expect(
      repository.save({ config: createDefaultSiteConfiguration(), baseHash: '0'.repeat(64) })
    ).rejects.toBeInstanceOf(SettingsConflictError)
    await expect(
      repository.save({ config: { schemaVersion: 1 }, baseHash: (await repository.read()).baseHash })
    ).rejects.toBeInstanceOf(SettingsValidationError)
    expect(await readFile(configPath, 'utf8')).toBe(before)
  })

  it('保存成功返回新哈希、精确文件集合和规范化字节', async () => {
    const root = await temporaryRepository()
    const repository = new SettingsRepository(root)
    const snapshot = await repository.read()
    const config = createDefaultSiteConfiguration()
    config.site.name = '保存后的名称'

    const saved = await repository.save({ config, baseHash: snapshot.baseHash })

    expect(saved.changedPaths).toEqual(['config/site.config.json'])
    expect(saved.baseHash).not.toBe(snapshot.baseHash)
    expect(await readFile(path.join(root, 'config/site.config.json'), 'utf8')).toBe(
      saved.normalizedJson
    )
  })

  it('原子 rename 失败后旧文件字节不变', async () => {
    const root = await temporaryRepository()
    const configPath = path.join(root, 'config/site.config.json')
    const before = await readFile(configPath, 'utf8')
    const rename = vi.fn(async () => {
      throw new Error('injected rename failure')
    })
    const repository = new SettingsRepository(root, { rename })
    const snapshot = await repository.read()
    const config = createDefaultSiteConfiguration()
    config.site.name = '不能落盘'

    await expect(repository.save({ config, baseHash: snapshot.baseHash })).rejects.toThrow(
      'injected rename failure'
    )
    expect(await readFile(configPath, 'utf8')).toBe(before)
    expect(rename).toHaveBeenCalledOnce()
  })

  it('拒绝配置文件符号链接', async () => {
    const root = await temporaryRepository()
    const outside = await mkdtemp(path.join(os.tmpdir(), 'settings-outside-'))
    temporaryDirectories.push(outside)
    const configPath = path.join(root, 'config/site.config.json')
    const outsideConfig = path.join(outside, 'site.config.json')
    await writeFile(outsideConfig, JSON.stringify(createDefaultSiteConfiguration()))
    await rm(configPath)
    await symlink(outsideConfig, configPath)

    await expect(new SettingsRepository(root).read()).rejects.toThrow(/符号链接|越出/)
  })

  it('同一 baseHash 的并发保存只允许一个成功', async () => {
    const root = await temporaryRepository()
    const snapshot = await new SettingsRepository(root).read()
    const first = createDefaultSiteConfiguration()
    const second = createDefaultSiteConfiguration()
    first.site.name = '第一个写入'
    second.site.name = '第二个写入'

    const results = await Promise.allSettled([
      new SettingsRepository(root).save({ config: first, baseHash: snapshot.baseHash }),
      new SettingsRepository(root).save({ config: second, baseHash: snapshot.baseHash })
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected).toMatchObject({ reason: expect.any(SettingsConflictError) })
  })

  it('跨进程锁存在时拒绝保存且不改旧文件', async () => {
    const root = await temporaryRepository()
    const repository = new SettingsRepository(root)
    const snapshot = await repository.read()
    const configPath = path.join(root, 'config/site.config.json')
    const before = await readFile(configPath, 'utf8')
    await writeFile(path.join(root, 'config/.site.config.lock'), 'other process')

    await expect(
      repository.save({ config: createDefaultSiteConfiguration(), baseHash: snapshot.baseHash })
    ).rejects.toBeInstanceOf(SettingsConflictError)
    expect(await readFile(configPath, 'utf8')).toBe(before)
  })

  it('自动回收死进程遗留锁并只清理自己的锁', async () => {
    const root = await temporaryRepository()
    const repository = new SettingsRepository(root, {
      isProcessAlive: () => false
    })
    const snapshot = await repository.read()
    const lockPath = path.join(root, 'config/.site.config.lock')
    await writeFile(
      lockPath,
      `${JSON.stringify({ token: 'stale', pid: 4242, createdAt: 0 })}\n`
    )
    const config = createDefaultSiteConfiguration()
    config.site.name = '回收陈旧锁后保存'

    await expect(repository.save({ config, baseHash: snapshot.baseHash })).resolves.toMatchObject({
      config: { site: { name: '回收陈旧锁后保存' } }
    })
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('两个陈旧锁回收者只有一个能进入临界区', async () => {
    const root = await temporaryRepository()
    const alias = `${root}-alias`
    temporaryDirectories.push(alias)
    await symlink(root, alias)
    const snapshot = await new SettingsRepository(root).read()
    await writeFile(
      path.join(root, 'config/.site.config.lock'),
      `${JSON.stringify({ token: 'shared-stale', pid: 4242, createdAt: 0 })}\n`
    )
    const first = createDefaultSiteConfiguration()
    const second = createDefaultSiteConfiguration()
    first.site.name = '回收者一'
    second.site.name = '回收者二'
    const dependencies = { isProcessAlive: (pid: number) => pid === process.pid }

    const results = await Promise.allSettled([
      new SettingsRepository(root, dependencies).save({
        config: first,
        baseHash: snapshot.baseHash
      }),
      new SettingsRepository(alias, dependencies).save({
        config: second,
        baseHash: snapshot.baseHash
      })
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })

  it('延迟回收者取得 recovery marker 后必须重新确认主锁身份', async () => {
    const root = await temporaryRepository()
    const snapshot = await new SettingsRepository(root).read()
    const lockPath = path.join(root, 'config/.site.config.lock')
    await writeFile(
      lockPath,
      `${JSON.stringify({ token: 'old-stale', pid: 4242, createdAt: 0 })}\n`
    )
    let replaced = false
    const repository = new SettingsRepository(root, {
      isProcessAlive: (pid) => pid === process.pid,
      open: (async (target: string, flags: string, mode?: number) => {
        if (target.includes('.site.config.recovery-') && !replaced) {
          replaced = true
          await writeFile(
            lockPath,
            `${JSON.stringify({ token: 'new-live', pid: process.pid, createdAt: Date.now() })}\n`
          )
        }
        return open(target, flags, mode)
      }) as typeof open
    })

    await expect(
      repository.save({
        config: createDefaultSiteConfiguration(),
        baseHash: snapshot.baseHash
      })
    ).rejects.toBeInstanceOf(SettingsConflictError)
    expect(JSON.parse(await readFile(lockPath, 'utf8'))).toMatchObject({
      token: 'new-live'
    })
  })

  it('临时文件写入期间的外部修改会在 rename 前被拒绝', async () => {
    const root = await temporaryRepository()
    const configPath = path.join(root, 'config/site.config.json')
    const initial = await new SettingsRepository(root).read()
    const external = `${JSON.stringify({ external: true })}\n`
    let reads = 0
    const repository = new SettingsRepository(root, {
      readFile: async (target, encoding) => {
        reads += 1
        if (reads === 2) await writeFile(configPath, external)
        return readFile(target, encoding)
      }
    })
    const candidate = createDefaultSiteConfiguration()
    candidate.site.name = '旧草稿'

    await expect(
      repository.save({ config: candidate, baseHash: initial.baseHash })
    ).rejects.toBeInstanceOf(SettingsConflictError)
    expect(await readFile(configPath, 'utf8')).toBe(external)
  })

  it('通用设置保存拒绝绕过栏目生命周期和路径锁定', async () => {
    const root = await temporaryRepository()
    const repository = new SettingsRepository(root)
    const snapshot = await repository.read()

    for (const mutate of [
      (config: ReturnType<typeof createDefaultSiteConfiguration>) => { config.sections.pop() },
      (config: ReturnType<typeof createDefaultSiteConfiguration>) => { config.sections[0].directory = 'docs/zh/renamed' },
      (config: ReturnType<typeof createDefaultSiteConfiguration>) => { config.sections[0].status = 'archived' }
    ]) {
      const candidate = createDefaultSiteConfiguration()
      mutate(candidate)
      await expect(repository.save({ config: candidate, baseHash: snapshot.baseHash })).rejects.toBeInstanceOf(SettingsValidationError)
    }
    expect((await repository.read()).baseHash).toBe(snapshot.baseHash)
  })
})
