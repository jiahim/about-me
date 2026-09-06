import { describe, expect, it } from 'vitest'

import { createDefaultSiteConfiguration } from '@jiahim/site-schema'

import {
  projectEnvironmentRequirements,
  reorderByIds,
  updateSettingsAtPath
} from './form-model'

describe('设置表单投影', () => {
  it('嵌套更新保持原对象不变', () => {
    const original = createDefaultSiteConfiguration()
    const updated = updateSettingsAtPath(original, ['site', 'name'], '新名称')

    expect(updated.site.name).toBe('新名称')
    expect(original.site.name).toBe('Jia him')
    expect(updated.branding).toBe(original.branding)
  })

  it('显式 ID 重排会写入连续 order 且拒绝遗漏', () => {
    const sections = createDefaultSiteConfiguration().sections
    const reordered = reorderByIds(sections, ['work', 'essay', 'skill', 'book'])

    expect(reordered.map((section) => [section.id, section.order])).toEqual([
      ['work', 0],
      ['essay', 1],
      ['skill', 2],
      ['book', 3]
    ])
    expect(() => reorderByIds(sections, ['book'])).toThrow(/全部/)
  })

  it('环境变量投影只暴露名称与是否存在', () => {
    const config = createDefaultSiteConfiguration()
    config.integrations.analytics.requiredEnvironmentVariables = ['UMAMI_TOKEN']
    const projection = projectEnvironmentRequirements(config, {
      UMAMI_TOKEN: 'secret-value'
    })

    expect(projection).toEqual([{ name: 'UMAMI_TOKEN', exists: true }])
    expect(JSON.stringify(projection)).not.toContain('secret-value')
  })
})
