import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingsRepository } from './repository'
import { SectionTransaction } from './section-transaction'

const temporaryDirectories: string[] = []

async function temporaryRepository(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'section-transaction-'))
  temporaryDirectories.push(root)
  await mkdir(path.join(root, 'config'), { recursive: true })
  await mkdir(path.join(root, 'docs/zh'), { recursive: true })
  await writeFile(
    path.join(root, 'config/site.config.json'),
    `${JSON.stringify(createDefaultSiteConfiguration(), null, 2)}\n`
  )
  return root
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('SectionTransaction', () => {
  it('creates the index and config as one recoverable operation', async () => {
    const root = await temporaryRepository()
    const repository = new SettingsRepository(root)
    const before = await repository.read()

    const result = await new SectionTransaction(root, repository).create({
      baseHash: before.baseHash,
      name: 'Vue 深入',
      slug: 'vue-deep',
      parentId: 'skill',
      header: false,
      sidebar: true,
      collapsed: true
    })

    expect(result.changedPaths).toEqual([
      'config/site.config.json',
      'docs/zh/skill/vue-deep/index.md'
    ])
    expect(await readFile(path.join(root, 'docs/zh/skill/vue-deep/index.md'), 'utf8')).toBe('# Vue 深入\n')
    expect((await repository.read()).config.sections.some((section) => section.id === 'vue-deep')).toBe(true)
  })

  it('removes the new index and empty directory if config commit fails', async () => {
    const root = await temporaryRepository()
    const realRepository = new SettingsRepository(root)
    const before = await realRepository.read()
    const repository = {
      read: () => realRepository.read(),
      save: vi.fn(async () => { throw new Error('injected config failure') })
    }

    await expect(new SectionTransaction(root, repository).create({
      baseHash: before.baseHash,
      name: 'Rollback',
      slug: 'rollback',
      header: true,
      sidebar: true,
      collapsed: false
    })).rejects.toThrow('injected config failure')

    await expect(readFile(path.join(root, 'docs/zh/rollback/index.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await realRepository.read()).baseHash).toBe(before.baseHash)
  })

  it('archives a section without deleting its articles', async () => {
    const root = await temporaryRepository()
    const directory = path.join(root, 'docs/zh/skill')
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'article.md'), '# keep me')
    const repository = new SettingsRepository(root)
    const before = await repository.read()

    const result = await new SectionTransaction(root, repository).archive('skill', before.baseHash)

    expect(result.articleCount).toBe(1)
    expect(await readFile(path.join(directory, 'article.md'), 'utf8')).toBe('# keep me')
    expect(result.config.sections.find((section) => section.id === 'skill')?.status).toBe('archived')
  })

  it('serializes concurrent creation so a loser cannot delete the winner', async () => {
    const root = await temporaryRepository()
    const snapshot = await new SettingsRepository(root).read()
    const request = { baseHash: snapshot.baseHash, name: 'Concurrent', slug: 'concurrent', header: true, sidebar: true, collapsed: false }

    const results = await Promise.allSettled([
      new SectionTransaction(root, new SettingsRepository(root)).create(request),
      new SectionTransaction(root, new SettingsRepository(root)).create(request)
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(await readFile(path.join(root, 'docs/zh/concurrent/index.md'), 'utf8')).toBe('# Concurrent\n')
  })

  it('rejects a symlinked ancestor and never writes outside the repository', async () => {
    const root = await temporaryRepository()
    const outside = await mkdtemp(path.join(os.tmpdir(), 'section-outside-'))
    temporaryDirectories.push(outside)
    await symlink(outside, path.join(root, 'docs/zh/skill'))
    const repository = new SettingsRepository(root)
    const snapshot = await repository.read()

    await expect(new SectionTransaction(root, repository).create({
      baseHash: snapshot.baseHash,
      name: 'Escape',
      slug: 'escape',
      parentId: 'skill',
      header: true,
      sidebar: true,
      collapsed: false
    })).rejects.toThrow(/符号链接|越出/)
    await expect(readFile(path.join(outside, 'escape/index.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a symlinked config directory before opening the transaction lock', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'section-config-link-'))
    const outside = await mkdtemp(path.join(os.tmpdir(), 'section-config-outside-'))
    temporaryDirectories.push(root, outside)
    await mkdir(path.join(root, 'docs/zh'), { recursive: true })
    await symlink(outside, path.join(root, 'config'))
    const settings = {
      read: vi.fn(async () => ({
        config: createDefaultSiteConfiguration(),
        baseHash: 'a'.repeat(64),
        migrationWarnings: [],
        normalizedJson: '{}\n',
        validation: { valid: true, issues: [] }
      })),
      save: vi.fn()
    }

    await expect(new SectionTransaction(root, settings).create({
      baseHash: 'a'.repeat(64),
      name: 'Unsafe',
      slug: 'unsafe',
      header: true,
      sidebar: true,
      collapsed: false
    })).rejects.toThrow(/符号链接|越出/)
    expect(settings.read).not.toHaveBeenCalled()
  })

  it('recovers a lock left by a dead process', async () => {
    const root = await temporaryRepository()
    await writeFile(path.join(root, 'config/.section-transaction.lock'), '999999999\n')
    const repository = new SettingsRepository(root)
    const snapshot = await repository.read()
    await expect(new SectionTransaction(root, repository).create({
      baseHash: snapshot.baseHash,
      name: 'Recovered',
      slug: 'recovered',
      header: false,
      sidebar: true,
      collapsed: false
    })).resolves.toMatchObject({ section: { id: 'recovered' } })
  })
})
