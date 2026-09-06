import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { afterEach, describe, expect, it } from 'vitest'

import {
  planSectionArchive,
  planSectionCreation
} from './sections'
import { countSectionArticles } from './section-files'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

describe('section settings', () => {
  it('plans a nested section from a normalized stable slug', () => {
    const config = createDefaultSiteConfiguration()
    const planned = planSectionCreation(config, {
      name: 'Vue 深入',
      slug: ' Vue--Deep ',
      parentId: 'skill',
      header: false,
      sidebar: true,
      collapsed: true
    })

    expect(planned.section).toMatchObject({
      id: 'vue-deep',
      locale: 'zh-CN',
      directory: 'docs/zh/skill/vue-deep',
      route: '/zh/skill/vue-deep/',
      parentId: 'skill',
      order: 0,
      status: 'active'
    })
    expect(planned.indexContents).toContain('# Vue 深入')
    expect(planned.config.navigation).not.toContainEqual(expect.objectContaining({ sectionId: 'vue-deep' }))
  })

  it('adds a visible navigation item when header navigation is requested', () => {
    const planned = planSectionCreation(createDefaultSiteConfiguration(), {
      name: '项目', slug: 'projects', header: true, sidebar: true, collapsed: false
    })

    expect(planned.config.navigation).toContainEqual(expect.objectContaining({
      id: 'nav-projects', sectionId: 'projects', label: '项目', visible: true, order: 4
    }))
  })

  it('rejects duplicate, unsafe, cross-locale, or archived parents', () => {
    const config = createDefaultSiteConfiguration()
    config.sections.push({
      id: 'archived-parent',
      locale: 'zh-CN',
      name: 'Archived',
      directory: 'docs/zh/archived-parent',
      route: '/zh/archived-parent/',
      order: 4,
      navigation: { header: false, sidebar: false, collapsed: true },
      status: 'archived'
    })

    expect(() => planSectionCreation(config, {
      name: 'Duplicate', slug: 'skill', header: true, sidebar: true, collapsed: false
    })).toThrow(/重复/)
    expect(() => planSectionCreation(config, {
      name: 'Unsafe', slug: '../escape', header: true, sidebar: true, collapsed: false
    })).toThrow(/slug/i)
    expect(() => planSectionCreation(config, {
      name: 'Child', slug: 'child', parentId: 'archived-parent', header: true, sidebar: true, collapsed: false
    })).toThrow(/归档/)
  })

  it('counts articles recursively while excluding index files', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'section-count-'))
    temporaryDirectories.push(root)
    await mkdir(path.join(root, 'docs/zh/skill/nested'), { recursive: true })
    await Promise.all([
      writeFile(path.join(root, 'docs/zh/skill/index.md'), '# index'),
      writeFile(path.join(root, 'docs/zh/skill/one.md'), '# one'),
      writeFile(path.join(root, 'docs/zh/skill/nested/index.md'), '# nested index'),
      writeFile(path.join(root, 'docs/zh/skill/nested/two.md'), '# two')
    ])

    await expect(countSectionArticles(root, 'docs/zh/skill')).resolves.toBe(2)
  })

  it('archives without changing paths or deleting article references', () => {
    const config = createDefaultSiteConfiguration()
    const archived = planSectionArchive(config, 'skill')
    const section = archived.sections.find((item) => item.id === 'skill')

    expect(section).toMatchObject({
      status: 'archived',
      directory: 'docs/zh/skill',
      route: '/zh/skill/',
      navigation: { header: false }
    })
    expect(archived.navigation.filter((item) => item.type === 'section' && item.sectionId === 'skill'))
      .toEqual([expect.objectContaining({ visible: false })])
  })

  it('does not count through a symlinked section root', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'section-count-link-'))
    const outside = await mkdtemp(path.join(os.tmpdir(), 'section-count-outside-'))
    temporaryDirectories.push(root, outside)
    await mkdir(path.join(root, 'docs/zh'), { recursive: true })
    await writeFile(path.join(outside, 'secret.md'), '# secret')
    await symlink(outside, path.join(root, 'docs/zh/skill'))

    await expect(countSectionArticles(root, 'docs/zh/skill')).rejects.toThrow(/符号链接|越出/)
  })
})
