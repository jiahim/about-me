import { describe, expect, it } from 'vitest'

import { createDefaultSiteConfiguration } from './defaults.js'
import {
  buildSectionForest,
  findSectionForArticlePath,
  listCreatableSections
} from './sections.js'

function nestedFixture() {
  const config = createDefaultSiteConfiguration()
  config.sections.push(
    {
      id: 'book-vue',
      locale: 'zh-CN',
      name: 'Vue',
      description: 'Vue 源码',
      directory: 'docs/zh/book/vue',
      route: '/zh/book/vue/',
      parentId: 'book',
      order: 0,
      navigation: { header: false, sidebar: true, collapsed: true },
      status: 'active'
    },
    {
      id: 'private-notes',
      locale: 'zh-CN',
      name: '隐藏笔记',
      directory: 'docs/zh/private',
      route: '/zh/private/',
      order: 8,
      navigation: { header: false, sidebar: false, collapsed: false },
      status: 'hidden'
    },
    {
      id: 'old-notes',
      locale: 'zh-CN',
      name: '旧笔记',
      directory: 'docs/zh/old',
      route: '/zh/old/',
      order: 9,
      navigation: { header: false, sidebar: false, collapsed: false },
      status: 'archived'
    }
  )
  return config
}

describe('共享栏目树', () => {
  it('按 order、中文名和稳定 ID 构建嵌套编辑器树且不修改输入', () => {
    const config = nestedFixture()
    const original = structuredClone(config)
    const tree = buildSectionForest(config, {
      locale: 'zh-CN',
      surface: 'editor'
    })

    expect(
      tree.map((node) => [
        node.section.id,
        node.children.map((child) => child.section.id)
      ])
    ).toEqual([
      ['book', ['book-vue']],
      ['skill', []],
      ['essay', []],
      ['work', []],
      ['private-notes', []]
    ])
    expect(config).toEqual(original)
  })

  it('公开表面隐藏 hidden、archived 及其后代', () => {
    const config = nestedFixture()
    config.sections.push({
      ...config.sections[0],
      id: 'private-child',
      name: '隐藏子栏目',
      directory: 'docs/zh/private/child',
      route: '/zh/private/child/',
      parentId: 'private-notes',
      status: 'active'
    })

    expect(
      buildSectionForest(config, { locale: 'zh-CN', surface: 'header' }).map(
        (node) => node.section.id
      )
    ).toEqual(['book', 'skill', 'essay', 'work'])
  })

  it('新建文章允许 active 和 hidden 栏目，但排除 archived', () => {
    expect(
      listCreatableSections(nestedFixture(), 'zh-CN').map((section) => section.id)
    ).toEqual(['book', 'book-vue', 'skill', 'essay', 'work', 'private-notes'])
  })

  it('按最长目录匹配文章栏目并拒绝 index 或非规范路径', () => {
    const config = nestedFixture()
    expect(
      findSectionForArticlePath(config, 'docs/zh/book/vue/patch.md')?.id
    ).toBe('book-vue')
    expect(findSectionForArticlePath(config, 'docs/zh/book/index.md')).toBeUndefined()
    expect(findSectionForArticlePath(config, '../docs/zh/book/note.md')).toBeUndefined()
    expect(findSectionForArticlePath(config, 'docs\\zh\\book\\note.md')).toBeUndefined()
  })
})
