import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { describe, expect, it } from 'vitest'

import {
  buildArticlePath,
  categoryDefinitions,
  getCategoryForPath
} from './content-config'

describe('动态内容栏目配置', () => {
  it('使用共享配置的网站顺序而不是编辑器硬编码顺序', () => {
    expect(
      categoryDefinitions(createDefaultSiteConfiguration()).map(
        (category) => category.id
      )
    ).toEqual([
      'book',
      'skill',
      'essay',
      'work'
    ])
  })

  it('保留嵌套深度并按最长目录识别文章', () => {
    const config = createDefaultSiteConfiguration()
    config.sections.push({
      ...config.sections[0],
      id: 'book-vue',
      name: 'Vue',
      directory: 'docs/zh/book/vue',
      route: '/zh/book/vue/',
      parentId: 'book'
    })

    expect(categoryDefinitions(config, 'zh-CN')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'book', depth: 0 }),
        expect.objectContaining({ id: 'book-vue', depth: 1 })
      ])
    )
    expect(
      getCategoryForPath('docs/zh/book/vue/patch.md', config)?.id
    ).toBe('book-vue')
    expect(buildArticlePath('book-vue', '2026-09-01', 'patch', config)).toBe(
      'docs/zh/book/vue/2026-09-01-patch.md'
    )
  })

  it('归档栏目不进入编辑器栏目或新建文章目标', () => {
    const config = createDefaultSiteConfiguration()
    config.sections[0].status = 'archived'

    expect(categoryDefinitions(config, 'zh-CN').map((item) => item.id)).not.toContain(
      'book'
    )
    expect(() =>
      buildArticlePath('book', '2026-09-01', 'note', config)
    ).toThrow('不能新建')
  })
})
