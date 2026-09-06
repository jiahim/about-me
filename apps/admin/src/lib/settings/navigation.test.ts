import { createDefaultSiteConfiguration, parseSiteConfiguration } from '@jiahim/site-schema'
import { describe, expect, it } from 'vitest'

import {
  addLinkNavigation,
  addSectionNavigation,
  listAvailableHeaderSections,
  moveNavigation,
  removeNavigation,
  updateNavigation
} from './navigation'

function configWithAvailableBook() {
  const config = createDefaultSiteConfiguration()
  config.navigation = config.navigation
    .filter((item) => item.type !== 'section' || item.sectionId !== 'book')
    .map((item, order) => ({ ...item, order }))
  config.sections[0].navigation.header = false
  return config
}

describe('settings navigation operations', () => {
  it('lists only unused active top-level sections in the requested locale', () => {
    const config = configWithAvailableBook()
    config.sections.push({
      id: 'nested',
      locale: 'zh-CN',
      name: '子栏目',
      directory: 'docs/zh/book/nested',
      route: '/zh/book/nested/',
      parentId: 'book',
      order: 4,
      navigation: { header: false, sidebar: true, collapsed: false },
      status: 'active'
    })

    expect(listAvailableHeaderSections(config, 'zh-CN').map((item) => item.id)).toEqual(['book'])
  })

  it('adds a section navigation with a stable collision-safe id and synchronizes header state', () => {
    const config = configWithAvailableBook()
    config.navigation.push({
      id: 'nav-book',
      type: 'link',
      locale: 'en',
      label: 'Book',
      href: 'https://example.com/book',
      order: 0,
      newTab: false,
      visible: true
    })

    const next = addSectionNavigation(config, {
      locale: 'zh-CN',
      sectionId: 'book',
      label: '读书'
    })

    expect(next.navigation.at(-1)).toMatchObject({
      id: 'nav-book-2',
      order: 3,
      visible: true,
      newTab: false
    })
    expect(next.sections.find((item) => item.id === 'book')?.navigation.header).toBe(true)
    expect(() => parseSiteConfiguration(next)).not.toThrow()
  })

  it('adds and edits external links without mutating the source', () => {
    const config = createDefaultSiteConfiguration()
    const added = addLinkNavigation(config, {
      locale: 'zh-CN',
      label: 'GitHub',
      href: 'https://github.com/xiexin12138',
      newTab: true
    })
    const updated = updateNavigation(added, 'nav-github', {
      label: '源代码',
      href: 'https://github.com/xiexin12138/about-me',
      visible: false
    })

    expect(config.navigation).toHaveLength(4)
    expect(updated.navigation.at(-1)).toMatchObject({
      id: 'nav-github',
      label: '源代码',
      href: 'https://github.com/xiexin12138/about-me',
      newTab: true,
      visible: false
    })
  })

  it('moves and removes items with continuous per-locale order and section synchronization', () => {
    const config = createDefaultSiteConfiguration()
    const moved = moveNavigation(config, 'nav-work', -1)

    expect(moved.navigation.filter((item) => item.locale === 'zh-CN').map((item) => [item.id, item.order])).toEqual([
      ['nav-book', 0],
      ['nav-skill', 1],
      ['nav-work', 2],
      ['nav-essay', 3]
    ])

    const removed = removeNavigation(moved, 'nav-work')
    expect(removed.sections.find((item) => item.id === 'work')?.navigation.header).toBe(false)
    expect(removed.navigation.filter((item) => item.locale === 'zh-CN').map((item) => item.order)).toEqual([0, 1, 2])
    expect(() => parseSiteConfiguration(removed)).not.toThrow()
  })

  it('keeps a section header flag synchronized when visibility changes', () => {
    const config = createDefaultSiteConfiguration()
    const hidden = updateNavigation(config, 'nav-book', { visible: false })
    const visible = updateNavigation(hidden, 'nav-book', { visible: true })

    expect(hidden.sections.find((item) => item.id === 'book')?.navigation.header).toBe(false)
    expect(visible.sections.find((item) => item.id === 'book')?.navigation.header).toBe(true)
  })
})
